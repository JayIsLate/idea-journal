"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import type { HighlightType } from "@/lib/writing-types";

interface StoredHighlight {
  id: string;
  type: HighlightType;
  matchText: string;
  comment: string;
  suggestedEdit?: string;
  view: "unabridged" | "abridged";
  conversation?: { role: "user" | "assistant"; content: string; timestamp?: string }[];
}

export interface HermesPanelHandle {
  runFeedback: () => void;
}

interface Props {
  entryId: string;
  content: string;
  view: "unabridged" | "abridged";
  onHighlightsReceived: (highlights: StoredHighlight[]) => void;
  onHighlightAppended: (highlight: StoredHighlight) => void;
  onLoadingChange: (loading: boolean) => void;
}

const HermesEntryPanel = forwardRef<HermesPanelHandle, Props>(function HermesEntryPanel(
  { entryId, content, view, onHighlightsReceived, onHighlightAppended, onLoadingChange },
  ref
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runFeedback() {
    if (loading) return;
    setLoading(true);
    onLoadingChange(true);
    setError(null);
    const received: StoredHighlight[] = [];

    try {
      const res = await fetch("/api/journal/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, content, view }),
      });
      if (!res.body) {
        setError("No stream");
        setLoading(false);
        onLoadingChange(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
              | { type: "highlight"; highlight: StoredHighlight }
              | { type: "error"; message: string };
            if (parsed.type === "highlight") {
              received.push(parsed.highlight);
              onHighlightAppended(parsed.highlight);
            } else if (parsed.type === "error") {
              setError(parsed.message);
            }
          } catch {
            /* ignore */
          }
        }
      }
      onHighlightsReceived(received);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
      onLoadingChange(false);
    }
  }

  useImperativeHandle(ref, () => ({ runFeedback }), [loading]);

  if (!error) return null;

  return (
    <div className="mt-6">
      <p className="font-mono text-[11px] text-red-600">{error}</p>
    </div>
  );
});

export default HermesEntryPanel;
