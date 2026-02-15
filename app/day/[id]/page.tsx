"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Entry } from "@/lib/types";
import IdeaCard from "@/components/IdeaCard";
import Link from "next/link";

export default function DayPage() {
  const params = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/entries/${params.id}`);
      if (res.ok) {
        setEntry(await res.json());
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  function share() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function openMerge() {
    setShowMerge(true);
    const res = await fetch("/api/entries", { cache: "no-store" });
    if (res.ok) {
      const entries: Entry[] = await res.json();
      setAllEntries(entries.filter((e) => e.id !== params.id));
    }
  }

  async function mergeWith(sourceId: string) {
    if (!confirm("Merge this entry into the current one? The other entry will be deleted.")) return;
    setMerging(true);
    const res = await fetch("/api/entries/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: params.id, sourceId }),
    });
    if (res.ok) {
      // Reload the current entry to show merged content
      const updated = await fetch(`/api/entries/${params.id}`);
      if (updated.ok) setEntry(await updated.json());
      setShowMerge(false);
    }
    setMerging(false);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="animate-pulse space-y-4 py-8">
          <div className="h-4 bg-border rounded w-1/3" />
          <div className="h-8 bg-border rounded w-2/3" />
          <div className="h-4 bg-border rounded w-full" />
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-secondary font-mono text-sm">Entry not found.</p>
        <Link
          href="/"
          className="text-accent text-sm font-mono mt-3 inline-block active:opacity-70"
        >
          &larr; Back to stream
        </Link>
      </div>
    );
  }

  const date = new Date(entry.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/"
          className="text-sm font-mono text-secondary py-2 active:opacity-70"
        >
          &larr; Stream
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={openMerge}
            className="text-sm font-mono text-secondary py-2 px-3 rounded-lg active:bg-bg transition-colors"
          >
            Merge
          </button>
          <button
            onClick={share}
            className="text-sm font-mono text-secondary py-2 px-3 rounded-lg active:bg-bg transition-colors"
          >
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </div>

      {showMerge && (
        <div className="mb-5 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-sm font-semibold">Merge another entry into this one</h3>
            <button
              onClick={() => setShowMerge(false)}
              className="text-xs font-mono text-secondary active:opacity-70"
            >
              Cancel
            </button>
          </div>
          {allEntries.length === 0 ? (
            <p className="text-xs font-mono text-secondary">No other entries to merge.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allEntries.map((e) => (
                <button
                  key={e.id}
                  onClick={() => mergeWith(e.id)}
                  disabled={merging}
                  className="w-full text-left p-3 bg-bg rounded-lg active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-secondary">
                      Day {e.day_number} &middot; {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-xs font-mono text-accent">
                      {e.ideas?.length ?? 0} ideas
                    </span>
                  </div>
                  <p className="text-sm font-mono font-medium truncate">{e.title}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="label">Day {entry.day_number}</span>
          <span className="label">{formattedDate}</span>
        </div>
        <h1 className="font-mono text-xl sm:text-2xl font-bold mb-2 leading-tight">
          {entry.title}
        </h1>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono text-secondary px-2 py-0.5 bg-bg rounded-md">
            {entry.mood}
          </span>
        </div>
        <p className="text-sm text-secondary leading-relaxed">{entry.summary}</p>
      </div>

      {entry.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-6">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-mono text-secondary bg-card border border-border px-2 py-1 rounded-lg"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mb-4">
        <h2 className="font-mono text-base sm:text-lg font-semibold">
          Ideas ({entry.ideas?.length ?? 0})
        </h2>
      </div>

      {entry.ideas && entry.ideas.length > 0 ? (
        <div className="space-y-3">
          {entry.ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-secondary font-mono">
          No ideas extracted from this entry.
        </p>
      )}

      <details className="mt-8">
        <summary className="label cursor-pointer py-2 active:opacity-70">
          Raw Transcription
        </summary>
        <div className="mt-2 p-4 bg-card border border-border rounded-xl">
          <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap font-mono">
            {entry.raw_transcription}
          </p>
        </div>
      </details>
    </div>
  );
}
