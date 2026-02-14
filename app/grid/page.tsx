"use client";

import { useEffect, useState, useCallback } from "react";
import GridTile from "@/components/GridTile";
import { Entry } from "@/lib/types";
import { useProcessing } from "@/lib/processing-context";

export default function GridPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { status } = useProcessing();

  const fetchEntries = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/entries", { cache: "no-store" });
      if (res.ok) {
        setEntries(await res.json());
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    if (status === "success") {
      fetchEntries();
    }
  }, [status, fetchEntries]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-mono text-xl sm:text-2xl font-bold">Grid</h1>
          <p className="text-sm text-secondary mt-1">
            Calendar view of all journal entries
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

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-secondary font-mono text-sm">No entries yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {entries.map((entry) => (
            <GridTile key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
