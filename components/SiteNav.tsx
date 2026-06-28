"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type SectionKey =
  | "write"
  | "archive"
  | "ideas"
  | "synthesis"
  | "submit"
  | "stream"
  | "grid"
  | null;

export interface BottomBarStat {
  count: number;
  singular: string;
  plural?: string;
}

interface SiteNavProps {
  activeSection?: SectionKey;
  contextLabel?: string;
  wordCount?: number;
  stat?: BottomBarStat;
  submitting?: boolean;
}

const sections: { key: Exclude<SectionKey, null>; num: string; label: string; href: string }[] = [
  { key: "write", num: "01", label: "WRITE", href: "/journal/write" },
  { key: "archive", num: "02", label: "ARCHIVE", href: "/journal" },
  { key: "ideas", num: "03", label: "IDEAS", href: "/ideas" },
  { key: "synthesis", num: "04", label: "SYNTHESIS", href: "/journal/synthesis" },
];

const submitTab = { key: "submit" as const, num: "+", href: "/submit" };

export default function SiteNav({
  activeSection = null,
  contextLabel,
  wordCount,
  stat,
  submitting = false,
}: SiteNavProps) {
  // Back-compat: wordCount is a shortcut for the Write page's stat slot.
  const resolvedStat: BottomBarStat | undefined =
    stat ??
    (typeof wordCount === "number"
      ? { count: wordCount, singular: "word", plural: "words" }
      : undefined);
  const pathname = usePathname();

  const resolvedActive: SectionKey =
    activeSection ??
    (pathname === "/journal/write"
      ? "write"
      : pathname === "/journal" || pathname.startsWith("/journal/")
        ? pathname === "/journal/synthesis"
          ? "synthesis"
          : "archive"
        : pathname.startsWith("/ideas")
          ? "ideas"
          : pathname.startsWith("/submit")
            ? "submit"
            : pathname === "/"
              ? "stream"
              : pathname.startsWith("/grid")
                ? "grid"
                : null);

  return (
    <>
      {/* Desktop top bar */}
      <nav className="sticky top-0 z-40 hidden md:block border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between gap-6">
          <Link
            href="/journal"
            className="font-mono text-sm font-bold tracking-tight uppercase whitespace-nowrap"
          >
            IDEA LOG<span className="text-accent">·</span>
          </Link>

          <div className="flex items-center gap-5 flex-1">
            {sections.map((s) => {
              const isActive = resolvedActive === s.key;
              return (
                <Link
                  key={s.key}
                  href={s.href}
                  className={`font-mono text-[11px] uppercase tracking-wider transition-colors py-3 ${
                    isActive
                      ? "text-text border-b-2 border-accent -mb-px"
                      : "text-secondary hover:text-text"
                  }`}
                >
                  {s.num} — {s.label}
                </Link>
              );
            })}
            <Link
              href={submitTab.href}
              className={`font-mono text-[17px] leading-none transition-colors ${
                resolvedActive === "submit" ? "text-accent" : "text-secondary hover:text-text"
              }`}
              aria-label="Submit"
            >
              +
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {contextLabel ? (
              <span className="font-mono text-[11px] uppercase tracking-wider text-secondary whitespace-nowrap">
                {contextLabel}
              </span>
            ) : null}
            <AccountMenu />
          </div>
        </div>
      </nav>

      {/* Mobile top bar (wordmark only) */}
      <div className="md:hidden sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 h-12 flex items-center justify-between gap-3">
          <Link href="/journal" className="font-mono text-sm font-bold tracking-tight uppercase">
            IDEA LOG<span className="text-accent">·</span>
          </Link>
          <div className="flex items-center gap-3 min-w-0">
            {contextLabel ? (
              <span className="font-mono text-[10px] uppercase tracking-wider text-secondary truncate">
                {contextLabel}
              </span>
            ) : null}
            <AccountMenu />
          </div>
        </div>
      </div>

      {/* Desktop bottom bar — accent colored, centered clock + stat */}
      <DesktopBottomBar stat={resolvedStat} submitting={submitting} />

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed left-0 right-0 bottom-0 z-50 bg-card border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {submitting && <MobileSubmitProgress />}
        <div className="grid grid-cols-5 h-14">
          {sections.map((s) => {
            const isActive = resolvedActive === s.key;
            return (
              <Link
                key={s.key}
                href={s.href}
                className={`flex items-center justify-center font-mono text-[11px] tracking-wider transition-colors ${
                  isActive ? "text-accent border-t-2 border-accent -mt-px" : "text-secondary"
                }`}
              >
                {s.num}
              </Link>
            );
          })}
          <Link
            href={submitTab.href}
            className={`flex items-center justify-center font-mono text-base leading-none transition-colors ${
              resolvedActive === "submit" ? "text-accent border-t-2 border-accent -mt-px" : "text-secondary"
            }`}
            aria-label="Submit"
          >
            +
          </Link>
        </div>
      </nav>
    </>
  );
}

function DesktopBottomBar({ stat, submitting }: { stat?: BottomBarStat; submitting?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now
    ? now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "--:--:--";

  const statLabel = stat
    ? `${stat.count} ${stat.count === 1 ? stat.singular : stat.plural || stat.singular + "s"}`
    : null;

  return (
    <div
      className="hidden md:flex fixed bottom-0 left-0 right-0 z-40 h-10 bg-accent text-text items-center justify-center gap-4 px-6 font-mono text-[12px] uppercase tracking-wider font-medium overflow-hidden"
      suppressHydrationWarning
    >
      {submitting ? (
        <SubmitProgress />
      ) : (
        <>
          <span>{time}</span>
          {statLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span>{statLabel}</span>
            </>
          )}
        </>
      )}
    </div>
  );
}

// Submission progress: cycles through phase labels on a timer and shows
// elapsed seconds. The /api/submit endpoint doesn't stream phase events,
// so we approximate stages based on the typical Claude-call timings
// (title generation ~2-4s, idea extraction ~3-6s). The honest signal here
// is the elapsed counter and the animated stripe — those tell the user
// the request is still alive even when it takes 10s+.
const PHASES: { until: number; label: string }[] = [
  { until: 2.5, label: "Analyzing" },
  { until: 6, label: "Drawing themes" },
  { until: 11, label: "Extracting ideas" },
  { until: 18, label: "Finalizing" },
  { until: Infinity, label: "Hang tight" },
];

function SubmitProgress() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 200);
    return () => clearInterval(id);
  }, []);

  const phase = PHASES.find((p) => elapsed < p.until)?.label ?? "Submitting";
  const seconds = Math.floor(elapsed);

  return (
    <>
      {/* Animated stripe overlay across the full bar */}
      <span
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none submit-progress-stripes opacity-30"
      />
      <span className="relative">{phase}…</span>
      <span aria-hidden="true" className="relative">·</span>
      <span className="relative tabular-nums">{String(seconds).padStart(2, "0")}s</span>
    </>
  );
}

function MobileSubmitProgress() {
  return (
    <div
      aria-hidden="true"
      className="absolute -top-1 left-0 right-0 h-1 bg-accent/30 overflow-hidden"
    >
      <span className="block h-full submit-progress-stripes" />
    </div>
  );
}

// Account control: avatar/initial button that opens a small menu with a link
// to Settings and a sign-out action. Reads the user from the browser client so
// it works on every page that renders SiteNav without prop threading.
function AccountMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!user) return null;

  const name =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "";
  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card font-mono text-[11px] uppercase text-secondary hover:border-accent hover:text-accent transition-colors"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-44 rounded-xl border border-border bg-card shadow-lg py-1">
          <div className="px-3 py-2 border-b border-border">
            <p className="font-mono text-[11px] text-text truncate">{name}</p>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-secondary hover:text-text"
          >
            Settings
          </Link>
          <button
            onClick={signOut}
            className="block w-full text-left px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-secondary hover:text-accent"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
