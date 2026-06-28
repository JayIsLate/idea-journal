"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const SEEN_KEY = "idealog-entry-intro-seen";

// One-time explainer shown the first time a user opens an entry (i.e. right
// after their first submission). Explains the entry-view features. Gated by
// localStorage so it only ever appears once per browser.
export default function EntryIntro() {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const forced = searchParams.get("intro") === "1";

  useEffect(() => {
    // `?intro=1` always shows it (for previewing/re-reading); otherwise show
    // once per browser.
    if (forced) {
      setOpen(true);
      return;
    }
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      /* private mode / storage blocked — just don't show it */
    }
  }, [forced]);

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-text/40 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-6">
        <h2 className="font-mono text-lg font-bold tracking-tight uppercase mb-5">
          How this entry works<span className="text-accent">·</span>
        </h2>

        <ul className="space-y-4">
          <IntroItem label="Unabridged">
            Your entry exactly as you wrote it — the full, raw version.
          </IntroItem>
          <IntroItem label="Abridged">
            A tighter AI summary that pulls the key threads, tensions, and
            decisions out of a long entry so you can re-read it at a glance.
          </IntroItem>
          <IntroItem label="Ponder →">
            An AI reader that marks up your writing with inline annotations —
            questions to sit with, soft spots, things worth sharpening. Click any
            underlined passage to read the note and reply back and forth.
          </IntroItem>
          <IntroItem label="Ideas">
            Distinct ideas are pulled out of every entry automatically and
            collected in the side panel (and the IDEAS tab), so a thought you had
            once doesn&rsquo;t disappear.
          </IntroItem>
        </ul>

        <button
          onClick={dismiss}
          className="mt-6 w-full font-mono text-sm font-medium uppercase tracking-wider bg-accent text-white rounded-xl px-4 h-[48px] active:scale-[0.98] transition-all"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function IntroItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li>
      <p className="font-mono text-[11px] uppercase tracking-wider text-accent">
        {label}
      </p>
      <p className="text-sm text-text leading-relaxed mt-0.5">{children}</p>
    </li>
  );
}
