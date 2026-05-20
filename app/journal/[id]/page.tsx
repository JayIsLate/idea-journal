import SiteNav from "@/components/SiteNav";
import EntryView from "./EntryView";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import type { Entry, Idea } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import type { HighlightType } from "@/lib/writing-types";

interface StoredHighlight {
  id: string;
  type: HighlightType;
  matchText: string;
  comment: string;
  suggestedEdit?: string;
  view: "unabridged" | "abridged";
}

async function fetchEntry(
  id: string
): Promise<
  (Entry & { ideas: Idea[]; highlights: StoredHighlight[] }) | null
> {
  const supabase = getSupabase();
  const { data: entry } = await supabase
    .from("entries")
    .select("*")
    .eq("id", id)
    .single();
  if (!entry) return null;
  const { data: ideas } = await supabase
    .from("ideas")
    .select("*")
    .eq("entry_id", id);
  return {
    ...entry,
    ideas: ideas || [],
    highlights: (entry.highlights || []) as StoredHighlight[],
  };
}

export default async function JournalEntryPage({ params }: { params: { id: string } }) {
  const entry = await fetchEntry(params.id);
  if (!entry) notFound();

  const formattedDate = new Date(entry.date)
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();

  const contextLabel = `#${String(entry.day_number).padStart(3, "0")} — ${entry.date}`;

  return (
    <>
      <SiteNav activeSection="archive" contextLabel={contextLabel} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-secondary mb-4">
          <Link href="/journal" className="hover:text-text transition-colors">
            02 — ARCHIVE
          </Link>
          <span className="mx-2">›</span>
          <span>DAY {entry.day_number} · {formattedDate}</span>
        </div>

        <EntryView entry={entry} />
      </div>
    </>
  );
}
