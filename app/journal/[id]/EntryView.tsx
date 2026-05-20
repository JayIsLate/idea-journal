"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Entry, Idea } from "@/lib/types";
import { renderMarkdown } from "@/lib/markdown";
import IdeasPanelContent from "@/components/journal/IdeasPanelContent";
import IdeasFab from "@/components/journal/IdeasFab";
import IdeasDrawer from "@/components/journal/IdeasDrawer";
import HermesEntryPanel, { type HermesPanelHandle } from "@/components/journal/HermesEntryPanel";

interface StoredHighlight {
  id: string;
  type: import("@/lib/writing-types").HighlightType;
  matchText: string;
  comment: string;
  suggestedEdit?: string;
  view: "unabridged" | "abridged";
}

interface Props {
  entry: Entry & { ideas: Idea[]; highlights: StoredHighlight[] };
}

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
  const hermesSectionRef = useRef<HTMLDivElement>(null);
  const [hermesState, setHermesState] = useState<{ loading: boolean; count: number }>({
    loading: false,
    count: entry.highlights.filter((h) => h.view === view).length,
  });

  function triggerHermes() {
    if (hermesState.count > 0) {
      hermesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      hermesRef.current?.runFeedback();
      // After kicking off, scroll into view so the loading state is visible
      setTimeout(() => {
        hermesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }

  const unabridgedHtml = useMemo(() => renderMarkdown(entry.raw_transcription), [entry.raw_transcription]);
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
            disabled={hermesState.loading}
            className="ml-auto font-mono text-[10px] uppercase tracking-wider pb-2 px-2 text-secondary hover:text-accent transition-colors disabled:opacity-40"
          >
            {hermesState.loading
              ? "Reading…"
              : hermesState.count > 0
                ? `Hermes (${hermesState.count}) ↓`
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

          {view === "unabridged" ? (
            <div
              className="tiptap-editor journal-prose notebook-grid -mx-2 px-2"
              dangerouslySetInnerHTML={{ __html: unabridgedHtml }}
            />
          ) : (
            <>
              {summarizing && !summary && (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-border rounded w-full" />
                  <div className="h-4 bg-border rounded w-[95%]" />
                  <div className="h-4 bg-border rounded w-[88%]" />
                </div>
              )}
              {summarizeError && (
                <p className="font-mono text-[12px] text-red-600">{summarizeError}</p>
              )}
              {summary && (
                <div
                  className="tiptap-editor journal-prose notebook-grid -mx-2 px-2"
                  dangerouslySetInnerHTML={{ __html: abridgedHtml }}
                />
              )}
              {summary && (
                <button
                  onClick={() => fetchSummary(true)}
                  disabled={summarizing}
                  className="mt-6 font-mono text-[10px] uppercase tracking-wider text-secondary hover:text-accent transition-colors disabled:opacity-40"
                >
                  {summarizing ? "Regenerating…" : "↻ Regenerate"}
                </button>
              )}
            </>
          )}

          <div ref={hermesSectionRef}>
            <HermesEntryPanel
              ref={hermesRef}
              entryId={entry.id}
              content={view === "abridged" ? summary : entry.raw_transcription}
              view={view}
              initialHighlights={entry.highlights}
              onStateChange={setHermesState}
            />
          </div>
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
    </div>
  );
}
