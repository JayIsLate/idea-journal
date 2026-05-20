"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import WritingEditor from "@/components/writing/WritingEditor";

export default function JournalWritePage() {
  const router = useRouter();
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = useMemo(() => {
    const plain = body.replace(/[#*_>`\-[\]()]/g, " ");
    const tokens = plain.split(/\s+/).filter(Boolean);
    return tokens.length;
  }, [body]);

  async function handleSubmit() {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcription: body,
          date: today,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Submit failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      const entry = await res.json();
      router.push(`/journal/${entry.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setSubmitting(false);
    }
  }

  return (
    <>
      <SiteNav activeSection="write" contextLabel={today} wordCount={wordCount} />

      <div className="w-full max-w-[1200px] mx-auto px-5 sm:px-10 pt-6 pb-24 md:pb-20">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-wider text-secondary">
            New Entry
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-secondary">
            {today}
          </span>
        </div>

        <div className="journal-prose notebook-grid -mx-2 px-2 rounded-md">
          <WritingEditor
            tabKey="journal-write"
            content=""
            onUpdate={setBody}
            placeholder="Start writing..."
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          {error && (
            <span className="font-mono text-[10px] text-red-600 truncate max-w-[240px]">
              {error}
            </span>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || !body.trim()}
            className="font-mono text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-md bg-text text-card hover:bg-accent transition-colors disabled:opacity-40 disabled:hover:bg-text"
          >
            {submitting ? "Submitting…" : "Submit →"}
          </button>
        </div>
      </div>
    </>
  );
}
