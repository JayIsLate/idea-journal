import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are synthesizing a collection of personal journal summaries into a single reflective analysis. Identify: recurring themes, evolving ideas, open threads, and notable patterns across entries. Write in flowing prose only — no bullet points, no headers, no lists. Three to four paragraphs. Be specific and direct. Do not summarize each entry individually.`;

export async function POST(request: NextRequest) {
  try {
    const { summaries } = (await request.json()) as { summaries?: string[] };

    if (!Array.isArray(summaries) || summaries.length === 0) {
      return NextResponse.json(
        { error: "summaries (non-empty array) is required" },
        { status: 400 }
      );
    }

    const userMessage = summaries
      .map((s, i) => `--- Entry ${i + 1} ---\n${s}`)
      .join("\n\n");

    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 500 }
      );
    }

    return NextResponse.json({ synthesis: textBlock.text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
