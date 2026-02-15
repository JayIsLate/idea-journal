"use client";

import { useState } from "react";
import { useProcessing } from "@/lib/processing-context";

export default function SubmitPage() {
  const [transcription, setTranscription] = useState("");
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const { status, submit } = useProcessing();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transcription.trim() || status === "submitting") return;
    submit(transcription, date);
    setTranscription("");
  }

  return (
    <div className="max-w-stream mx-auto px-4 sm:px-6 pb-12">
      <div className="mb-5">
        <h1 className="font-mono text-xl sm:text-2xl font-bold">Submit</h1>
        <p className="text-sm text-secondary mt-1">
          Paste a voice memo transcription to process
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono text-secondary mb-1.5">
            Voice memo date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-base font-mono bg-card border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-accent"
          />
        </div>

        <textarea
          value={transcription}
          onChange={(e) => setTranscription(e.target.value)}
          placeholder="Paste your voice memo transcription here..."
          rows={12}
          autoFocus
          className="w-full text-base font-sans bg-card border border-border rounded-xl px-4 py-3 text-text placeholder:text-secondary focus:outline-none focus:border-accent resize-y leading-relaxed"
        />

        <button
          type="submit"
          disabled={status === "submitting" || !transcription.trim()}
          className="w-full font-mono text-sm font-medium bg-accent text-white rounded-xl px-4 py-3.5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100"
        >
          {status === "submitting" ? "Processing..." : "Extract Ideas"}
        </button>
      </form>

      {status === "submitting" && (
        <p className="text-sm text-secondary font-mono mt-4 text-center">
          You can navigate away — processing continues in the background.
        </p>
      )}
    </div>
  );
}
