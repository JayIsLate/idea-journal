import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category");
    const statusFilter = searchParams.get("status");
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");

    // Fetch entries
    let entryQuery = supabase
      .from("entries")
      .select("*")
      .order("day_number", { ascending: false });

    if (tag) {
      entryQuery = entryQuery.contains("tags", [tag]);
    }

    if (search) {
      entryQuery = entryQuery.or(
        `title.ilike.%${search}%,summary.ilike.%${search}%,raw_transcription.ilike.%${search}%`
      );
    }

    const { data: entries, error: entryError } = await entryQuery;

    if (entryError) {
      return NextResponse.json({ error: entryError.message }, { status: 500 });
    }

    // Fetch all ideas
    const { data: ideas } = await supabase.from("ideas").select("*");

    // Attach ideas to entries
    const entriesWithIdeas = (entries || []).map((entry) => ({
      ...entry,
      ideas: (ideas || []).filter((idea) => idea.entry_id === entry.id),
    }));

    // Filter by idea category or status if provided
    let filtered = entriesWithIdeas;
    if (category) {
      filtered = filtered.filter((entry) =>
        entry.ideas.some((idea) => idea.category === category)
      );
    }
    if (statusFilter) {
      filtered = filtered.filter((entry) =>
        entry.ideas.some((idea) => idea.status === statusFilter)
      );
    }

    return NextResponse.json(filtered);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
