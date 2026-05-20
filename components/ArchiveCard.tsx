import Link from "next/link";
import { Entry } from "@/lib/types";

export default function ArchiveCard({ entry }: { entry: Entry }) {
  const date = new Date(entry.date);
  const formattedDate = date
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();

  const ideaCount = entry.ideas?.length ?? 0;

  return (
    <Link href={`/journal/${entry.id}`} className="block group">
      <article className="bg-card/85 backdrop-blur-[1px] border border-border hover:border-text/40 transition-colors p-4 sm:px-5 sm:py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-secondary">
            <span className="text-accent">#{String(entry.day_number).padStart(3, "0")}</span>
            <span className="mx-2">·</span>
            {formattedDate}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-secondary">
            {entry.mood}
          </span>
        </div>
        <h2 className="font-mono text-[15px] sm:text-base font-bold mb-1.5 leading-snug">
          {entry.title}
        </h2>
        <p className="font-sans text-[13px] text-secondary leading-snug mb-3 line-clamp-2">
          {entry.summary}
        </p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 flex-wrap min-w-0 overflow-hidden">
            {entry.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="font-mono text-[10px] text-secondary border border-border px-1.5 py-0.5 shrink-0"
              >
                #{tag}
              </span>
            ))}
          </div>
          {ideaCount > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-accent shrink-0">
              {ideaCount} idea{ideaCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}
