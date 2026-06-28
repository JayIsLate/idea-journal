import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/supabase/server";
import { getUserApiKey } from "@/lib/byok";

export const maxDuration = 60;

const SYSTEM_PROMPT_FULL = `You are synthesizing a collection of personal journal summaries into a single reflective analysis. Identify: recurring themes, evolving ideas, open threads, and notable patterns across entries. Write in flowing prose only — no bullet points, no headers, no lists. Three to four paragraphs. Be specific and direct. Do not summarize each entry individually.`;

const SYSTEM_PROMPT_INCREMENTAL = `You are updating an existing synthesis of a writer's journal entries to integrate new entries. Read the prior synthesis carefully, then weave in what the new entries reveal: thread continuations, fresh patterns, shifts in tone or focus, contradictions or resolutions. Keep what still holds, revise what the new entries undercut, and add what they newly surface. Match the prior style: flowing prose, no bullets, no headers, three to four paragraphs. Be specific and direct.`;

interface SynthesisRow {
  id: string;
  synthesis: string;
  entry_ids: string[];
  created_at: string;
}

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("syntheses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ synthesis: (data as SynthesisRow | null) ?? null });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      mode?: "full" | "incremental";
      entries?: { id: string; summary: string }[];
      newEntries?: { id: string; summary: string }[];
      priorSynthesis?: string;
      priorEntryIds?: string[];
    };

    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const apiKey = await getUserApiKey(supabase, user.id);
    const client = new Anthropic({ apiKey });
    const mode = body.mode || "full";

    if (mode === "incremental") {
      const { newEntries, priorSynthesis, priorEntryIds } = body;
      if (!priorSynthesis || !newEntries?.length || !priorEntryIds) {
        return NextResponse.json(
          { error: "incremental mode requires priorSynthesis, priorEntryIds, and non-empty newEntries" },
          { status: 400 }
        );
      }

      const userMessage = [
        `PRIOR SYNTHESIS:`,
        priorSynthesis,
        ``,
        `NEW ENTRIES TO INTEGRATE (${newEntries.length}):`,
        ...newEntries.map((e, i) => `--- New Entry ${i + 1} ---\n${e.summary}`),
      ].join("\n\n");

      const message = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1200,
        system: SYSTEM_PROMPT_INCREMENTAL,
        messages: [{ role: "user", content: userMessage }],
      });

      const textBlock = message.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        return NextResponse.json({ error: "No text response from Claude" }, { status: 500 });
      }

      const synthesis = textBlock.text.trim();
      const allEntryIds = [...priorEntryIds, ...newEntries.map((e) => e.id)];

      const { data: inserted } = await supabase
        .from("syntheses")
        .insert({ synthesis, entry_ids: allEntryIds, user_id: user.id })
        .select()
        .single();

      return NextResponse.json({ synthesis, row: inserted, mode: "incremental" });
    }

    // Full regenerate
    const { entries } = body;
    if (!entries?.length) {
      return NextResponse.json(
        { error: "full mode requires non-empty entries" },
        { status: 400 }
      );
    }

    const userMessage = entries
      .map((e, i) => `--- Entry ${i + 1} ---\n${e.summary}`)
      .join("\n\n");

    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1200,
      system: SYSTEM_PROMPT_FULL,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No text response from Claude" }, { status: 500 });
    }

    const synthesis = textBlock.text.trim();
    const entryIds = entries.map((e) => e.id);

    const { data: inserted } = await supabase
      .from("syntheses")
      .insert({ synthesis, entry_ids: entryIds, user_id: user.id })
      .select()
      .single();

    return NextResponse.json({ synthesis, row: inserted, mode: "full" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
