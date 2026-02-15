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
