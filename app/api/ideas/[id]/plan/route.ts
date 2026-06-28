import { NextRequest, NextResponse } from "next/server";
import { generateIdeaPlan } from "@/lib/claude";
import { requireUser } from "@/lib/supabase/server";
import { getUserApiKey } from "@/lib/byok";

export const maxDuration = 30;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const apiKey = await getUserApiKey(supabase, user.id);

    const body = await request.json();
    const { title, description, category, action_items, tags } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    const plan = await generateIdeaPlan(
      {
        title,
        description,
        category,
        action_items,
        tags,
      },
      apiKey
    );

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Plan generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}
