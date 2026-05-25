"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Editor } from "@tiptap/core";
import SiteNav from "@/components/SiteNav";
import WritingEditor from "@/components/writing/WritingEditor";

const DRAFT_STORAGE_KEY = "journal-write-draft-v1";

export default function JournalWritePage() {
  const router = useRouter();
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Resolve the initial content from localStorage BEFORE mounting WritingEditor.
  // The editor's own useEffect sets content from the `content` prop on first
  // mount and would overwrite anything we tried to restore via onEditorReady.
  // Keeping draftLoaded null until we've read localStorage lets us pass the
  // saved draft in as the editor's initial content, which the editor will then
  // apply via its normal content-init path.
  const [draftLoaded, setDraftLoaded] = useState<{ content: string } | null>(null);

  useEffect(() => {
    let initial = "";
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved && saved.trim()) initial = saved;
    } catch {
      /* localStorage may be disabled — fail silently */
    }
    setDraftLoaded({ content: initial });
    if (initial) setBody(initial);
  }, []);

  function handleEditorReady(editor: Editor) {
    editorRef.current = editor;
  }

  // Autosave to localStorage on body change (debounced 400ms).
  useEffect(() => {
    if (!body) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, body);
        setSavedAt(Date.now());
      } catch {
        /* quota or disabled — ignore */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [body]);

  // Click anywhere in the dot-grid area to focus the editor at the end —
  // but only when the editor isn't already focused. If you're mid-edit, clicks
  // on the wrapper padding shouldn't jump the cursor; they should be no-ops.
  function focusEditorOnEmptyClick(e: React.MouseEvent<HTMLDivElement>) {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.isFocused) return;
    const target = e.target as HTMLElement;
    const dom = editor.view.dom;
    if (dom === target || dom.contains(target)) return;
    editor.commands.focus("end");
  }

  // Lock body scroll on this page — the editor itself handles overflow internally.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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
      // Successful submit — clear the draft so the next visit is fresh.
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      router.push(`/journal/${entry.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setSubmitting(false);
    }
  }

  return (
    <>
      <SiteNav activeSection="write" contextLabel={today} wordCount={wordCount} submitting={submitting} />

      {/* Lock to exact viewport height. Subtract top nav (48px) and the layout's
          main padding-bottom (pb-20=80 on mobile, pb-12=48 on desktop). The mobile
          tab bar / desktop bottom bar sit within that padding-bottom region. */}
      <div className="flex flex-col h-[calc(100dvh-48px-80px)] md:h-[calc(100dvh-48px-48px)]">
        <div className="w-full max-w-[1200px] mx-auto px-5 sm:px-10 flex flex-col flex-1 min-h-0 pt-5 pb-4">
          <div className="mb-3 flex items-center justify-between gap-3 shrink-0">
            <span className="font-mono text-[9px] uppercase tracking-wider text-secondary">
              New Entry
            </span>
            <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-secondary">
              {savedAt && body.trim() && <span>Saved locally</span>}
              <span>{today}</span>
            </div>
          </div>

          <div
            onClick={focusEditorOnEmptyClick}
            className="journal-prose notebook-grid -mx-2 px-2 flex-1 min-h-0 overflow-y-auto cursor-text"
          >
            {draftLoaded && (
              <WritingEditor
                tabKey="journal-write"
                content={draftLoaded.content}
                onUpdate={setBody}
                placeholder="Start writing..."
                onEditorReady={handleEditorReady}
              />
            )}
          </div>

          <div className="h-16 flex items-center justify-center gap-3 shrink-0 relative">
            {error && (
              <span
                className="font-mono text-[10px] text-red-600 max-w-[400px] absolute right-0 leading-tight"
                title={error}
              >
                {error}
              </span>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || !body.trim()}
              className="font-mono text-[11px] uppercase tracking-wider px-5 py-2.5 rounded-md bg-text text-card hover:bg-accent transition-colors disabled:opacity-40 disabled:hover:bg-text"
            >
              {submitting ? "Submitting…" : "Submit →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
