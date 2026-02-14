"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Entry } from "@/lib/types";
import IdeaCard from "@/components/IdeaCard";
import Link from "next/link";

export default function DayPage() {
  const params = useParams();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  if (loading) {
    return (
      <div className="max-w-stream mx-auto px-4 sm:px-6">
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
      <div className="max-w-stream mx-auto px-4 sm:px-6 py-8">
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
    <div className="max-w-stream mx-auto px-4 sm:px-6 pb-12">
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/"
          className="text-sm font-mono text-secondary py-2 active:opacity-70"
        >
          &larr; Stream
        </Link>
        <button
          onClick={share}
          className="text-sm font-mono text-secondary py-2 px-3 rounded-lg active:bg-bg transition-colors"
        >
          {copied ? "Copied!" : "Share"}
        </button>
      </div>

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
