"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type SectionKey =
  | "write"
  | "archive"
  | "ideas"
  | "synthesis"
  | "submit"
  | "stream"
  | "grid"
  | null;

interface SiteNavProps {
  activeSection?: SectionKey;
  contextLabel?: string;
  wordCount?: number;
}

const sections: { key: Exclude<SectionKey, null>; num: string; label: string; href: string }[] = [
  { key: "write", num: "01", label: "WRITE", href: "/journal/write" },
  { key: "archive", num: "02", label: "ARCHIVE", href: "/journal" },
  { key: "ideas", num: "03", label: "IDEAS", href: "/ideas" },
  { key: "synthesis", num: "04", label: "SYNTHESIS", href: "/journal/synthesis" },
];

const submitTab = { key: "submit" as const, num: "+", href: "/submit" };

export default function SiteNav({ activeSection = null, contextLabel, wordCount }: SiteNavProps) {
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

          {contextLabel ? (
            <span className="font-mono text-[11px] uppercase tracking-wider text-secondary whitespace-nowrap">
              {contextLabel}
            </span>
          ) : null}
        </div>
      </nav>

      {/* Mobile top bar (wordmark only) */}
      <div className="md:hidden sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 h-12 flex items-center justify-between gap-3">
          <Link href="/journal" className="font-mono text-sm font-bold tracking-tight uppercase">
            IDEA LOG<span className="text-accent">·</span>
          </Link>
          {contextLabel ? (
            <span className="font-mono text-[10px] uppercase tracking-wider text-secondary truncate">
              {contextLabel}
            </span>
          ) : null}
        </div>
      </div>

      {/* Desktop bottom bar — accent colored, centered clock + word count */}
      <DesktopBottomBar wordCount={wordCount} />

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed left-0 right-0 bottom-0 z-50 bg-card border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
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

function DesktopBottomBar({ wordCount }: { wordCount?: number }) {
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

  const wordsLabel =
    typeof wordCount === "number"
      ? `${wordCount} ${wordCount === 1 ? "word" : "words"}`
      : null;

  return (
    <div
      className="hidden md:flex fixed bottom-0 left-0 right-0 z-40 h-10 bg-accent text-text items-center justify-center gap-4 px-6 font-mono text-[12px] uppercase tracking-wider font-medium"
      suppressHydrationWarning
    >
      <span>{time}</span>
      {wordsLabel && (
        <>
          <span aria-hidden="true">·</span>
          <span>{wordsLabel}</span>
        </>
      )}
    </div>
  );
}
