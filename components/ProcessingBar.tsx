"use client";

import { useProcessing } from "@/lib/processing-context";
import Link from "next/link";

export default function ProcessingBar() {
  const { status, result, reset } = useProcessing();

  if (status === "idle") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      {status === "submitting" && (
        <div className="bg-card border-t border-border px-4 py-3">
          <div className="max-w-stream mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <p className="text-sm font-mono text-text">Processing transcription...</p>
            </div>
            <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full animate-progress" />
            </div>
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="bg-green-50 border-t border-green-200 px-4 py-3">
          <div className="max-w-stream mx-auto flex items-center justify-between gap-3">
            <p className="text-sm font-mono text-green-700 truncate">{result}</p>
            <div className="flex gap-3 shrink-0">
              <Link
                href="/"
                onClick={reset}
                className="text-sm font-mono text-accent active:opacity-70"
              >
                View
              </Link>
              <button
                onClick={reset}
                className="text-sm font-mono text-secondary active:opacity-70"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="bg-red-50 border-t border-red-200 px-4 py-3">
          <div className="max-w-stream mx-auto flex items-center justify-between gap-3">
            <p className="text-sm font-mono text-red-700 truncate">{result}</p>
            <button
              onClick={reset}
              className="text-sm font-mono text-secondary active:opacity-70 shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
