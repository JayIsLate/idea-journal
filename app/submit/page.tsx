"use client";

import { useState } from "react";

export default function SubmitPage() {
  const [transcription, setTranscription] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [result, setResult] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transcription.trim()) return;

    setStatus("submitting");
    setResult("");

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }

      const data = await res.json();
      setStatus("success");
      setResult(`"${data.title}" — ${data.ideas?.length ?? 0} ideas extracted`);
      setTranscription("");
    } catch (err: unknown) {
      setStatus("error");
      setResult(err instanceof Error ? err.message : "Something went wrong");
    }
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
        <textarea
          value={transcription}
          onChange={(e) => setTranscription(e.target.value)}
          placeholder="Paste your voice memo transcription here..."
          rows={12}
          autoFocus
          className="w-full text-sm font-sans bg-card border border-border rounded-xl px-4 py-3 text-text placeholder:text-secondary focus:outline-none focus:border-accent resize-y leading-relaxed"
        />

        <button
          type="submit"
          disabled={status === "submitting" || !transcription.trim()}
          className="w-full font-mono text-sm font-medium bg-accent text-white rounded-xl px-4 py-3.5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100"
        >
          {status === "submitting" ? "Processing..." : "Submit & Extract Ideas"}
        </button>
      </form>

      {status === "success" && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm font-mono text-green-700">{result}</p>
          <a href="/" className="text-sm font-mono text-accent mt-2 inline-block active:opacity-70">
            View in stream &rarr;
          </a>
        </div>
      )}

      {status === "error" && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-mono text-red-700">{result}</p>
        </div>
      )}
    </div>
  );
}
