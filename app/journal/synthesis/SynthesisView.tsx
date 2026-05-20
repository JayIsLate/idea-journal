"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Entry } from "@/lib/types";

interface Props {
  summaries: string[];
  entries: Entry[];
}

export default function SynthesisView({ summaries, entries }: Props) {
  const [synthesis, setSynthesis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSynthesis = useCallback(async () => {
    if (summaries.length === 0) {
      setError("No summaries available in the last 30 days. Visit an entry and tap 'summarize' first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/journal/synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaries }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as { synthesis: string };
      setSynthesis(data.synthesis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [summaries]);

  useEffect(() => {
    runSynthesis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-mono text-2xl sm:text-[26px] font-bold">Synthesis</h1>
          <p className="text-sm text-secondary mt-1">
            Patterns, themes, and open threads across your writing
          </p>
        </div>
        <button
          onClick={runSynthesis}
          disabled={loading || summaries.length === 0}
          className="font-mono text-[10px] uppercase tracking-wider px-3 py-2 rounded-md border border-border hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:hover:border-border disabled:hover:text-secondary self-start md:self-auto w-full md:w-auto"
        >
          {loading ? "Generating…" : "Regenerate →"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 border border-border rounded-xl">
          <p className="font-mono text-[12px] text-red-600">{error}</p>
        </div>
      )}

      <section className="mb-10">
        {loading && !synthesis ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-border rounded w-full" />
            <div className="h-4 bg-border rounded w-[95%]" />
            <div className="h-4 bg-border rounded w-[88%]" />
            <div className="h-4 bg-border rounded w-[92%]" />
          </div>
        ) : synthesis ? (
          <div className="font-sans text-sm leading-[1.9] whitespace-pre-wrap text-text">
            {synthesis}
          </div>
        ) : null}
      </section>

      <div className="border-t border-border pt-6">
        <span className="font-mono text-[9px] uppercase tracking-wider text-secondary">
          All Entries
        </span>
        <div className="mt-3 space-y-1.5">
          {entries.map((entry) => (
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
