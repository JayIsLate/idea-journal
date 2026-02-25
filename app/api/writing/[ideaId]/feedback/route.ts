import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getWritingFeedback } from "@/lib/writing-ai";
import type { PageKey } from "@/lib/writing-types";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: { ideaId: string } }
) {
  const supabase = getSupabase();
  const body = await request.json();
  const { content, pageKey, summaryContent } = body as {
    content: string;
    pageKey: PageKey;
    summaryContent?: string;
  };

  if (!content?.trim()) {
    return new Response(JSON.stringify({ error: "No content" }), {
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

  // Load prior writings for voice consistency
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
        const highlights = await getWritingFeedback(
          content,
          {
            title: idea.title,
            description: idea.description,
            action_items: idea.action_items,
            ai_suggestions: idea.ai_suggestions,
            tags: idea.tags,
          },
          priorSamples.length > 0 ? priorSamples : undefined,
          summaryContent
        );

        // Tag highlights with the current page key
        const tagged = highlights.map((h) => ({ ...h, pageKey }));

        // Send each highlight as an SSE event
        for (const highlight of tagged) {
          const data = JSON.stringify({ type: "highlight", highlight });
          controller.enqueue(
            encoder.encode(`data: ${data}\n\n`)
          );
        }

        // Save highlights to DB
        await supabase
          .from("idea_writing")
          .update({
            highlights: tagged,
            last_ai_feedback_at: new Date().toISOString(),
          })
          .eq("idea_id", params.ideaId);

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Feedback generation failed";
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
