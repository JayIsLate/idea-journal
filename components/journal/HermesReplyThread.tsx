"use client";

import { useEffect, useRef, useState } from "react";
import type { HighlightType } from "@/lib/writing-types";

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

const TYPE_BADGE: Record<string, string> = {
  question: "bg-blue-100 text-blue-700",
  suggestion: "bg-emerald-100 text-emerald-700",
  edit: "bg-amber-100 text-amber-700",
  voice: "bg-purple-100 text-purple-700",
  weakness: "bg-red-100 text-red-700",
  evidence: "bg-cyan-100 text-cyan-700",
  wordiness: "bg-orange-100 text-orange-700",
  factcheck: "bg-pink-100 text-pink-700",
};

interface Props {
  entryId: string;
  highlight: StoredHighlight;
  onClose: () => void;
  onConversationUpdate: (
    highlightId: string,
    conversation: ConversationMessage[]
  ) => void;
}

export default function HermesReplyThread({
  entryId,
  highlight,
  onClose,
  onConversationUpdate,
}: Props) {
  const [messages, setMessages] = useState<ConversationMessage[]>(
    highlight.conversation || []
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync local conversation if the prop changes (e.g. another highlight opened)
  useEffect(() => {
    setMessages(highlight.conversation || []);
  }, [highlight.id, highlight.conversation]);

  useEffect(() => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    inputRef.current?.focus();
  }, [highlight.id]);

  async function submit() {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    const userMsg: ConversationMessage = { role: "user", content: trimmed };
    const placeholder: ConversationMessage = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    setInput("");
    setStreaming(true);
    setError(null);

    try {
      const res = await fetch("/api/journal/feedback/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId,
          highlightId: highlight.id,
          message: trimmed,
        }),
      });
      if (!res.body) {
        setError("No stream");
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!chunk.startsWith("data:")) continue;
          const data = chunk.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as
              | { type: "delta"; text: string }
              | { type: "error"; message: string };
            if (parsed.type === "delta") {
              assistantText += parsed.text;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  role: "assistant",
                  content: assistantText,
                };
                return next;
              });
            } else if (parsed.type === "error") {
              setError(parsed.message);
            }
          } catch {
            /* ignore */
          }
        }
      }

      const finalConversation: ConversationMessage[] = [
        ...(highlight.conversation || []),
        userMsg,
        { role: "assistant", content: assistantText },
      ];
      onConversationUpdate(highlight.id, finalConversation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reply failed");
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  }

  const badge = TYPE_BADGE[highlight.type] || "bg-gray-100 text-gray-700";

  return (
    <section
      ref={sectionRef}
      className="mt-10 pt-6 border-t border-border"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[9px] uppercase tracking-wider text-secondary">
          Conversation
        </span>
        <button
          onClick={onClose}
          className="font-mono text-[10px] uppercase tracking-wider text-secondary hover:text-accent transition-colors"
        >
          Close ×
        </button>
      </div>

      {/* Anchor: the original passage + Hermes' first remark */}
      <div className="mb-5 p-3 border border-border rounded bg-card/60">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full ${badge}`}
          >
            {highlight.type}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-secondary">
            on: <span className="text-text italic">“{highlight.matchText.slice(0, 80)}{highlight.matchText.length > 80 ? "…" : ""}”</span>
          </span>
        </div>
        <p className="text-sm leading-relaxed text-text">{highlight.comment}</p>
      </div>

      {/* Threaded messages */}
      <div className="space-y-4 mb-5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "pl-4 border-l-2 border-accent"
                : "pl-4 border-l-2 border-border"
            }
          >
            <div className="font-mono text-[9px] uppercase tracking-wider text-secondary mb-1">
              {m.role === "user" ? "You" : "Hermes"}
            </div>
            <p className="text-sm leading-relaxed text-text whitespace-pre-wrap">
              {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <p className="font-mono text-[11px] text-red-600 mb-3">{error}</p>
      )}

      <div className="flex flex-col gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Reply… (⌘+Enter to send)"
          rows={3}
          disabled={streaming}
          className="w-full font-sans text-sm leading-relaxed border border-border rounded p-3 focus:outline-none focus:border-accent bg-card disabled:opacity-60 resize-y"
        />
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={streaming || !input.trim()}
            className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded bg-accent text-card hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {streaming ? "Sending…" : "Send →"}
          </button>
        </div>
      </div>
    </section>
  );
}
