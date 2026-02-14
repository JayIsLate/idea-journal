import Link from "next/link";
import { Entry } from "@/lib/types";

export default function EntryCard({ entry }: { entry: Entry }) {
  const date = new Date(entry.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const ideaCount = entry.ideas?.length ?? 0;

  return (
    <Link href={`/day/${entry.id}`}>
      <article className="bg-card border border-border rounded-xl p-4 sm:p-5 active:scale-[0.98] transition-all cursor-pointer">
        <div className="flex items-center justify-between mb-2">
          <span className="label">
            Day {entry.day_number} &middot; {formattedDate}
          </span>
          <span className="text-xs font-mono text-secondary">{entry.mood}</span>
        </div>
        <h2 className="font-mono text-base sm:text-lg font-semibold mb-2 leading-tight">
          {entry.title}
        </h2>
        <p className="text-sm text-secondary leading-relaxed mb-3">
          {entry.summary}
        </p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 flex-wrap min-w-0 overflow-hidden">
            {entry.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs font-mono text-secondary bg-bg px-2 py-0.5 rounded-md shrink-0"
              >
                #{tag}
              </span>
            ))}
          </div>
          <span className="text-xs font-mono text-accent shrink-0">
            {ideaCount} idea{ideaCount !== 1 ? "s" : ""}
          </span>
        </div>
      </article>
    </Link>
  );
}
