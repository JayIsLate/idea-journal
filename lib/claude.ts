import Anthropic from "@anthropic-ai/sdk";
import { ClaudeResponse } from "./types";

const SYSTEM_PROMPT = `You are an idea extraction assistant for a personal journal. You will receive a raw voice memo transcription from a morning journal session.

Your job is to:
1. Generate a short, punchy title for the entry (5-8 words)
2. Write a 2-3 sentence summary of the key themes
3. Detect the overall mood (one word: energized, reflective, anxious, excited, calm, frustrated, hopeful, scattered)
4. Extract relevant tags (lowercase, no spaces, use hyphens)
5. Extract every distinct idea mentioned, no matter how small

For each idea, provide:
- title: A clear, actionable name (3-7 words)
- description: 1-2 sentences explaining the idea
- category: one of "product", "content", "business", "personal", "technical", "creative"
- confidence: 0.0-1.0 how fully formed the idea is
- action_items: concrete next steps (array of strings)
- tags: relevant tags for this specific idea
- ai_suggestions: your suggestions for developing this idea further

Respond ONLY with valid JSON matching this exact structure:
{
  "title": "string",
  "summary": "string",
  "mood": "string",
  "tags": ["string"],
  "ideas": [
    {
      "title": "string",
      "description": "string",
      "category": "string",
      "confidence": 0.0,
      "action_items": ["string"],
      "tags": ["string"],
      "ai_suggestions": ["string"]
    }
  ]
}`;

export async function processTranscription(
  transcription: string
): Promise<ClaudeResponse> {
  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: transcription,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let text = textBlock.text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed: ClaudeResponse = JSON.parse(text);
  return parsed;
}
