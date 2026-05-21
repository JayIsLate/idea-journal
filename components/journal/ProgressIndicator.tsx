"use client";

import { useEffect, useRef, useState } from "react";

interface Phase {
  until: number;
  label: string;
}

interface Props {
  phases: Phase[];
  className?: string;
}

// Visual progress indicator for long-running operations that don't stream
// real phase events. Cycles through a label timeline and shows elapsed
// seconds + an animated stripe pattern so the user knows the request
// hasn't hung. The .submit-progress-stripes class is defined in globals.css.
export default function ProgressIndicator({ phases, className = "" }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 200);
    return () => clearInterval(id);
  }, []);

  const phase = phases.find((p) => elapsed < p.until)?.label ?? "Working";
  const seconds = Math.floor(elapsed);

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-accent/40 bg-accent/10 h-9 flex items-center justify-center gap-3 font-mono text-[11px] uppercase tracking-wider text-accent ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none submit-progress-stripes opacity-25"
      />
      <span className="relative">{phase}…</span>
      <span aria-hidden="true" className="relative">·</span>
      <span className="relative tabular-nums">{String(seconds).padStart(2, "0")}s</span>
    </div>
  );
}
