"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Idea } from "@/lib/types";

const CATEGORIES = ["product", "content", "business", "personal", "technical", "creative"] as const;

interface Suggestion {
  title: string;
  category: string;
  description: string;
}

interface Props {
  entryId: string;
  raw: string;
  initialIdeas: Idea[];
  onSummarize: () => void;
  onPushToSynthesis: () => Promise<void>;
}

export default function IdeasPanelContent({
  entryId,
  raw,
  initialIdeas,
  onSummarize,
  onPushToSynthesis,
}: Props) {
  const [saved, setSaved] = useState<Idea[]>(initialIdeas);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualCategory, setManualCategory] = useState<string>("personal");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [synthesisAdded, setSynthesisAdded] = useState(false);

  useEffect(() => {
    if (initialIdeas.length > 0) return;
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const res = await fetch("/api/journal/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId, raw }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          if (!cancelled) setError(d.error || `Failed (${res.status})`);
          return;
        }
        const data = (await res.json()) as { saved: Idea[]; suggestions: Suggestion[] };
        if (cancelled) return;
        if (data.saved?.length) {
          setSaved(data.saved);
        } else {
          setSuggestions(data.suggestions || []);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [entryId, raw, initialIdeas.length]);

  async function addSuggestion(s: Suggestion) {
    const key = s.title;
    if (savedKeys.has(key)) return;
    setSavedKeys((prev) => new Set(prev).add(key));
    try {
      const res = await fetch("/api/journal/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId,
          title: s.title,
          category: s.category,
          description: s.description,
        }),
      });
      if (!res.ok) {
        setSavedKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        return;
      }
      const newIdea = (await res.json()) as Idea;
      setSaved((prev) => [...prev, newIdea]);
    } catch {
      setSavedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualTitle.trim() || manualSubmitting) return;
    setManualSubmitting(true);
    try {
      const res = await fetch("/api/journal/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId,
          title: manualTitle.trim(),
          category: manualCategory,
          description: "",
        }),
      });
      if (res.ok) {
        const newIdea = (await res.json()) as Idea;
        setSaved((prev) => [...prev, newIdea]);
        setManualTitle("");
        setShowManual(false);
      }
    } finally {
      setManualSubmitting(false);
    }
  }

  async function handlePushSynthesis() {
    await onPushToSynthesis();
    setSynthesisAdded(true);
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-mono text-[9px] uppercase tracking-wider text-secondary mb-3">
          Extracted Ideas
        </h3>

        {loading && saved.length === 0 && suggestions.length === 0 && (
          <p className="font-mono text-[11px] text-secondary">Extracting…</p>
        )}
        {error && (
          <p className="font-mono text-[11px] text-red-600">{error}</p>
        )}

        <ul className="space-y-2">
          {saved.map((idea) => (
            <li key={idea.id}>
              <Link
                href={`/write/${idea.id}`}
                className="flex items-start justify-between gap-2 text-[12px] hover:opacity-70 transition-opacity group"
              >
                <span className="font-mono text-secondary line-through opacity-70 flex-1 group-hover:text-accent group-hover:opacity-100">
                  {idea.title}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-secondary shrink-0 group-hover:text-accent">
                  ✓ Saved
                </span>
              </Link>
            </li>
          ))}
          {suggestions.map((s) => {
            const isSaved = savedKeys.has(s.title);
            return (
              <li
                key={s.title}
                className="flex items-start justify-between gap-2 text-[12px]"
              >
                <span className={`font-mono flex-1 ${isSaved ? "text-secondary line-through opacity-70" : "text-text"}`}>
                  {s.title}
                </span>
                {isSaved ? (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-secondary shrink-0">
                    ✓ Saved
                  </span>
                ) : (
                  <button
                    onClick={() => addSuggestion(s)}
                    className="font-mono text-[10px] uppercase tracking-wider text-accent hover:opacity-70 shrink-0"
                  >
                    + Add
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {showManual ? (
          <form onSubmit={submitManual} className="mt-3 space-y-2">
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Idea title"
              autoFocus
              className="w-full font-mono text-[12px] border border-border rounded px-2 py-1.5 focus:outline-none focus:border-accent bg-card"
            />
            <select
              value={manualCategory}
              onChange={(e) => setManualCategory(e.target.value)}
              className="w-full font-mono text-[12px] border border-border rounded px-2 py-1.5 focus:outline-none focus:border-accent bg-card"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={manualSubmitting || !manualTitle.trim()}
                className="font-mono text-[10px] uppercase tracking-wider text-accent hover:opacity-70 disabled:opacity-40"
              >
                + Save
              </button>
              <button
                type="button"
                onClick={() => setShowManual(false)}
                className="font-mono text-[10px] uppercase tracking-wider text-secondary hover:opacity-70"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowManual(true)}
            className="mt-3 font-mono text-[10px] uppercase tracking-wider text-secondary hover:text-accent transition-colors"
          >
            + Add manually
          </button>
        )}
      </section>

      <section>
        <h3 className="font-mono text-[9px] uppercase tracking-wider text-secondary mb-3">
          Quick Actions
        </h3>
        <ul className="space-y-2">
          <li>
            <button
              onClick={onSummarize}
              className="font-mono text-[11px] text-secondary hover:text-accent transition-colors text-left"
            >
              <span className="text-accent">→</span> summarize entry
            </button>
          </li>
          <li>
            <button
              onClick={handlePushSynthesis}
              disabled={synthesisAdded}
              className="font-mono text-[11px] text-secondary hover:text-accent transition-colors text-left disabled:opacity-50 disabled:hover:text-secondary"
            >
              <span className="text-accent">→</span> {synthesisAdded ? "added to synthesis" : "push to synthesis"}
            </button>
          </li>
          <li>
            <button
              onClick={() => setShowManual(true)}
              className="font-mono text-[11px] text-secondary hover:text-accent transition-colors text-left"
            >
              <span className="text-accent">→</span> add idea manually
            </button>
          </li>
        </ul>
      </section>
    </div>
  );
}
