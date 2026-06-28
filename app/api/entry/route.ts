import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase, getOwnerUserId } from "@/lib/supabase/admin";
import { processTranscription } from "@/lib/claude";

// External ingest endpoint (used by scripts/seed.ts). Headless, so it can't use
// a browser session — it authenticates with the x-api-key header and writes
// rows owned by the OWNER (resolved from OWNER_EMAIL) via the service-role
// client. Owner-only by design.
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { transcription, day_number, date } = body;

  if (!transcription) {
    return NextResponse.json(
      { error: "transcription is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = getAdminSupabase();
    const ownerId = await getOwnerUserId();
    if (!ownerId) {
      return NextResponse.json(
        { error: "Owner has not signed in yet — sign in with Google first" },
        { status: 500 }
      );
    }

    // Get next day_number for the owner if not provided
    let dayNum = day_number;
    if (!dayNum) {
      const { data: latest } = await supabase
        .from("entries")
        .select("day_number")
        .eq("user_id", ownerId)
        .order("day_number", { ascending: false })
        .limit(1);
      dayNum = latest && latest.length > 0 ? latest[0].day_number + 1 : 1;
    }

    // Process transcription through Claude (shared key)
    const processed = await processTranscription(transcription);

    // Insert entry
    const { data: entry, error: entryError } = await supabase
      .from("entries")
      .insert({
        user_id: ownerId,
        day_number: dayNum,
        date: date || new Date().toISOString().split("T")[0],
        raw_transcription: transcription,
        title: processed.title,
        summary: processed.summary,
        mood: processed.mood,
        tags: processed.tags,
      })
      .select()
      .single();

    if (entryError) {
      return NextResponse.json({ error: entryError.message }, { status: 500 });
    }

    // Insert ideas
    const ideasToInsert = processed.ideas.map((idea) => ({
      entry_id: entry.id,
      user_id: ownerId,
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
