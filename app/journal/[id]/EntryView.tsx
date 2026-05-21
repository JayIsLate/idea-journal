"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Entry, Idea } from "@/lib/types";
import { renderMarkdown } from "@/lib/markdown";
import IdeasPanelContent from "@/components/journal/IdeasPanelContent";
import IdeasFab from "@/components/journal/IdeasFab";
import IdeasDrawer from "@/components/journal/IdeasDrawer";
import HermesEntryPanel, { type HermesPanelHandle } from "@/components/journal/HermesEntryPanel";
import HermesReplyThread from "@/components/journal/HermesReplyThread";
import HighlightPopover from "@/components/writing/HighlightPopover";
import type { Highlight, HighlightType } from "@/lib/writing-types";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface StoredHighlight {
  id: string;
  type: HighlightType;
  matchText: string;
  comment: string;
  suggestedEdit?: string;
  view: "unabridged" | "abridged";
  conversation?: ConversationMessage[];
}

interface Props {
  entry: Entry & { ideas: Idea[]; highlights: StoredHighlight[] };
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

export default function EntryView({ entry }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "abridged" ? "abridged" : "unabridged";

  const [summary, setSummary] = useState<string>(entry.summary || "");
  const [summarizing, setSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const ideasCount = entry.ideas.length;
  const hermesRef = useRef<HermesPanelHandle>(null);
  const hermesAnchorRef = useRef<HTMLDivElement>(null);

  // Highlights are owned here so we can render them inline on the entry text
  // AND drive the reply thread + popover from the same state.
  const [highlights, setHighlights] = useState<StoredHighlight[]>(entry.highlights);
  const [hermesLoading, setHermesLoading] = useState(false);
  const visibleHighlights = useMemo(
    () => highlights.filter((h) => h.view === view),
    [highlights, view]
  );

  const [activePopover, setActivePopover] = useState<{
    highlight: StoredHighlight;
    position: { x: number; y: number };
  } | null>(null);
  const [replyHighlightId, setReplyHighlightId] = useState<string | null>(null);
  const replyHighlight =
    replyHighlightId ? highlights.find((h) => h.id === replyHighlightId) ?? null : null;

  function triggerHermes() {
    if (visibleHighlights.length > 0) {
      hermesAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      hermesRef.current?.runFeedback();
    }
  }

  const handleHighlightAppended = useCallback((h: StoredHighlight) => {
    setHighlights((prev) => [...prev, h]);
  }, []);
  const handleHighlightsReceived = useCallback((_received: StoredHighlight[]) => {
    /* terminal SSE event — no-op; appended already populated state */
  }, []);

  function dismissHighlight(highlightId: string) {
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    setActivePopover(null);
    if (replyHighlightId === highlightId) setReplyHighlightId(null);
    fetch("/api/journal/feedback", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: entry.id, highlightId }),
    }).catch(() => {});
  }

  function updateConversation(highlightId: string, conversation: ConversationMessage[]) {
    setHighlights((prev) =>
      prev.map((h) => (h.id === highlightId ? { ...h, conversation } : h))
    );
  }

  function openPopover(h: StoredHighlight, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActivePopover({
      highlight: h,
      position: { x: rect.left, y: rect.bottom + 8 },
    });
  }

  const unabridgedHtml = useMemo(
    () => renderMarkdown(entry.raw_transcription),
    [entry.raw_transcription]
  );
  const abridgedHtml = useMemo(() => renderMarkdown(summary), [summary]);

  const fetchSummary = useCallback(
    async (force = false) => {
      if (summary && !force) return;
      setSummarizing(true);
      setSummarizeError(null);
      try {
        const res = await fetch("/api/journal/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId: entry.id, raw: entry.raw_transcription, force }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setSummarizeError(d.error || `Failed (${res.status})`);
          return;
        }
        const data = (await res.json()) as { summary: string };
        setSummary(data.summary);
      } catch (e) {
        setSummarizeError(e instanceof Error ? e.message : "Network error");
      } finally {
        setSummarizing(false);
      }
    },
    [entry.id, entry.raw_transcription, summary]
  );

  useEffect(() => {
    if (view === "abridged" && !summary) {
      fetchSummary(false);
    }
  }, [view, summary, fetchSummary]);

  function setView(next: "unabridged" | "abridged") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "abridged") {
      params.set("view", "abridged");
    } else {
      params.delete("view");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  async function pushToSynthesis() {
    await fetch(`/api/entries/${entry.id}/tag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: "synthesis" }),
    });
  }

  const activeHighlightForPopover: Highlight | null = activePopover
    ? {
        id: activePopover.highlight.id,
        type: activePopover.highlight.type,
        matchText: activePopover.highlight.matchText,
        comment: activePopover.highlight.comment,
        suggestedEdit: activePopover.highlight.suggestedEdit,
        pageKey: activePopover.highlight.view as unknown as Highlight["pageKey"],
      }
    : null;

  const currentText = view === "abridged" ? summary : entry.raw_transcription;
  const showInline = visibleHighlights.length > 0;

  return (
    <div className="md:flex md:gap-8">
      {/* Left pane */}
      <div className="flex-1 min-w-0">
        <div className="flex items-end gap-4 border-b border-border mb-5">
          <button
            onClick={() => setView("unabridged")}
            className={`font-mono text-[11px] uppercase tracking-wider pb-2 transition-colors ${
              view === "unabridged" ? "text-text border-b-2 border-accent -mb-px" : "text-secondary hover:text-text"
            }`}
          >
            Unabridged
          </button>
          <button
            onClick={() => setView("abridged")}
            className={`font-mono text-[11px] uppercase tracking-wider pb-2 transition-colors ${
              view === "abridged" ? "text-text border-b-2 border-accent -mb-px" : "text-secondary hover:text-text"
            }`}
          >
            Abridged
          </button>
          <button
            onClick={triggerHermes}
            disabled={hermesLoading}
            className="ml-auto font-mono text-[10px] uppercase tracking-wider pb-2 px-2 text-secondary hover:text-accent transition-colors disabled:opacity-40"
          >
            {hermesLoading
              ? "Reading…"
              : visibleHighlights.length > 0
                ? `Hermes (${visibleHighlights.length}) ↓`
                : "Hermes →"}
          </button>
        </div>

        <article className="pb-12">
          <h1 className="font-mono text-2xl sm:text-[26px] font-bold mb-2 leading-tight">
            {entry.title}
          </h1>
          <div className="font-mono text-[10px] uppercase tracking-wider text-secondary mb-6">
            {entry.mood}
          </div>

          {/* Entry body — switches to inline highlight rendering when Hermes
              has returned annotations for the current view. The plain-text
              span renderer is required for stable substring matching. */}
          <div ref={hermesAnchorRef}>
            {view === "abridged" && summarizing && !summary ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-border rounded w-full" />
                <div className="h-4 bg-border rounded w-[95%]" />
                <div className="h-4 bg-border rounded w-[88%]" />
              </div>
            ) : view === "abridged" && summarizeError ? (
              <p className="font-mono text-[12px] text-red-600">{summarizeError}</p>
            ) : showInline ? (
              <div className="tiptap-editor journal-prose notebook-grid -mx-2 px-2 whitespace-pre-wrap text-text">
                {renderWithHighlights(currentText, visibleHighlights, openPopover)}
              </div>
            ) : (
              <div
                className="tiptap-editor journal-prose notebook-grid -mx-2 px-2"
                dangerouslySetInnerHTML={{
                  __html: view === "abridged" ? abridgedHtml : unabridgedHtml,
                }}
              />
            )}
          </div>

          {view === "abridged" && summary && (
            <button
              onClick={() => fetchSummary(true)}
              disabled={summarizing}
              className="mt-6 font-mono text-[10px] uppercase tracking-wider text-secondary hover:text-accent transition-colors disabled:opacity-40"
            >
              {summarizing ? "Regenerating…" : "↻ Regenerate"}
            </button>
          )}

          {/* Hermes controller (invisible unless errored) — owns the SSE call */}
          <HermesEntryPanel
            ref={hermesRef}
            entryId={entry.id}
            content={currentText}
            view={view}
            onHighlightAppended={handleHighlightAppended}
            onHighlightsReceived={handleHighlightsReceived}
            onLoadingChange={setHermesLoading}
          />

          {/* Reply thread — appears below the entry when a highlight is opened
              into Reply mode from the popover */}
          {replyHighlight && (
            <HermesReplyThread
              entryId={entry.id}
              highlight={replyHighlight}
              onClose={() => setReplyHighlightId(null)}
              onConversationUpdate={updateConversation}
            />
          )}
        </article>
      </div>

      {/* Right panel (desktop only) */}
      <aside className="hidden md:block w-[260px] shrink-0 border-l border-border bg-bg -mr-4 sm:-mr-6 pl-6 pr-4 sm:pr-6 pt-5 pb-12">
        <IdeasPanelContent
          entryId={entry.id}
          raw={entry.raw_transcription}
          initialIdeas={entry.ideas}
          onSummarize={() => setView("abridged")}
          onPushToSynthesis={pushToSynthesis}
        />
      </aside>

      {/* Mobile FAB + Drawer */}
      <IdeasFab count={ideasCount} onClick={() => setDrawerOpen(true)} />
      <IdeasDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <IdeasPanelContent
          entryId={entry.id}
          raw={entry.raw_transcription}
          initialIdeas={entry.ideas}
          onSummarize={() => {
            setView("abridged");
            setDrawerOpen(false);
          }}
          onPushToSynthesis={pushToSynthesis}
        />
      </IdeasDrawer>

      {/* Inline highlight popover */}
      {activePopover && activeHighlightForPopover && (
        <HighlightPopover
          highlight={activeHighlightForPopover}
          position={activePopover.position}
          onAccept={() => dismissHighlight(activePopover.highlight.id)}
          onDismiss={(id) => dismissHighlight(id)}
          onReply={() => {
            setReplyHighlightId(activePopover.highlight.id);
            setActivePopover(null);
          }}
          onClose={() => setActivePopover(null)}
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
