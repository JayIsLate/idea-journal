import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);

  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const tag = searchParams.get("tag");
  const search = searchParams.get("search");

  // Fetch entries with their ideas
  let query = supabase
    .from("entries")
    .select("*, ideas(*)")
    .order("day_number", { ascending: false });

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,summary.ilike.%${search}%,raw_transcription.ilike.%${search}%`
    );
  }

  const { data: entries, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter by idea category or status if provided
  let filtered = entries || [];
  if (category) {
    filtered = filtered.filter((entry) =>
      entry.ideas?.some(
        (idea: { category: string }) => idea.category === category
      )
    );
  }
  if (status) {
    filtered = filtered.filter((entry) =>
      entry.ideas?.some(
        (idea: { status: string }) => idea.status === status
      )
    );
  }

  return NextResponse.json(filtered);
}
