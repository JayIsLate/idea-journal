import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

const CATEGORIES = ["product", "content", "business", "personal", "technical", "creative"];

export async function POST(request: NextRequest) {
  try {
    const { entryId, title, category, description } = (await request.json()) as {
      entryId?: string;
      title?: string;
      category?: string;
      description?: string;
    };

    if (!entryId || !title || !category) {
      return NextResponse.json(
        { error: "entryId, title, and category are required" },
        { status: 400 }
      );
    }

    const safeCategory = CATEGORIES.includes(category) ? category : "personal";

    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data, error } = await supabase
      .from("ideas")
      .insert({
        entry_id: entryId,
        user_id: user.id,
        title,
        description: description || "",
        category: safeCategory,
        status: "raw",
        confidence: 0.5,
        action_items: [],
        tags: [],
        ai_suggestions: [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
