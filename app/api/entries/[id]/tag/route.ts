import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { tag } = (await request.json()) as { tag?: string };
    if (!tag) {
      return NextResponse.json({ error: "tag is required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: entry, error: fetchErr } = await supabase
      .from("entries")
      .select("tags")
      .eq("id", params.id)
      .single();

    if (fetchErr || !entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const existing: string[] = entry.tags || [];
    if (existing.includes(tag)) {
      return NextResponse.json({ tags: existing, added: false });
    }

    const next = [...existing, tag];
    const { error: updateErr } = await supabase
      .from("entries")
      .update({ tags: next })
      .eq("id", params.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ tags: next, added: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
