"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import type { Idea } from "@/lib/types";
import type {
  IdeaWriting,
  PageKey,
  Pages,
  Highlight,
} from "@/lib/writing-types";
import { DEFAULT_PAGES, PAGE_KEYS } from "@/lib/writing-types";
import WritingEditor from "@/components/writing/WritingEditor";
import PageTabs from "@/components/writing/PageTabs";
import HighlightPopover from "@/components/writing/HighlightPopover";
import ChatWindow from "@/components/writing/ChatWindow";
import { useAutoSave } from "@/lib/use-auto-save";
import { createHighlightPlugin } from "@/components/writing/extensions/highlight-decoration";
import { createFocusModePlugin } from "@/components/writing/extensions/focus-mode";
import type { Editor } from "@tiptap/core";

/** Build initial summary markdown from idea data */
function buildSummary(idea: Idea): string {
  const lines: string[] = [];
  lines.push(`# ${idea.title}`);
  lines.push("");
  lines.push(idea.description);

  if (idea.action_items.length > 0) {
    lines.push("");
    lines.push("## Action Items");
    lines.push("");
    for (const item of idea.action_items) {
      lines.push(`- ${item}`);
    }
  }

  if (idea.ai_suggestions.length > 0) {
    lines.push("");
    lines.push("## AI Suggestions");
    lines.push("");
    for (const s of idea.ai_suggestions) {
      lines.push(`- ${s}`);
    }
  }

  return lines.join("\n");
}

export default function WritePage() {
  const params = useParams();
  const ideaId = params.id as string;

  const [idea, setIdea] = useState<Idea | null>(null);
  const [writing, setWriting] = useState<IdeaWriting | null>(null);
  const [pages, setPages] = useState<Pages>(DEFAULT_PAGES);
  const [activeKey, setActiveKey] = useState<PageKey>("summary");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Highlights
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(
    null
  );
  const [highlightPos, setHighlightPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPrefill, setChatPrefill] = useState<string | undefined>(undefined);

  // Focus mode
  const [focusMode, setFocusMode] = useState(false);
  const focusModeRef = useRef(focusMode);
  focusModeRef.current = focusMode;

  // Editor reference
  const editorRef = useRef<Editor | null>(null);

  // Word count
  const [wordCount, setWordCount] = useState(0);

  // Refs for plugins
  const highlightsForPluginRef = useRef<Highlight[]>([]);
  const highlightClickRef = useRef<
    ((highlightId: string, rect: DOMRect) => void) | undefined
  >(undefined);

  const activeKeyRef = useRef(activeKey);
  activeKeyRef.current = activeKey;
  useEffect(() => {
    highlightsForPluginRef.current = highlights.filter(
      (h) => h.pageKey === activeKeyRef.current
    );
    if (editorRef.current) {
      const { tr } = editorRef.current.view.state;
      editorRef.current.view.dispatch(tr);
    }
  }, [highlights, activeKey]);

  useEffect(() => {
    highlightClickRef.current = (highlightId: string, rect: DOMRect) => {
      const hl = highlights.find((h) => h.id === highlightId);
      if (hl) {
        setActiveHighlight(hl);
        setHighlightPos({ x: rect.left, y: rect.bottom + 8 });
      }
    };
  }, [highlights]);

  const plugins = useMemo(
    () => [
      createHighlightPlugin(highlightsForPluginRef, highlightClickRef),
      createFocusModePlugin(focusModeRef),
    ],
    []
  );

  const handleEditorReady = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      const { state } = editor.view;
      const newState = state.reconfigure({
        plugins: [...state.plugins, ...plugins],
      });
      editor.view.updateState(newState);
    },
    [plugins]
  );

  // Auto-save
  const { saving, lastSaved } = useAutoSave({
    ideaId,
    pages,
    activeKey,
    wordCount,
  });

  // Load idea and writing data
  useEffect(() => {
    async function load() {
      try {
        const entriesRes = await fetch("/api/entries");
        if (!entriesRes.ok) throw new Error("Failed to load entries");
        const entries = await entriesRes.json();
        const allIdeas: Idea[] = entries.flatMap(
          (e: { ideas?: Idea[] }) => e.ideas || []
        );
        const found = allIdeas.find((i: Idea) => i.id === ideaId);
        if (!found) throw new Error("Idea not found");
        setIdea(found);

        const writingRes = await fetch(`/api/writing/${ideaId}`);
        if (!writingRes.ok) throw new Error("Failed to load writing");
        const writingData: IdeaWriting = await writingRes.json();
        setWriting(writingData);

        // If summary page is empty, pre-populate with idea data
        const loadedPages = writingData.pages;
        if (!loadedPages.summary?.trim()) {
          loadedPages.summary = buildSummary(found);
        }

        setPages(loadedPages);
        setActiveKey(writingData.active_page as PageKey);
        setHighlights(writingData.highlights || []);
        setWordCount(writingData.word_count || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ideaId]);

  // Handle editor content updates
  const handleUpdate = useCallback(
    (markdown: string) => {
      setPages((prev) => ({ ...prev, [activeKey]: markdown }));
      const allContent = PAGE_KEYS.map((k) =>
        k === activeKey ? markdown : pages[k]
      ).join(" ");
      const count = allContent
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length;
      setWordCount(count);
    },
    [activeKey, pages]
  );

  // Handle tab switch
  const handleTabChange = useCallback((key: PageKey) => {
    setActiveKey(key);
    setActiveHighlight(null);
    setHighlightPos(null);
  }, []);

  // Image drop handler for reference tab
  const handleImageDrop = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/writing/${ideaId}/upload`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.url;
      } catch {
        return null;
      }
    },
    [ideaId]
  );

  // Get AI feedback
  const handleGetFeedback = useCallback(async () => {
    const content = pages[activeKey];
    if (!content.trim()) return;

    setFeedbackLoading(true);
    setActiveHighlight(null);
    setHighlightPos(null);

    try {
      const res = await fetch(`/api/writing/${ideaId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          pageKey: activeKey,
          summaryContent: activeKey === "develop" ? pages.summary : undefined,
        }),
      });

      if (!res.ok) throw new Error("Feedback request failed");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const newHighlights: Highlight[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "highlight") {
                newHighlights.push(parsed.highlight);
                setHighlights((prev) => [
                  ...prev.filter((h) => h.pageKey !== activeKey),
                  ...newHighlights,
                ]);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (err) {
      console.error("Feedback error:", err);
    } finally {
      setFeedbackLoading(false);
    }
  }, [pages, activeKey, ideaId]);

  // Accept a highlight edit
  const handleAcceptEdit = useCallback((highlight: Highlight) => {
    if (!editorRef.current || !highlight.suggestedEdit) return;
    const editor = editorRef.current;
    const text = editor.view.state.doc.textContent;
    const index = text.indexOf(highlight.matchText);
    if (index === -1) return;

    editor
      .chain()
      .focus()
      .setTextSelection({
        from: index + 1,
        to: index + 1 + highlight.matchText.length,
      })
      .insertContent(highlight.suggestedEdit)
      .run();

    setHighlights((prev) => prev.filter((h) => h.id !== highlight.id));
    setActiveHighlight(null);
    setHighlightPos(null);
  }, []);

  // Dismiss a highlight
  const handleDismissHighlight = useCallback((highlightId: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    setActiveHighlight(null);
    setHighlightPos(null);
  }, []);

  // Reply to highlight in chat
  const handleReplyHighlight = useCallback((highlight: Highlight) => {
    const prefill = `Re: "${highlight.matchText}"\n\nFeedback was: ${highlight.comment}\n\n`;
    setChatPrefill(prefill);
    setChatOpen(true);
    setActiveHighlight(null);
    setHighlightPos(null);
  }, []);

  // Markdown export
  const handleExport = useCallback(() => {
    const content = pages[activeKey];
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${idea?.title || "writing"}-${activeKey}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pages, activeKey, idea]);

  // Keyboard shortcut for focus mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault();
        setFocusMode((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm font-mono text-secondary">Loading...</p>
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-mono text-secondary mb-4">
            {error || "Idea not found"}
          </p>
          <a
            href="/ideas"
            className="text-sm font-mono text-accent active:opacity-70"
          >
            &larr; Back to ideas
          </a>
        </div>
      </div>
    );
  }

  const placeholders: Record<PageKey, string> = {
    summary: "Your idea summary and Claude's notes...",
    develop: "Go deeper — expand on this idea...",
    reference: "Drop images, links, notes — anything useful...",
  };

  return (
    <div className={`min-h-screen bg-bg ${focusMode ? "focus-mode" : ""}`}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-bg/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <a
                href="/ideas"
                className="text-sm font-mono text-secondary hover:text-accent shrink-0"
              >
                &larr;
              </a>
              <h1 className="font-mono text-sm font-semibold truncate">
                {idea.title}
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-xs font-mono text-secondary">
                {wordCount} {wordCount === 1 ? "word" : "words"}
              </span>
              <span className="hidden sm:inline text-xs font-mono text-secondary">
                {saving ? "Saving..." : lastSaved ? "Saved" : ""}
              </span>
              <button
                onClick={handleExport}
                className="hidden sm:inline-block text-xs font-mono text-secondary hover:text-accent px-1.5 py-0.5"
                title="Export as markdown"
              >
                .md
              </button>
              <button
                onClick={() => setFocusMode(!focusMode)}
                className={`hidden sm:inline-block text-xs font-mono px-1.5 py-0.5 rounded ${focusMode ? "bg-accent/10 text-accent" : "text-secondary hover:text-accent"}`}
                title="Focus mode (⌘⇧F)"
              >
                focus
              </button>
              <button
                onClick={handleGetFeedback}
                disabled={feedbackLoading || !pages[activeKey].trim()}
                className="text-xs font-mono font-medium px-2.5 py-1 rounded bg-accent/10 text-accent active:opacity-70 transition-opacity disabled:opacity-40"
              >
                {feedbackLoading ? "..." : "Feedback"}
              </button>
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className={`text-xs font-mono px-2.5 py-1 rounded ${chatOpen ? "bg-accent text-white" : "bg-accent/10 text-accent"} active:opacity-70 transition-opacity`}
              >
                Chat
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4">
          <PageTabs
            activeKey={activeKey}
            pages={pages}
            onChange={handleTabChange}
          />
        </div>
      </div>

      {/* Editor + Chat layout */}
      <div className="flex max-w-6xl mx-auto">
        {/* Summary notes panel — visible on Develop tab */}
        {activeKey === "develop" && pages.summary.trim() && (
          <div className="w-72 shrink-0 border-r border-border bg-card/50 hidden lg:block">
            <div className="sticky top-[105px] max-h-[calc(100vh-120px)] overflow-y-auto">
              <div className="px-4 py-4">
                <p className="label mb-3">Summary Notes</p>
                <div className="prose-summary text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                  {pages.summary}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Editor area */}
        <div
          className={`flex-1 min-w-0 transition-all ${chatOpen ? "max-w-4xl mx-auto md:max-w-3xl md:mx-0" : "max-w-4xl mx-auto"}`}
        >
          <div className="px-4 py-6">
            <WritingEditor
              tabKey={activeKey}
              content={pages[activeKey]}
              onUpdate={handleUpdate}
              placeholder={placeholders[activeKey]}
              onEditorReady={handleEditorReady}
              enableImages={activeKey === "reference"}
              onImageDrop={handleImageDrop}
            />
          </div>
          {/* Tags — fixed below editor on summary tab */}
          {activeKey === "summary" && idea.tags.length > 0 && (
            <div className="px-4 pb-6 pt-2 border-t border-border mx-4">
              <div className="flex gap-1.5 flex-wrap">
                {idea.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-mono text-secondary bg-bg px-1.5 py-0.5 rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <ChatWindow
            ideaId={ideaId}
            idea={idea}
            currentContent={pages[activeKey]}
            summaryContent={activeKey === "develop" ? pages.summary : undefined}
            prefillMessage={chatPrefill}
            onClose={() => {
              setChatOpen(false);
              setChatPrefill(undefined);
            }}
          />
        )}
      </div>

      {/* Highlight popover */}
      {activeHighlight && highlightPos && (
        <HighlightPopover
          highlight={activeHighlight}
          position={highlightPos}
          onAccept={handleAcceptEdit}
          onDismiss={handleDismissHighlight}
          onReply={handleReplyHighlight}
          onClose={() => {
            setActiveHighlight(null);
            setHighlightPos(null);
          }}
        />
      )}
    </div>
  );
}
