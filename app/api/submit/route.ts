import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
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
    const supabase = getSupabase();
    const entryDate = date || new Date().toISOString().split("T")[0];

    // Load currently active ideas so Claude can decide whether each new
    // extracted idea continues an existing project or is genuinely new.
    const existingForMatch = await loadActiveIdeasForMatching(supabase);

    // Process transcription through Claude (extraction + clustering decisions)
    const processed = await processTranscription(transcription, existingForMatch);

    // Always create a new entry
    const { data: latest } = await supabase
      .from("entries")
      .select("day_number")
      .order("day_number", { ascending: false })
      .limit(1);
    const dayNum =
      latest && latest.length > 0 ? latest[0].day_number + 1 : 1;

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

    const { data: entry, error: entryError } = await supabase
      .from("entries")
      .insert({
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

    if (entryError) {
      return NextResponse.json(
        { error: entryError.message },
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
