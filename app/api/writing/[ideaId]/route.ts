import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { DEFAULT_PAGES } from "@/lib/writing-types";

export async function GET(
  request: NextRequest,
  { params }: { params: { ideaId: string } }
) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("idea_writing")
    .select("*")
    .eq("idea_id", params.ideaId)
    .single();

  if (error && error.code === "PGRST116") {
    // No row exists — create default
    const { data: created, error: createError } = await supabase
      .from("idea_writing")
      .insert({
        idea_id: params.ideaId,
        pages: DEFAULT_PAGES,
        active_page: "summary",
        highlights: [],
        word_count: 0,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(created);
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { ideaId: string } }
) {
  const supabase = getSupabase();
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.pages !== undefined) updates.pages = body.pages;
  if (body.active_page !== undefined) updates.active_page = body.active_page;
  if (body.word_count !== undefined) updates.word_count = body.word_count;
  if (body.highlights !== undefined) updates.highlights = body.highlights;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("idea_writing")
    .update(updates)
    .eq("idea_id", params.ideaId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
