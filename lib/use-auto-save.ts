"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Pages, PageKey } from "./writing-types";

interface UseAutoSaveOptions {
  ideaId: string;
  pages: Pages;
  activeKey: PageKey;
  wordCount: number;
}

interface UseAutoSaveReturn {
  saving: boolean;
  lastSaved: Date | null;
  error: string | null;
}

export function useAutoSave({
  ideaId,
  pages,
  activeKey,
  wordCount,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const localTimerRef = useRef<NodeJS.Timeout | null>(null);
  const remoteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pagesRef = useRef(pages);
  const activeKeyRef = useRef(activeKey);
  const wordCountRef = useRef(wordCount);

  pagesRef.current = pages;
  activeKeyRef.current = activeKey;
  wordCountRef.current = wordCount;

  // Save to localStorage (fast, 500ms debounce)
  const saveLocal = useCallback(() => {
    try {
      localStorage.setItem(
        `writing-${ideaId}`,
        JSON.stringify({
          pages: pagesRef.current,
          activeKey: activeKeyRef.current,
          wordCount: wordCountRef.current,
          timestamp: Date.now(),
        })
      );
    } catch {
      // localStorage might be full
    }
  }, [ideaId]);

  // Save to Supabase (slower, 2000ms debounce)
  const saveRemote = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/writing/${ideaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: pagesRef.current,
          active_page: activeKeyRef.current,
          word_count: wordCountRef.current,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setLastSaved(new Date());
      // Clear localStorage on successful remote save
      localStorage.removeItem(`writing-${ideaId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [ideaId]);

  // Debounced saves on content change
  useEffect(() => {
    if (localTimerRef.current) clearTimeout(localTimerRef.current);
    if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);

    localTimerRef.current = setTimeout(saveLocal, 500);
    remoteTimerRef.current = setTimeout(saveRemote, 2000);

    return () => {
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
      if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
    };
  }, [pages, activeKey, wordCount, saveLocal, saveRemote]);

  // On mount: check localStorage for unsaved changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`writing-${ideaId}`);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      // If localStorage data is newer than what we loaded, it means there were unsaved changes
      // The parent component will load from API first, and this would override only if needed
      // For now, just clean up stale data after successful mount
    } catch {
      // Ignore parse errors
    }
  }, [ideaId]);

  return { saving, lastSaved, error };
}
