import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const SOFTWARE_SYSTEM = `You are a technical project planner. Given an idea, generate a Claude Code-ready prompt that someone can paste directly into Claude Code to build it.

Include:
- Project name and one-line description
- Suggested tech stack
- File structure overview
- Step-by-step build instructions (numbered)
- Key implementation details and gotchas

Format as clean markdown. Be specific and actionable — this should be paste-and-go.`;

const NON_SOFTWARE_SYSTEM = `You are a creative project planner. Given an idea, generate a structured action plan to bring it to life.

Include:
- Project overview and goal
- Phases broken into concrete tasks
- Timeline suggestions (rough estimates)
- Resources or tools needed
- First three things to do today

Format as clean markdown. Be specific, practical, and motivating.`;

const PLAN_TOOL: Anthropic.Tool = {
  name: "generate_plan",
  description: "Generate an actionable plan for an idea",
  input_schema: {
    type: "object" as const,
    properties: {
      plan: {
        type: "string",
        description: "The full plan in markdown format",
      },
    },
    required: ["plan"],
  },
};

const SOFTWARE_CATEGORIES = ["product", "technical"];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, description, category, action_items, tags } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    const isSoftware = SOFTWARE_CATEGORIES.includes(category);

    const userMessage = [
      `**Idea:** ${title}`,
      `**Description:** ${description}`,
      `**Category:** ${category}`,
      action_items?.length ? `**Action Items:** ${action_items.join(", ")}` : "",
      tags?.length ? `**Tags:** ${tags.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const client = new Anthropic();

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: isSoftware ? SOFTWARE_SYSTEM : NON_SOFTWARE_SYSTEM,
      tools: [PLAN_TOOL],
      tool_choice: { type: "tool", name: "generate_plan" },
      messages: [{ role: "user", content: userMessage }],
    });

    const toolBlock = message.content.find((block) => block.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("No tool response from Claude");
    }

    const { plan } = toolBlock.input as { plan: string };
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Plan generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}
