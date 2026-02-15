"use client";

import { useEffect, useState, useCallback } from "react";
import EntryCard from "@/components/EntryCard";
import { Entry } from "@/lib/types";
import { useProcessing } from "@/lib/processing-context";

export default function HomePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const { status } = useProcessing();

  const fetchEntries = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/entries?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Fetch failed (${res.status})`);
        return;
      }
      setEntries(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Refetch when processing completes
  useEffect(() => {
    if (status === "success") {
      fetchEntries();
    }
  }, [status, fetchEntries]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-mono text-xl sm:text-2xl font-bold">Stream</h1>
          <p className="text-sm text-secondary mt-1">
            Morning voice memos, processed and archived
          </p>
        </div>
        <button
          onClick={() => fetchEntries(true)}
          disabled={refreshing}
          className={`text-sm font-mono text-secondary px-3 py-2 rounded-lg active:bg-bg transition-all ${
            refreshing ? "animate-spin" : ""
          }`}
        >
          {refreshing ? "..." : "↻"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-mono text-red-600">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-36 bg-border rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-secondary font-mono text-sm">
            No entries yet. Submit a transcription to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
