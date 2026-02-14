import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase();

    const { data: entry, error } = await supabase
      .from("entries")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const { data: ideas } = await supabase
      .from("ideas")
      .select("*")
      .eq("entry_id", entry.id);

    return NextResponse.json({ ...entry, ideas: ideas || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
