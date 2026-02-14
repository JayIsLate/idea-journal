import Link from "next/link";
import { Entry } from "@/lib/types";

const moodColors: Record<string, string> = {
  energized: "border-l-yellow-400",
  reflective: "border-l-blue-400",
  anxious: "border-l-red-400",
  excited: "border-l-orange-400",
  calm: "border-l-green-400",
  frustrated: "border-l-red-600",
  hopeful: "border-l-emerald-400",
  scattered: "border-l-purple-400",
};

export default function GridTile({ entry }: { entry: Entry }) {
  const date = new Date(entry.date);
  const dayStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const ideaCount = entry.ideas?.length ?? 0;
  const moodBorder = moodColors[entry.mood] || "border-l-gray-300";

  return (
    <Link href={`/day/${entry.id}`}>
      <div
        className={`bg-card border border-border border-l-4 ${moodBorder} rounded-xl p-3 active:scale-[0.97] transition-all cursor-pointer h-full`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-xs font-medium">Day {entry.day_number}</span>
          <span className="text-[11px] text-secondary">{dayStr}</span>
        </div>
        <p className="text-xs text-secondary truncate mb-2">{entry.title}</p>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-secondary">{entry.mood}</span>
          <span className="text-[11px] font-mono text-accent">
            {ideaCount} idea{ideaCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
