"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ProcessingState = {
  status: "idle" | "submitting" | "success" | "error";
  result: string;
};

type ProcessingContextType = ProcessingState & {
  submit: (transcription: string) => void;
  reset: () => void;
};

const ProcessingContext = createContext<ProcessingContextType>({
  status: "idle",
  result: "",
  submit: () => {},
  reset: () => {},
});

export function ProcessingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProcessingState>({
    status: "idle",
    result: "",
  });

  const submit = useCallback((transcription: string) => {
    setState({ status: "submitting", result: "" });

    fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcription }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to submit");
        }
        return res.json();
      })
      .then((data) => {
        setState({
          status: "success",
          result: `"${data.title}" — ${data.ideas?.length ?? 0} ideas extracted`,
        });
      })
      .catch((err: unknown) => {
        setState({
          status: "error",
          result: err instanceof Error ? err.message : "Something went wrong",
        });
      });
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", result: "" });
  }, []);

  return (
    <ProcessingContext.Provider value={{ ...state, submit, reset }}>
      {children}
    </ProcessingContext.Provider>
  );
}

export function useProcessing() {
  return useContext(ProcessingContext);
}
