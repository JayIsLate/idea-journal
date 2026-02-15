import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { processTranscription } from "@/lib/claude";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { transcription, date } = body;

  if (!transcription) {
    return NextResponse.json(
      { error: "transcription is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabase();
    const entryDate = date || new Date().toISOString().split("T")[0];

    // Process transcription through Claude
    const processed = await processTranscription(transcription);

    // Always create a new entry
    const { data: latest } = await supabase
      .from("entries")
      .select("day_number")
      .order("day_number", { ascending: false })
      .limit(1);
    const dayNum =
      latest && latest.length > 0 ? latest[0].day_number + 1 : 1;

    const { data: entry, error: entryError } = await supabase
      .from("entries")
      .insert({
        day_number: dayNum,
        date: entryDate,
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
