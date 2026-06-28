import Anthropic from "@anthropic-ai/sdk";
import { ClaudeResponse } from "./types";

const SYSTEM_PROMPT_BASE = `You are an idea extraction assistant for a personal journal. You will receive raw text from a journal entry — either a transcribed voice memo or a written note.

Your job is to:
1. Generate a short title (3-6 words). Match the writer's voice: direct, casual, no marketing or hype words. Lowercase unless a proper noun. No clickbait, no "how to", no colons.
2. Write a 2-3 sentence summary of the key themes
3. Detect the overall mood (one word: energized, reflective, anxious, excited, calm, frustrated, hopeful, scattered)
4. Extract relevant tags (lowercase, no spaces, use hyphens)
5. Extract every distinct idea mentioned, no matter how small

Always use the extract_ideas tool to return your response.`;

const CLUSTERING_GUIDANCE = `

IDEA CLUSTERING:
For each extracted idea, also decide whether it CONTINUES an idea the writer is already working on, or whether it's a genuinely NEW idea. You'll be given a Library of existing ideas the writer has active. For each extracted idea, set:
- mergeIntoIdeaId: the id of an existing idea from the Library this should merge into, OR null if it's new.
- mergeConfidence: 0.0–1.0 — how sure you are. Use ≥0.8 only when the new content is clearly the same project/topic. Use 0.6–0.79 when it's likely but ambiguous (the server will ignore mid-confidence merges). Use 0.0 when it's clearly a new idea.

A merge means the new entry adds context, action items, or new angles to a project that's already on the writer's list. If the new content is on a related but distinct topic, create a new idea (set mergeIntoIdeaId to null). When in doubt, prefer creating a new idea over a wrong merge.`;

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extract_ideas",
  description: "Extract structured ideas from a voice memo transcription",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Short title, 3-6 words, lowercase, matches writer's tone" },
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
            mergeIntoIdeaId: {
              type: ["string", "null"],
              description: "If this idea continues an existing one from the Library, the existing idea's id. Otherwise null.",
            },
            mergeConfidence: {
              type: "number",
              description: "0.0-1.0 confidence in the merge decision. Use 0.0 when mergeIntoIdeaId is null.",
            },
          },
          required: ["title", "description", "category", "confidence", "action_items", "tags", "ai_suggestions"],
        },
      },
    },
    required: ["title", "summary", "mood", "tags", "ideas"],
  },
};

export interface ExistingIdeaForMatch {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
}

function buildLibrarySection(existing: ExistingIdeaForMatch[]): string {
  if (existing.length === 0) return "";
  const lines = existing.map(
    (e) =>
      `- id: ${e.id}\n  title: ${e.title}\n  category: ${e.category}\n  description: ${e.description}\n  tags: ${e.tags.join(", ") || "(none)"}`
  );
  return `\n\nLIBRARY OF EXISTING IDEAS (active projects on the writer's list):\n\n${lines.join("\n\n")}`;
}

export async function processTranscription(
  transcription: string,
  existingIdeas: ExistingIdeaForMatch[] = [],
  apiKey?: string
): Promise<ClaudeResponse> {
  const client = new Anthropic({ apiKey });

  const systemPrompt =
    existingIdeas.length > 0
      ? SYSTEM_PROMPT_BASE + CLUSTERING_GUIDANCE + buildLibrarySection(existingIdeas)
      : SYSTEM_PROMPT_BASE;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: systemPrompt,
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

  // Defensively coerce string[] fields. The tool schema asks for arrays but
  // smaller models occasionally return a comma-separated string instead,
  // which then fails Postgres' text[] coercion with a 'malformed array
  // literal' error at insert time. Normalize once at the boundary so the
  // rest of the code (and Supabase) never sees a string here.
  parsed.tags = normalizeStringArray(parsed.tags);

  // Ensure categories match DB constraint + normalize all string-array fields
  const validCategories = ["product", "content", "business", "personal", "technical", "creative"];
  parsed.ideas = parsed.ideas.map((idea) => ({
    ...idea,
    category: validCategories.includes(idea.category) ? idea.category : "personal",
    tags: normalizeStringArray(idea.tags),
    action_items: normalizeStringArray(idea.action_items),
    ai_suggestions: normalizeStringArray(idea.ai_suggestions),
  }));

  return parsed;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  }
  if (typeof value === "string") {
    // Split on commas/semicolons. Strip surrounding quotes/whitespace.
    return value
      .split(/[,;]/)
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return [];
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

const SOFTWARE_CATEGORIES = ["product", "technical"];

export async function generateIdeaPlan(
  idea: {
    title: string;
    description: string;
    category: string;
    action_items?: string[];
    tags?: string[];
  },
  apiKey?: string
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const isSoftware = SOFTWARE_CATEGORIES.includes(idea.category);

  const userMessage = [
    `**Idea:** ${idea.title}`,
    `**Description:** ${idea.description}`,
    `**Category:** ${idea.category}`,
    idea.action_items?.length ? `**Action Items:** ${idea.action_items.join(", ")}` : "",
    idea.tags?.length ? `**Tags:** ${idea.tags.join(", ")}` : "",
    "",
    "Respond with ONLY the plan in markdown. No preamble.",
  ]
    .filter(Boolean)
    .join("\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: isSoftware ? SOFTWARE_PLAN_PROMPT : NON_SOFTWARE_PLAN_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return textBlock.text;
}
