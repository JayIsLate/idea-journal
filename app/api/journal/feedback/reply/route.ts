import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/supabase/server";
import { getUserApiKey } from "@/lib/byok";

export const maxDuration = 60;

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface StoredHighlight {
  id: string;
  type: string;
  matchText: string;
  comment: string;
  suggestedEdit?: string;
  view: "unabridged" | "abridged";
  conversation?: ConversationMessage[];
}

const SYSTEM_PROMPT = `You are a thoughtful reader the writer trusts to push back on their journal entries. The writer left an inline annotation on a passage of their own writing and is now replying to your feedback. Continue the conversation: answer the question, weigh their reasoning, probe further when useful. Stay grounded in the specific passage. No throat-clearing, no "great point" — get straight to the substance. 2–4 short paragraphs max. Do not refer to yourself by a name.`;

export async function POST(request: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const apiKey = await getUserApiKey(supabase, user.id);
  const { entryId, highlightId, message } = (await request.json()) as {
    entryId: string;
    highlightId: string;
    message: string;
  };

  if (!entryId || !highlightId || !message?.trim()) {
    return new Response(
      JSON.stringify({ error: "entryId, highlightId, message required" }),
      { status: 400 }
    );
  }

  // Load the entry + its highlights so we can ground Claude's reply in the
  // original passage and any prior conversation on this highlight.
  const { data: entry } = await supabase
    .from("entries")
    .select("raw_transcription, summary, abridged, highlights")
    .eq("id", entryId)
    .single();

  if (!entry) {
    return new Response(JSON.stringify({ error: "Entry not found" }), {
      status: 404,
    });
  }

  const allHighlights: StoredHighlight[] = (entry.highlights || []) as StoredHighlight[];
  const target = allHighlights.find((h) => h.id === highlightId);
  if (!target) {
    return new Response(JSON.stringify({ error: "Highlight not found" }), {
      status: 404,
    });
  }

  const fullText =
    target.view === "abridged"
      ? entry.abridged || entry.summary || ""
      : entry.raw_transcription || "";
  const priorConversation = target.conversation || [];

  const userMessage: ConversationMessage = {
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  };

  const contextLines = [
    `Original passage from the journal entry:`,
    `"""`,
    target.matchText,
    `"""`,
    ``,
    `Your initial annotation (${target.type}):`,
    target.comment,
    ``,
    `Surrounding context (full entry text the passage is from):`,
    `"""`,
    fullText.slice(0, 4000),
    `"""`,
  ].join("\n");

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: contextLines },
    {
      role: "assistant",
      content: target.comment,
    },
    ...priorConversation.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let assistantText = "";
      try {
        const sdkStream = await client.messages.stream({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 800,
          system: SYSTEM_PROMPT,
          messages,
        });

        for await (const event of sdkStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            assistantText += event.delta.text;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "delta", text: event.delta.text })}\n\n`
              )
            );
          }
        }

        const assistantMessage: ConversationMessage = {
          role: "assistant",
          content: assistantText,
          timestamp: new Date().toISOString(),
        };

        const updatedConversation = [
          ...priorConversation,
          userMessage,
          assistantMessage,
        ];

        const updatedHighlights = allHighlights.map((h) =>
          h.id === highlightId ? { ...h, conversation: updatedConversation } : h
        );

        await supabase
          .from("entries")
          .update({ highlights: updatedHighlights })
          .eq("id", entryId);

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Reply failed";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
