import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();

  const { data: entry, error } = await supabase
    .from("entries")
    .select("*, ideas(*)")
    .eq("id", params.id)
    .single();

  if (error || !entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json(entry);
}
