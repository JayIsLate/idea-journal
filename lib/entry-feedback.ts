import Anthropic from "@anthropic-ai/sdk";
import type { Highlight, HighlightType } from "./writing-types";
import { stripMarkdown } from "./writing-ai";

const MODEL = "claude-sonnet-4-5-20250929";

export type EntryView = "unabridged" | "abridged";

const SYSTEM = `You are reading a personal journal entry and offering inline annotations that help the writer think more clearly.

You will receive the entry text. Return 3-6 inline highlights that surface things worth examining: questions to sit with, claims worth fact-checking, evidence that would strengthen a thought, places where the writer's energy seems off, places that could be sharper.

Tone: curious and direct, not coachy. Do not praise. Do not summarize what the writer already said. Each highlight must reference an EXACT verbatim substring of the entry's flat text.

Highlight types:
- question: a question worth sitting with
- suggestion: a path the writer could pursue
- edit: a specific text replacement (always include suggestedEdit)
- weakness: a soft argument or unsupported leap
- evidence: where a concrete example would help
- wordiness: verbose phrase with a tighter alternative (always include suggestedEdit)
- factcheck: a claim that may need verification
- voice: tone that drifts from the rest of the entry

Skip "voice" unless tone shifts noticeably.`;

const TOOL: Anthropic.Tool = {
  name: "annotate_entry",
  description: "Return inline annotations for a journal entry",
  input_schema: {
    type: "object" as const,
    properties: {
      highlights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [
                "question",
                "suggestion",
                "edit",
                "voice",
                "weakness",
                "evidence",
                "wordiness",
                "factcheck",
              ],
            },
            matchText: {
              type: "string",
              description: "Exact substring from the entry text",
            },
            comment: { type: "string" },
            suggestedEdit: { type: "string" },
          },
          required: ["type", "matchText", "comment"],
        },
      },
    },
    required: ["highlights"],
  },
};

export async function getEntryFeedback(
  content: string,
  view: EntryView,
): Promise<Highlight[]> {
  const client = new Anthropic();
  const flatText = stripMarkdown(content);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "annotate_entry" },
    messages: [
      {
        role: "user",
        content: `Entry view: ${view}\n\n--- BEGIN ENTRY ---\n${flatText}\n--- END ENTRY ---`,
      },
    ],
  });

  const toolBlock = message.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") return [];

  const parsed = toolBlock.input as {
    highlights: {
      type: HighlightType;
      matchText: string;
      comment: string;
      suggestedEdit?: string;
    }[];
  };

  return parsed.highlights
    .filter((h) => flatText.includes(h.matchText))
    .map((h, i) => ({
      id: `entry-hl-${Date.now()}-${i}`,
      type: h.type,
      matchText: h.matchText,
      comment: h.comment,
      suggestedEdit: h.suggestedEdit,
      pageKey: view as unknown as Highlight["pageKey"],
    }));
}
