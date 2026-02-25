"use client";

import { useEffect, useRef } from "react";
import type { Highlight } from "@/lib/writing-types";
import { HIGHLIGHT_LABELS } from "@/lib/writing-types";

const TYPE_PILL_COLORS: Record<string, string> = {
  question: "bg-blue-100 text-blue-700",
  suggestion: "bg-emerald-100 text-emerald-700",
  edit: "bg-amber-100 text-amber-700",
  voice: "bg-purple-100 text-purple-700",
  weakness: "bg-red-100 text-red-700",
  evidence: "bg-cyan-100 text-cyan-700",
  wordiness: "bg-orange-100 text-orange-700",
  factcheck: "bg-pink-100 text-pink-700",
};

interface HighlightPopoverProps {
  highlight: Highlight;
  position: { x: number; y: number };
  onAccept: (highlight: Highlight) => void;
  onDismiss: (highlightId: string) => void;
  onReply: (highlight: Highlight) => void;
  onClose: () => void;
}

export default function HighlightPopover({
  highlight,
  position,
  onAccept,
  onDismiss,
  onReply,
  onClose,
}: HighlightPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const hasEdit =
    highlight.type === "edit" || highlight.type === "wordiness";
  const pillColor = TYPE_PILL_COLORS[highlight.type] || "bg-gray-100 text-gray-700";

  // Clamp position to viewport
  const left = Math.min(position.x, window.innerWidth - 320);
  const top = Math.min(position.y, window.innerHeight - 200);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-card border border-border rounded-lg shadow-lg p-3 w-[300px]"
      style={{ left, top }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full ${pillColor}`}
        >
          {HIGHLIGHT_LABELS[highlight.type]}
        </span>
      </div>

      <p className="text-sm text-secondary leading-relaxed mb-3">
        {highlight.comment}
      </p>

      {hasEdit && highlight.suggestedEdit && (
        <div className="mb-3 p-2 bg-bg rounded text-sm font-mono">
          <span className="text-secondary line-through">{highlight.matchText}</span>
          <span className="mx-1 text-secondary">&rarr;</span>
          <span className="text-emerald-600">{highlight.suggestedEdit}</span>
        </div>
      )}

      <div className="flex gap-2">
        {hasEdit && highlight.suggestedEdit ? (
          <button
            onClick={() => onAccept(highlight)}
            className="text-xs font-mono font-medium px-2.5 py-1 rounded bg-accent/10 text-accent active:opacity-70"
          >
            Accept
          </button>
        ) : (
          <button
            onClick={() => onReply(highlight)}
            className="text-xs font-mono font-medium px-2.5 py-1 rounded bg-accent/10 text-accent active:opacity-70"
          >
            Reply
          </button>
        )}
        <button
          onClick={() => onDismiss(highlight.id)}
          className="text-xs font-mono text-secondary px-2.5 py-1 rounded hover:bg-bg active:opacity-70"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
