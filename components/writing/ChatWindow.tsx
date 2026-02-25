"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Idea } from "@/lib/types";
import type { ChatMessage } from "@/lib/writing-types";

/** Render basic markdown to HTML for chat messages */
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<strong class="text-text text-xs uppercase tracking-wide">$1</strong>')
    .replace(/^## (.+)$/gm, '<strong class="text-text">$1</strong>')
    .replace(/^# (.+)$/gm, '<strong class="text-text text-base">$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-text">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, '<span class="block pl-3">- $1</span>')
    .replace(/\n/g, "<br />");
}

interface ChatWindowProps {
  ideaId: string;
  idea: Idea;
  currentContent: string;
  summaryContent?: string;
  prefillMessage?: string;
  onClose: () => void;
}

export default function ChatWindow({
  ideaId,
  idea,
  currentContent,
  summaryContent,
  prefillMessage,
  onClose,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversation history
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/writing/${ideaId}/chat`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch {
        // Start fresh if load fails
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [ideaId]);

  // Prefill input when a highlight reply is triggered
  useEffect(() => {
    if (prefillMessage) {
      setInput(prefillMessage);
      inputRef.current?.focus();
    }
  }, [prefillMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);

    // Add empty assistant message for streaming
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const res = await fetch(`/api/writing/${ideaId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          currentContent,
          summaryContent,
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

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
              if (parsed.type === "text") {
                accumulated += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: accumulated,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      // Remove empty assistant message on error
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, ideaId, currentContent]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-[calc(100vh-120px)] sticky top-[120px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-xs font-mono font-medium">Chat</span>
        <button
          onClick={onClose}
          className="text-secondary hover:text-text text-xs font-mono"
        >
          &times;
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <p className="text-xs font-mono text-secondary">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-secondary leading-relaxed">
            Ask questions about your writing, get suggestions, or discuss your
            ideas with AI.
          </p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`text-sm leading-relaxed ${
                msg.role === "user"
                  ? "text-text"
                  : "text-secondary"
              }`}
            >
              <span className="text-xs font-mono text-secondary/60 block mb-0.5">
                {msg.role === "user" ? "you" : "ai"}
              </span>
              {msg.role === "assistant" ? (
                <div
                  className="leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(msg.content),
                  }}
                />
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your writing..."
            rows={2}
            className="flex-1 text-sm bg-bg border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-accent"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            className="self-end text-xs font-mono font-medium px-3 py-2 rounded-lg bg-accent text-white active:opacity-70 disabled:opacity-40"
          >
            {streaming ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
