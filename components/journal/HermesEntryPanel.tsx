"use client";

import { useEffect, useMemo, useState } from "react";
import HighlightPopover from "@/components/writing/HighlightPopover";
import type { Highlight } from "@/lib/writing-types";

interface StoredHighlight {
  id: string;
  type: Highlight["type"];
  matchText: string;
  comment: string;
  suggestedEdit?: string;
  view: "unabridged" | "abridged";
}

const TYPE_UNDERLINE: Record<string, string> = {
  question: "decoration-blue-400",
  suggestion: "decoration-emerald-400",
  edit: "decoration-amber-400",
  voice: "decoration-purple-400",
  weakness: "decoration-red-400",
  evidence: "decoration-cyan-500",
  wordiness: "decoration-orange-400",
  factcheck: "decoration-pink-400",
};

interface Props {
  entryId: string;
  content: string;
  view: "unabridged" | "abridged";
  initialHighlights: StoredHighlight[];
}

interface ActivePopover {
  highlight: StoredHighlight;
  position: { x: number; y: number };
}

export default function HermesEntryPanel({
  entryId,
  content,
  view,
  initialHighlights,
}: Props) {
  const [highlights, setHighlights] = useState<StoredHighlight[]>(
    initialHighlights.filter((h) => h.view === view)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ActivePopover | null>(null);

  useEffect(() => {
    setHighlights(initialHighlights.filter((h) => h.view === view));
  }, [initialHighlights, view]);

  async function runFeedback() {
    if (loading) return;
    setLoading(true);
    setError(null);
    const received: StoredHighlight[] = [];

    try {
      const res = await fetch("/api/journal/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, content, view }),
      });
      if (!res.body) {
        setError("No stream");
        setLoading(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!chunk.startsWith("data:")) continue;
          const data = chunk.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as
              | { type: "highlight"; highlight: StoredHighlight }
              | { type: "error"; message: string };
            if (parsed.type === "highlight") {
              received.push(parsed.highlight);
              setHighlights((prev) => [...prev, parsed.highlight]);
            } else if (parsed.type === "error") {
              setError(parsed.message);
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function dismiss(highlightId: string) {
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    setActive(null);
    await fetch("/api/journal/feedback", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, highlightId }),
    });
  }

  function openPopover(h: StoredHighlight, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActive({
      highlight: h,
      position: { x: rect.left, y: rect.bottom + 8 },
    });
  }

  // Build text with highlight spans inline. We render content as a single
  // pre-wrap block (no markdown), which keeps substring offsets stable.
  const rendered = useMemo(() => {
    if (highlights.length === 0) return null;
    return renderWithHighlights(content, highlights, openPopover);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, highlights]);

  const activeHighlightForPopover: Highlight | null = active
    ? {
        id: active.highlight.id,
        type: active.highlight.type,
        matchText: active.highlight.matchText,
        comment: active.highlight.comment,
        suggestedEdit: active.highlight.suggestedEdit,
        pageKey: active.highlight.view as unknown as Highlight["pageKey"],
      }
    : null;

  return (
    <div className="mt-10 pt-6 border-t border-border">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[9px] uppercase tracking-wider text-secondary">
          Hermes
        </span>
        <button
          onClick={runFeedback}
          disabled={loading || !content.trim()}
          className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded border border-border hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
        >
          {loading ? "Reading…" : highlights.length > 0 ? "Re-read →" : "Get feedback →"}
        </button>
      </div>

      {error && (
        <p className="font-mono text-[11px] text-red-600 mb-3">{error}</p>
      )}

      {highlights.length === 0 ? (
        <p className="font-sans text-[13px] text-secondary leading-relaxed">
          Tap “Get feedback” to surface questions, evidence gaps, and tighter
          phrasings inline.
        </p>
      ) : (
        <div className="journal-prose notebook-grid -mx-2 px-2 whitespace-pre-wrap text-text">
          {rendered}
        </div>
      )}

      {active && activeHighlightForPopover && (
        <HighlightPopover
          highlight={activeHighlightForPopover}
          position={active.position}
          onAccept={() => dismiss(active.highlight.id)}
          onDismiss={(id) => dismiss(id)}
          onReply={() => setActive(null)}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

function renderWithHighlights(
  text: string,
  highlights: StoredHighlight[],
  onClick: (h: StoredHighlight, e: React.MouseEvent) => void
): React.ReactNode {
  type Span = { start: number; end: number; highlight: StoredHighlight };
  const spans: Span[] = [];
  for (const h of highlights) {
    const idx = text.indexOf(h.matchText);
    if (idx === -1) continue;
    spans.push({ start: idx, end: idx + h.matchText.length, highlight: h });
  }
  spans.sort((a, b) => a.start - b.start);

  // Drop overlaps (keep earliest)
  const kept: Span[] = [];
  let lastEnd = -1;
  for (const s of spans) {
    if (s.start < lastEnd) continue;
    kept.push(s);
    lastEnd = s.end;
  }

  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  kept.forEach((s, i) => {
    if (s.start > cursor) {
      pieces.push(<span key={`t-${i}`}>{text.slice(cursor, s.start)}</span>);
    }
    pieces.push(
      <span
        key={`h-${s.highlight.id}`}
        onClick={(e) => onClick(s.highlight, e)}
        className={`highlight-decoration cursor-pointer underline underline-offset-4 decoration-2 ${
          TYPE_UNDERLINE[s.highlight.type] || "decoration-accent"
        }`}
      >
        {text.slice(s.start, s.end)}
      </span>
    );
    cursor = s.end;
  });
  if (cursor < text.length) {
    pieces.push(<span key="t-tail">{text.slice(cursor)}</span>);
  }
  return pieces;
}
