import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// POST /api/entries/merge — merge sourceId into targetId
export async function POST(request: NextRequest) {
  const { targetId, sourceId } = await request.json();

  if (!targetId || !sourceId) {
    return NextResponse.json(
      { error: "targetId and sourceId are required" },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabase();

    // Fetch both entries
    const [{ data: target }, { data: source }] = await Promise.all([
      supabase.from("entries").select("*").eq("id", targetId).single(),
      supabase.from("entries").select("*").eq("id", sourceId).single(),
    ]);

    if (!target || !source) {
      return NextResponse.json(
        { error: "One or both entries not found" },
        { status: 404 }
      );
    }

    // Merge transcriptions, summaries, and tags
    const combinedTranscription =
      target.raw_transcription + "\n\n---\n\n" + source.raw_transcription;
    const combinedSummary = target.summary + " " + source.summary;
    const combinedTags = [
      ...new Set([...target.tags, ...source.tags]),
    ];

    // Update target entry with merged content
    const { error: updateError } = await supabase
      .from("entries")
      .update({
        raw_transcription: combinedTranscription,
        summary: combinedSummary,
        tags: combinedTags,
      })
      .eq("id", targetId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Move all ideas from source to target
    const { error: moveError } = await supabase
      .from("ideas")
      .update({ entry_id: targetId })
      .eq("entry_id", sourceId);

    if (moveError) {
      return NextResponse.json({ error: moveError.message }, { status: 500 });
    }

    // Delete source entry
    const { error: deleteError } = await supabase
      .from("entries")
      .delete()
      .eq("id", sourceId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, mergedInto: targetId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
