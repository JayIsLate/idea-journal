import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/** Returns idea IDs that have writing records with non-empty content */
export async function GET() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("idea_writing")
    .select("idea_id, pages");

  if (error) {
    return NextResponse.json({ ids: [] });
  }

  const ids = (data || [])
    .filter((row) => {
      const pages = row.pages as Record<string, string>;
      return Object.values(pages).some((p) => p?.trim());
    })
    .map((row) => row.idea_id);

  return NextResponse.json({ ids });
}
