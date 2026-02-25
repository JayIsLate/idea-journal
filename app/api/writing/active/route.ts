import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/** Returns idea IDs that have writing records with non-empty content, plus timestamps */
export async function GET() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("idea_writing")
    .select("idea_id, pages, updated_at");

  if (error) {
    return NextResponse.json({ ids: [], timestamps: {} });
  }

  const active = (data || []).filter((row) => {
    const pages = row.pages as Record<string, string>;
    return Object.values(pages).some((p) => p?.trim());
  });

  const ids = active.map((row) => row.idea_id);
  const timestamps: Record<string, string> = {};
  for (const row of active) {
    timestamps[row.idea_id] = row.updated_at;
  }

  return NextResponse.json({ ids, timestamps });
}
