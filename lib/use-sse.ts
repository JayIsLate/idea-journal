"use client";

import { useState, useCallback, useRef } from "react";

interface SSEEvent {
  event: string;
  data: string;
}

interface UseSSEOptions {
  onEvent?: (event: SSEEvent) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}

interface UseSSEReturn {
  trigger: (url: string, body: unknown) => Promise<void>;
  loading: boolean;
  error: Error | null;
  abort: () => void;
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const trigger = useCallback(
    async (url: string, body: unknown) => {
      // Abort any existing request
      if (abortRef.current) abortRef.current.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }

        if (!res.body) {
          throw new Error("No response body");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "message";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                options.onDone?.();
                continue;
              }
              options.onEvent?.({ event: currentEvent, data });
              currentEvent = "message";
            }
          }
        }

        options.onDone?.();
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err);
          options.onError?.(err);
        }
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [options]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { trigger, loading, error, abort };
}
