import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `You are distilling a personal journal entry into a concise summary. Extract: the core ideas, any decisions or intentions, recurring themes, and notable observations. Write in clean prose. Be direct and specific. No filler, no affirmations. Max 150 words.`;

export async function POST(request: NextRequest) {
  try {
    const { entryId, raw, force } = (await request.json()) as {
      entryId?: string;
      raw?: string;
      force?: boolean;
    };

    if (!entryId || !raw) {
      return NextResponse.json(
        { error: "entryId and raw are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    if (!force) {
      const { data: existing } = await supabase
        .from("entries")
        .select("summary")
        .eq("id", entryId)
        .single();

      if (existing?.summary && existing.summary.trim()) {
        return NextResponse.json({ summary: existing.summary, cached: true });
      }
    }

    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: raw }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 500 }
      );
    }

    const summary = textBlock.text.trim();

    await supabase.from("entries").update({ summary }).eq("id", entryId);

    return NextResponse.json({ summary, cached: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
