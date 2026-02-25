import Anthropic from "@anthropic-ai/sdk";
import type { Highlight, HighlightType, PageKey } from "./writing-types";

const MODEL = "claude-sonnet-4-5-20250929";

/**
 * Strip markdown formatting to get flat text matching what TipTap renders.
 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/__(.+?)__/g, "$1") // bold alt
    .replace(/_(.+?)_/g, "$1") // italic alt
    .replace(/~~(.+?)~~/g, "$1") // strikethrough
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/^>\s+/gm, "") // blockquotes
    .replace(/^[-*+]\s+/gm, "") // unordered lists
    .replace(/^\d+\.\s+/gm, "") // ordered lists
    .replace(/^---+$/gm, "") // horizontal rules
    .replace(/!\[.*?\]\(.*?\)/g, "") // images
    .trim();
}

interface IdeaContext {
  title: string;
  description: string;
  action_items?: string[];
  ai_suggestions?: string[];
  tags?: string[];
}

/**
 * Get writing feedback from Claude as an array of highlights.
 */
export async function getWritingFeedback(
  content: string,
  ideaContext: IdeaContext,
  priorWritings?: string[],
  summaryContent?: string
): Promise<Highlight[]> {
  const client = new Anthropic();
  const flatText = stripMarkdown(content);

  const systemParts = [
    "You are a writing coach providing inline feedback on a draft.",
    "",
    "## Idea Context",
    `Title: ${ideaContext.title}`,
    `Description: ${ideaContext.description}`,
  ];

  if (ideaContext.action_items?.length) {
    systemParts.push(`Action Items: ${ideaContext.action_items.join("; ")}`);
  }
  if (ideaContext.ai_suggestions?.length) {
    systemParts.push(
      `AI Suggestions: ${ideaContext.ai_suggestions.join("; ")}`
    );
  }

  if (summaryContent?.trim()) {
    systemParts.push(
      "",
      "## Summary Notes (from the writer's summary page — use this as context)",
      summaryContent.slice(0, 2000)
    );
  }

  if (priorWritings?.length) {
    systemParts.push("", "## Prior Writing Samples (for voice consistency)");
    priorWritings.forEach((sample, i) => {
      systemParts.push(`\nSample ${i + 1}:\n${sample.slice(0, 500)}`);
    });
  }

  systemParts.push(
    "",
    "## Instructions",
    "Analyze the draft and return 3-8 inline highlights.",
    "Each highlight must reference an EXACT substring from the draft text below.",
    "The matchText must be an exact, verbatim substring that appears in the flat text.",
    "",
    "Highlight types: question, suggestion, edit, voice, weakness, evidence, wordiness, factcheck",
    "- question: asks the writer to think deeper about a claim or idea",
    "- suggestion: proposes adding content or restructuring",
    "- edit: offers a specific text replacement",
    '- voice: flags tone inconsistency with prior writing (only use if prior samples provided)',
    "- weakness: identifies weak arguments or unsupported claims",
    "- evidence: suggests where evidence or examples would strengthen the point",
    "- wordiness: flags verbose phrases with a concise alternative",
    "- factcheck: flags claims that may need verification",
    "",
    "For edit and wordiness types, always include suggestedEdit."
  );

  const ANALYZE_TOOL: Anthropic.Tool = {
    name: "analyze_writing",
    description: "Return inline writing feedback as highlights",
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
                description: "Exact substring from the draft to highlight",
              },
              comment: {
                type: "string",
                description: "Feedback comment for this highlight",
              },
              suggestedEdit: {
                type: "string",
                description:
                  "Replacement text (required for edit and wordiness types)",
              },
            },
            required: ["type", "matchText", "comment"],
          },
        },
      },
      required: ["highlights"],
    },
  };

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: systemParts.join("\n"),
    tools: [ANALYZE_TOOL],
    tool_choice: { type: "tool", name: "analyze_writing" },
    messages: [
      {
        role: "user",
        content: `Here is the draft text to analyze:\n\n${flatText}`,
      },
    ],
  });

  const toolBlock = message.content.find((block) => block.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("No tool response from Claude");
  }

  const parsed = toolBlock.input as {
    highlights: {
      type: HighlightType;
      matchText: string;
      comment: string;
      suggestedEdit?: string;
    }[];
  };

  // Filter to only highlights whose matchText actually appears in the flat text
  return parsed.highlights
    .filter((h) => flatText.includes(h.matchText))
    .map((h, i) => ({
      id: `hl-${Date.now()}-${i}`,
      type: h.type,
      matchText: h.matchText,
      comment: h.comment,
      suggestedEdit: h.suggestedEdit,
      pageKey: "coral" as PageKey, // Will be overridden by caller
    }));
}

/**
 * Stream a chat response from Claude.
 * Calls the provided callback with each text delta, returns the full response.
 */
export async function streamChatResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  currentContent: string,
  ideaContext: IdeaContext,
  onTextDelta: (text: string) => void,
  priorWritings?: string[],
  summaryContent?: string
): Promise<string> {
  const client = new Anthropic();

  const systemParts = [
    "You are a helpful writing assistant. The user is developing an idea through writing.",
    "",
    "## Idea Context",
    `Title: ${ideaContext.title}`,
    `Description: ${ideaContext.description}`,
  ];

  if (ideaContext.action_items?.length) {
    systemParts.push(`Action Items: ${ideaContext.action_items.join("; ")}`);
  }
  if (ideaContext.ai_suggestions?.length) {
    systemParts.push(
      `AI Suggestions: ${ideaContext.ai_suggestions.join("; ")}`
    );
  }

  if (priorWritings?.length) {
    systemParts.push("", "## Prior Writing Samples");
    priorWritings.forEach((sample, i) => {
      systemParts.push(`\nSample ${i + 1}:\n${sample.slice(0, 500)}`);
    });
  }

  if (summaryContent?.trim()) {
    systemParts.push(
      "",
      "## Summary Notes (the writer's summary page — use as context)",
      summaryContent.slice(0, 2000)
    );
  }

  if (currentContent.trim()) {
    systemParts.push(
      "",
      "## Current Draft",
      currentContent.slice(0, 3000)
    );
  }

  systemParts.push(
    "",
    "## Instructions",
    "Help the writer develop their ideas. Be concise and practical.",
    "Reference specific parts of their draft when giving advice.",
    "Suggest concrete improvements rather than vague encouragement."
  );

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: systemParts.join("\n"),
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  let fullResponse = "";

  stream.on("text", (text) => {
    fullResponse += text;
    onTextDelta(text);
  });

  await stream.finalMessage();
  return fullResponse;
}
