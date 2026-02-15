import Anthropic from "@anthropic-ai/sdk";
import { ClaudeResponse } from "./types";

const SYSTEM_PROMPT = `You are an idea extraction assistant for a personal journal. You will receive a raw voice memo transcription from a morning journal session.

Your job is to:
1. Generate a short, punchy title for the entry (5-8 words)
2. Write a 2-3 sentence summary of the key themes
3. Detect the overall mood (one word: energized, reflective, anxious, excited, calm, frustrated, hopeful, scattered)
4. Extract relevant tags (lowercase, no spaces, use hyphens)
5. Extract every distinct idea mentioned, no matter how small

Always use the extract_ideas tool to return your response.`;

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extract_ideas",
  description: "Extract structured ideas from a voice memo transcription",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Short punchy title, 5-8 words" },
      summary: { type: "string", description: "2-3 sentence summary of key themes" },
      mood: {
        type: "string",
        enum: ["energized", "reflective", "anxious", "excited", "calm", "frustrated", "hopeful", "scattered"],
      },
      tags: { type: "array", items: { type: "string" }, description: "Relevant tags, lowercase with hyphens" },
      ideas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Clear actionable name, 3-7 words" },
            description: { type: "string", description: "1-2 sentences explaining the idea" },
            category: {
              type: "string",
              enum: ["product", "content", "business", "personal", "technical", "creative"],
            },
            confidence: { type: "number", description: "0.0-1.0 how fully formed the idea is" },
            action_items: { type: "array", items: { type: "string" }, description: "Concrete next steps" },
            tags: { type: "array", items: { type: "string" }, description: "Tags for this idea" },
            ai_suggestions: { type: "array", items: { type: "string" }, description: "Suggestions for developing this idea" },
          },
          required: ["title", "description", "category", "confidence", "action_items", "tags", "ai_suggestions"],
        },
      },
    },
    required: ["title", "summary", "mood", "tags", "ideas"],
  },
};

export async function processTranscription(
  transcription: string
): Promise<ClaudeResponse> {
  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "extract_ideas" },
    messages: [
      {
        role: "user",
        content: transcription,
      },
    ],
  });

  const toolBlock = message.content.find((block) => block.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("No tool response from Claude");
  }

  const parsed = toolBlock.input as ClaudeResponse;

  // Ensure mood matches DB constraint
  const validMoods = ["energized", "reflective", "anxious", "excited", "calm", "frustrated", "hopeful", "scattered"];
  if (!validMoods.includes(parsed.mood)) {
    parsed.mood = "reflective";
  }

  // Ensure categories match DB constraint
  const validCategories = ["product", "content", "business", "personal", "technical", "creative"];
  parsed.ideas = parsed.ideas.map((idea) => ({
    ...idea,
    category: validCategories.includes(idea.category) ? idea.category : "personal",
  }));

  return parsed;
}

const SOFTWARE_PLAN_PROMPT = `You are a technical project planner. Given an idea, generate a Claude Code-ready prompt that someone can paste directly into Claude Code to build it.

Include:
- Project name and one-line description
- Suggested tech stack
- File structure overview
- Step-by-step build instructions (numbered)
- Key implementation details and gotchas

Format as clean markdown. Be specific and actionable — this should be paste-and-go.`;

const NON_SOFTWARE_PLAN_PROMPT = `You are a creative project planner. Given an idea, generate a structured action plan to bring it to life.

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

export async function generateIdeaPlan(idea: {
  title: string;
  description: string;
  category: string;
  action_items?: string[];
  tags?: string[];
}): Promise<string> {
  const client = new Anthropic();
  const isSoftware = SOFTWARE_CATEGORIES.includes(idea.category);

  const userMessage = [
    `**Idea:** ${idea.title}`,
    `**Description:** ${idea.description}`,
    `**Category:** ${idea.category}`,
    idea.action_items?.length ? `**Action Items:** ${idea.action_items.join(", ")}` : "",
    idea.tags?.length ? `**Tags:** ${idea.tags.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: isSoftware ? SOFTWARE_PLAN_PROMPT : NON_SOFTWARE_PLAN_PROMPT,
    tools: [PLAN_TOOL],
    tool_choice: { type: "tool", name: "generate_plan" },
    messages: [{ role: "user", content: userMessage }],
  });

  const toolBlock = message.content.find((block) => block.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("No tool response from Claude");
  }

  return (toolBlock.input as { plan: string }).plan;
}
