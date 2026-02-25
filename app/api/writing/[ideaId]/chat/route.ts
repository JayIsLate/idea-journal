import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { streamChatResponse } from "@/lib/writing-ai";
import type { ChatMessage } from "@/lib/writing-types";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: { ideaId: string } }
) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("writing_conversations")
    .select("*")
    .eq("idea_id", params.ideaId)
    .single();

  if (error && error.code === "PGRST116") {
    // No conversation yet
    return NextResponse.json({ messages: [] });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data.messages || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { ideaId: string } }
) {
  const supabase = getSupabase();
  const body = await request.json();
  const { message, currentContent, summaryContent } = body as {
    message: string;
    currentContent: string;
    summaryContent?: string;
  };

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "No message" }), {
      status: 400,
    });
  }

  // Load idea context
  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", params.ideaId)
    .single();

  if (ideaError || !idea) {
    return new Response(JSON.stringify({ error: "Idea not found" }), {
      status: 404,
    });
  }

  // Load existing conversation
  const { data: convo } = await supabase
    .from("writing_conversations")
    .select("*")
    .eq("idea_id", params.ideaId)
    .single();

  const existingMessages: ChatMessage[] = convo?.messages || [];

  // Add user message
  const userMsg: ChatMessage = {
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  };
  const allMessages = [...existingMessages, userMsg];

  // Load prior writings for voice context
  const { data: otherWritings } = await supabase
    .from("idea_writing")
    .select("pages")
    .neq("idea_id", params.ideaId)
    .order("updated_at", { ascending: false })
    .limit(3);

  const priorSamples: string[] = [];
  if (otherWritings) {
    for (const w of otherWritings) {
      const pages = w.pages as Record<string, string>;
      const combined = Object.values(pages)
        .filter((p) => p.trim())
        .join("\n\n");
      if (combined.trim()) {
        priorSamples.push(combined.slice(0, 500));
      }
    }
  }

  // Create SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const fullResponse = await streamChatResponse(
          allMessages.map((m) => ({ role: m.role, content: m.content })),
          currentContent,
          {
            title: idea.title,
            description: idea.description,
            action_items: idea.action_items,
            ai_suggestions: idea.ai_suggestions,
            tags: idea.tags,
          },
          (text) => {
            const data = JSON.stringify({ type: "text", text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          },
          priorSamples.length > 0 ? priorSamples : undefined,
          summaryContent
        );

        // Save conversation to DB
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: fullResponse,
          timestamp: new Date().toISOString(),
        };
        const updatedMessages = [...allMessages, assistantMsg];

        if (convo) {
          await supabase
            .from("writing_conversations")
            .update({ messages: updatedMessages })
            .eq("id", convo.id);
        } else {
          await supabase.from("writing_conversations").insert({
            idea_id: params.ideaId,
            messages: updatedMessages,
          });
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Chat failed";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: msg })}\n\n`
          )
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
