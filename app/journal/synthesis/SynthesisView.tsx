"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { Entry } from "@/lib/types";
import ProgressIndicator from "@/components/journal/ProgressIndicator";

const SYNTHESIS_PHASES = [
  { until: 3, label: "Re-reading entries" },
  { until: 8, label: "Finding patterns" },
  { until: 15, label: "Drawing threads" },
  { until: 25, label: "Composing synthesis" },
  { until: Infinity, label: "Hang tight" },
];

interface EntryWithSummary {
  id: string;
  summary: string;
}

interface SynthesisRow {
  id: string;
  synthesis: string;
  entry_ids: string[];
  created_at: string;
}

interface Props {
  entries: EntryWithSummary[];
  cached: SynthesisRow | null;
  allEntries: Entry[];
}

export default function SynthesisView({ entries, cached, allEntries }: Props) {
  const [synthesis, setSynthesis] = useState<string>(cached?.synthesis || "");
  const [coveredIds, setCoveredIds] = useState<string[]>(cached?.entry_ids || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "incremental" | "full">("idle");
  const autoRunRef = useRef(false);

  // Diff: which current entries are not yet covered by the cached synthesis?
  const newEntries = useMemo(
    () => entries.filter((e) => !coveredIds.includes(e.id)),
    [entries, coveredIds]
  );

  const runFull = useCallback(async () => {
    if (entries.length === 0) {
      setError(
        "No summaries available in the last 30 days. Visit an entry and tap 'summarize' first."
      );
      return;
    }
    setLoading(true);
    setMode("full");
    setError(null);
    try {
      const res = await fetch("/api/journal/synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "full", entries }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || `Failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as { synthesis: string };
      setSynthesis(data.synthesis);
      setCoveredIds(entries.map((e) => e.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
      setMode("idle");
    }
  }, [entries]);

  const runIncremental = useCallback(async () => {
    if (newEntries.length === 0 || !synthesis) return;
    setLoading(true);
    setMode("incremental");
    setError(null);
    try {
      const res = await fetch("/api/journal/synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "incremental",
          newEntries,
          priorSynthesis: synthesis,
          priorEntryIds: coveredIds,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || `Failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as { synthesis: string };
      setSynthesis(data.synthesis);
      setCoveredIds([...coveredIds, ...newEntries.map((e) => e.id)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
      setMode("idle");
    }
  }, [newEntries, synthesis, coveredIds]);

  // On first mount: if no cache → run full. If cache + new entries → run
  // incremental. If cache is already up to date → no Claude call at all.
  useEffect(() => {
    if (autoRunRef.current) return;
    autoRunRef.current = true;
    if (!cached) {
      if (entries.length > 0) runFull();
      return;
    }
    if (newEntries.length > 0) {
      runIncremental();
    }
    // else: cache is fresh, do nothing
  }, [cached, entries.length, newEntries.length, runFull, runIncremental]);

  const statusLabel = (() => {
    if (loading && mode === "incremental")
      return `Integrating ${newEntries.length} new ${newEntries.length === 1 ? "entry" : "entries"}…`;
    if (loading && mode === "full") return "Regenerating from scratch…";
    if (!cached && entries.length === 0) return "";
    if (newEntries.length > 0 && synthesis)
      return `${newEntries.length} new ${newEntries.length === 1 ? "entry" : "entries"} not yet integrated`;
    if (cached) {
      return `Up to date · ${coveredIds.length} ${coveredIds.length === 1 ? "entry" : "entries"} integrated`;
    }
    return "";
  })();

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-2">
        <div>
          <h1 className="font-mono text-2xl sm:text-[26px] font-bold">Synthesis</h1>
          <p className="text-sm text-secondary mt-1">
            Patterns, themes, and open threads across your writing
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          {newEntries.length > 0 && synthesis && !loading && (
            <button
              onClick={runIncremental}
              className="font-mono text-[10px] uppercase tracking-wider px-3 py-2 rounded-md border border-accent text-accent hover:bg-accent hover:text-card transition-colors"
            >
              + Integrate {newEntries.length} new
            </button>
          )}
          <button
            onClick={runFull}
            disabled={loading || entries.length === 0}
            className="font-mono text-[10px] uppercase tracking-wider px-3 py-2 rounded-md border border-border hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:hover:border-border disabled:hover:text-secondary"
          >
            ↻ Regenerate
          </button>
        </div>
      </div>

      {statusLabel && (
        <p className="font-mono text-[10px] uppercase tracking-wider text-secondary mb-6">
          {statusLabel}
        </p>
      )}

      {error && (
        <div className="mb-6 p-3 border border-border rounded-xl">
          <p className="font-mono text-[12px] text-red-600">{error}</p>
        </div>
      )}

      <section className="mb-10">
        {loading && (
          <ProgressIndicator phases={SYNTHESIS_PHASES} className="mb-4" />
        )}
        {loading && !synthesis ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-border rounded w-full" />
            <div className="h-4 bg-border rounded w-[95%]" />
            <div className="h-4 bg-border rounded w-[88%]" />
            <div className="h-4 bg-border rounded w-[92%]" />
          </div>
        ) : synthesis ? (
          <div
            className={`journal-prose whitespace-pre-wrap text-text transition-opacity ${
              loading ? "opacity-40" : ""
            }`}
          >
            {synthesis}
          </div>
        ) : null}
      </section>

      <div className="border-t border-border pt-6">
        <span className="font-mono text-[9px] uppercase tracking-wider text-secondary">
          All Entries
        </span>
        <div className="mt-3 space-y-1.5">
          {allEntries.map((entry) => (
            <Link
              key={entry.id}
              href={`/journal/${entry.id}`}
              className="block font-mono text-[11px] hover:opacity-70 transition-opacity"
            >
              <span className="text-accent">#{String(entry.day_number).padStart(3, "0")}</span>
              <span className="text-secondary"> — {entry.date} — </span>
              <span className="text-secondary">{entry.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
