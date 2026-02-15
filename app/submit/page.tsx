"use client";

import { useState } from "react";
import { useProcessing } from "@/lib/processing-context";

const PROMPTS = [
  "What would this look like if it were easy?",
  "Honor thy error as a hidden intention",
  "What would a child do?",
  "Remove the most important element",
  "The most boring idea is often the best",
  "What if this was the last thing you ever made?",
  "Do nothing for as long as possible",
  "Use an old idea",
  "What would your enemy do?",
  "Make it more rough",
  "Turn it upside down",
  "Go outside. Shut the door.",
  "Ask your body",
  "Only a part, not the whole",
  "Work at a different speed",
  "Emphasize the flaws",
  "What wouldn't you do?",
  "The first thing you thought of — do that",
  "Make a sudden, destructive, unpredictable action",
  "Look at the order in which you do things",
  "Change instrument roles",
  "What is the simplest version of this?",
  "Breathe more deeply",
  "Don't be afraid of things because they're easy to do",
  "Remember those quiet evenings",
  "What would you do if you had half the time?",
  "Be extravagant",
  "Abandon normal instruments",
  "What mistake could you make on purpose?",
  "Imagine you already finished. What does it look like?",
];

export default function SubmitPage() {
  const [transcription, setTranscription] = useState("");
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const { status, submit } = useProcessing();
  const [prompt, setPrompt] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transcription.trim() || status === "submitting") return;
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
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
            style={{ WebkitAppearance: "none", MozAppearance: "none", appearance: "none", boxSizing: "border-box" }}
            className="block w-full text-base font-mono bg-card border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-accent"
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

      {status === "submitting" && prompt && (
        <p className="text-sm text-text italic mt-6 text-center leading-relaxed">
          &ldquo;{prompt}&rdquo;
        </p>
      )}
    </div>
  );
}
