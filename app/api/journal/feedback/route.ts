import { NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { getUserApiKey } from "@/lib/byok";
import { getEntryFeedback, type EntryView } from "@/lib/entry-feedback";

export const maxDuration = 60;

interface StoredHighlight {
  id: string;
  type: string;
  matchText: string;
  comment: string;
  suggestedEdit?: string;
  view: EntryView;
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const apiKey = await getUserApiKey(supabase, user.id);
  const body = await request.json();
  const { entryId, content, view } = body as {
    entryId: string;
    content: string;
    view: EntryView;
  };

  if (!entryId || !content?.trim() || !view) {
    return new Response(JSON.stringify({ error: "entryId, content, view required" }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const highlights = await getEntryFeedback(content, view, apiKey);

        const tagged: StoredHighlight[] = highlights.map((h) => ({
          id: h.id,
          type: h.type,
          matchText: h.matchText,
          comment: h.comment,
          suggestedEdit: h.suggestedEdit,
          view,
        }));

        for (const h of tagged) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "highlight", highlight: h })}\n\n`)
          );
        }

        // Merge with existing highlights (keep highlights from the other view, replace this view's)
        const { data: existing } = await supabase
          .from("entries")
          .select("highlights")
          .eq("id", entryId)
          .single();

        const prior: StoredHighlight[] = (existing?.highlights || []) as StoredHighlight[];
        const keptOtherView = prior.filter((h) => h.view !== view);
        const merged = [...keptOtherView, ...tagged];

        await supabase
          .from("entries")
          .update({ highlights: merged })
          .eq("id", entryId);

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Feedback failed";
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

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const { entryId, highlightId } = (await request.json()) as {
    entryId: string;
    highlightId: string;
  };
  if (!entryId || !highlightId) {
    return new Response(JSON.stringify({ error: "entryId, highlightId required" }), {
      status: 400,
    });
  }
  const { data: existing } = await supabase
    .from("entries")
    .select("highlights")
    .eq("id", entryId)
    .single();
  const prior: StoredHighlight[] = (existing?.highlights || []) as StoredHighlight[];
  const next = prior.filter((h) => h.id !== highlightId);
  await supabase.from("entries").update({ highlights: next }).eq("id", entryId);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
