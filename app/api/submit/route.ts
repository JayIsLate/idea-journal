import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { getUserApiKey } from "@/lib/byok";
import { processTranscription } from "@/lib/claude";
import {
  MERGE_CONFIDENCE_THRESHOLD,
  insertNewIdea,
  loadActiveIdeasForMatching,
  mergeIntoExistingIdea,
} from "@/lib/ideas-merge";
import type { Idea } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { transcription, date, title: titleOverride, mood: moodOverride } = body;

  if (!transcription) {
    return NextResponse.json(
      { error: "transcription is required" },
      { status: 400 }
    );
  }

  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const apiKey = await getUserApiKey(supabase, user.id);
    const entryDate = date || new Date().toISOString().split("T")[0];

    // Load currently active ideas so Claude can decide whether each new
    // extracted idea continues an existing project or is genuinely new.
    const existingForMatch = await loadActiveIdeasForMatching(supabase, user.id);

    // Process transcription through Claude (extraction + clustering decisions)
    const processed = await processTranscription(transcription, existingForMatch, apiKey);

    const ALLOWED_MOODS = [
      "energized",
      "reflective",
      "anxious",
      "excited",
      "calm",
      "frustrated",
      "hopeful",
      "scattered",
    ];
    const finalMood =
      moodOverride && ALLOWED_MOODS.includes(moodOverride)
        ? moodOverride
        : processed.mood;

    // day_number is unique per user. Two concurrent submits can read the same
    // max and collide on the (user_id, day_number) index, so recompute + retry
    // on the unique-violation code (23505).
    let entry: { id: string; [k: string]: unknown } | null = null;
    let entryError: { code?: string; message: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: latest } = await supabase
        .from("entries")
        .select("day_number")
        .eq("user_id", user.id)
        .order("day_number", { ascending: false })
        .limit(1);
      const dayNum =
        latest && latest.length > 0 ? latest[0].day_number + 1 : 1;

      const result = await supabase
        .from("entries")
        .insert({
          user_id: user.id,
          day_number: dayNum,
          date: entryDate,
          raw_transcription: transcription,
          title: titleOverride?.trim() ? titleOverride.trim() : processed.title,
          summary: processed.summary,
          mood: finalMood,
          tags: processed.tags,
        })
        .select()
        .single();

      if (!result.error) {
        entry = result.data;
        entryError = null;
        break;
      }
      entryError = result.error;
      if (result.error.code !== "23505") break; // not a day_number race — give up
    }

    if (entryError || !entry) {
      return NextResponse.json(
        { error: entryError?.message ?? "Failed to create entry" },
        { status: 500 }
      );
    }

    // Smart clustering: for each extracted idea, either merge into the
    // matching existing idea (if Claude's confidence clears the threshold
    // AND the id still exists) or insert a new idea. We process serially
    // because a later idea in the batch could be told to merge into a
    // previously-inserted idea from earlier in the same call — rare, but
    // accumulating the live id set keeps that case correct.
    const existingIdSet = new Set(existingForMatch.map((e) => e.id));
    const resultIdeas: Idea[] = [];
    const merges: { extractedTitle: string; intoId: string }[] = [];

    for (const idea of processed.ideas) {
      const wantsMerge =
        idea.mergeIntoIdeaId &&
        existingIdSet.has(idea.mergeIntoIdeaId) &&
        (idea.mergeConfidence ?? 0) >= MERGE_CONFIDENCE_THRESHOLD;

      if (wantsMerge && idea.mergeIntoIdeaId) {
        const merged = await mergeIntoExistingIdea({
          supabase,
          existingId: idea.mergeIntoIdeaId,
          extracted: idea,
          entryId: entry.id,
          entryDate,
        });
        if (merged) {
          resultIdeas.push(merged);
          merges.push({ extractedTitle: idea.title, intoId: idea.mergeIntoIdeaId });
          continue;
        }
        // If merge failed (e.g. race condition deleting the row), fall through
        // to inserting as a new idea so we don't drop the user's content.
      }

      try {
        const inserted = await insertNewIdea({
          supabase,
          extracted: idea,
          entryId: entry.id,
          entryDate,
          userId: user.id,
        });
        if (inserted) {
          resultIdeas.push(inserted);
          existingIdSet.add(inserted.id);
        }
      } catch (insertErr) {
        const msg = insertErr instanceof Error ? insertErr.message : "Insert failed";
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    return NextResponse.json(
      { ...entry, ideas: resultIdeas, merges },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
