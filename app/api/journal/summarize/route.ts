import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/supabase/server";
import { getUserApiKey } from "@/lib/byok";

const SYSTEM_PROMPT = `You are condensing a personal journal entry into an abridged version that the writer can re-read at a glance. Do not flatten the entry into a one-paragraph gloss — preserve the actual substance: specific ideas, names, projects, tensions, decisions, questions the writer is wrestling with, and concrete details.

Structure your output as short labeled sections separated by blank lines. Use these headings (in this order, skip any that don't apply):

**Threads** — the distinct topics or ideas the writer worked through. One short paragraph or 2–4 bullets per thread, using the writer's own concepts and language (not abstractions).

**Tensions / Open questions** — anything the writer circled back to, doubted, or hasn't resolved. Quote or paraphrase the actual question.

**Decisions / Intentions** — concrete commitments, plans, or next steps the writer named.

**Observations** — sharp lines, framings, or self-reflections worth keeping.

Style: direct, specific, in the writer's voice (lowercase mono-style is fine if the entry is). Aim for roughly 200–400 words depending on entry length — long enough to be a real abridgement, short enough to scan. No filler, no preamble like "this entry is about", no affirmations.`;

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

    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const apiKey = await getUserApiKey(supabase, user.id);

    if (!force) {
      const { data: existing } = await supabase
        .from("entries")
        .select("abridged")
        .eq("id", entryId)
        .single();

      if (existing?.abridged && existing.abridged.trim()) {
        return NextResponse.json({ summary: existing.abridged, cached: true });
      }
    }

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1500,
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

    // Store the rich version in `abridged`, leaving the short `summary`
    // (used on cards + synthesis) untouched. Clear the stale flag — this
    // summary now reflects the latest content.
    await supabase
      .from("entries")
      .update({ abridged: summary, abridged_stale: false })
      .eq("id", entryId);

    return NextResponse.json({ summary, cached: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
