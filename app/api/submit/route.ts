import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { processTranscription } from "@/lib/claude";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { transcription } = body;

  if (!transcription) {
    return NextResponse.json(
      { error: "transcription is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabase();
    const today = new Date().toISOString().split("T")[0];

    // Check if there's already an entry for today
    const { data: existingEntry } = await supabase
      .from("entries")
      .select("*")
      .eq("date", today)
      .single();

    // Process transcription through Claude
    const processed = await processTranscription(transcription);

    let entry;

    if (existingEntry) {
      // Append to existing entry
      const combinedTranscription =
        existingEntry.raw_transcription + "\n\n---\n\n" + transcription;
      const combinedSummary =
        existingEntry.summary + " " + processed.summary;
      const combinedTags = [
        ...new Set([...existingEntry.tags, ...processed.tags]),
      ];

      const { data: updated, error: updateError } = await supabase
        .from("entries")
        .update({
          raw_transcription: combinedTranscription,
          title: processed.title,
          summary: combinedSummary,
          mood: processed.mood,
          tags: combinedTags,
        })
        .eq("id", existingEntry.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
      entry = updated;
    } else {
      // Create new entry
      const { data: latest } = await supabase
        .from("entries")
        .select("day_number")
        .order("day_number", { ascending: false })
        .limit(1);
      const dayNum =
        latest && latest.length > 0 ? latest[0].day_number + 1 : 1;

      const { data: created, error: entryError } = await supabase
        .from("entries")
        .insert({
          day_number: dayNum,
          date: today,
          raw_transcription: transcription,
          title: processed.title,
          summary: processed.summary,
          mood: processed.mood,
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
      entry = created;
    }

    // Insert new ideas (always appended)
    const ideasToInsert = processed.ideas.map((idea) => ({
      entry_id: entry.id,
      title: idea.title,
      description: idea.description,
      category: idea.category,
      status: "raw" as const,
      confidence: idea.confidence,
      action_items: idea.action_items,
      tags: idea.tags,
      ai_suggestions: idea.ai_suggestions,
    }));

    const { data: ideas, error: ideasError } = await supabase
      .from("ideas")
      .insert(ideasToInsert)
      .select();

    if (ideasError) {
      return NextResponse.json({ error: ideasError.message }, { status: 500 });
    }

    return NextResponse.json({ ...entry, ideas }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
