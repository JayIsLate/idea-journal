import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/supabase/server";
import { getUserApiKey } from "@/lib/byok";

const SYSTEM_PROMPT = `You are extracting discrete ideas from a personal journal entry. Use the suggest_ideas tool. Extract 2–5 ideas maximum. Only include genuinely distinct ideas, not observations or reflections. Each title is 5 words max. Each description is one sentence.`;

const CATEGORIES = ["product", "content", "business", "personal", "technical", "creative"] as const;

const TOOL: Anthropic.Tool = {
  name: "suggest_ideas",
  description: "Return distinct ideas extracted from a journal entry",
  input_schema: {
    type: "object",
    properties: {
      ideas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "5 words max" },
            category: { type: "string", enum: CATEGORIES as unknown as string[] },
            description: { type: "string", description: "one sentence" },
          },
          required: ["title", "category", "description"],
        },
      },
    },
    required: ["ideas"],
  },
};

interface Suggestion {
  title: string;
  category: string;
  description: string;
}

export async function POST(request: NextRequest) {
  try {
    const { entryId, raw } = (await request.json()) as {
      entryId?: string;
      raw?: string;
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

    const { data: existing } = await supabase
      .from("ideas")
      .select("*")
      .eq("entry_id", entryId);

    if (existing && existing.length > 0) {
      return NextResponse.json({ saved: existing, suggestions: [] });
    }

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "suggest_ideas" },
      messages: [{ role: "user", content: raw }],
    });

    const toolBlock = message.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      return NextResponse.json({ saved: [], suggestions: [] });
    }

    const parsed = toolBlock.input as { ideas: Suggestion[] };
    const cleaned: Suggestion[] = (parsed.ideas || []).map((idea) => ({
      title: idea.title,
      category: (CATEGORIES as readonly string[]).includes(idea.category)
        ? idea.category
        : "personal",
      description: idea.description,
    }));

    return NextResponse.json({ saved: [], suggestions: cleaned });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
