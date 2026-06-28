import SiteNav from "@/components/SiteNav";
import ArchiveCard from "@/components/ArchiveCard";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Entry, Idea } from "@/lib/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function fetchArchiveEntries(): Promise<Entry[]> {
  const supabase = getServerSupabase();
  const { data: entries } = await supabase
    .from("entries")
    .select("*")
    .order("day_number", { ascending: false });
  const { data: ideas } = await supabase.from("ideas").select("*");

  return (entries || []).map((entry) => ({
    ...entry,
    ideas: (ideas || []).filter((idea: Idea) => idea.entry_id === entry.id),
  }));
}

export default async function ArchivePage() {
  const entries = await fetchArchiveEntries();

  return (
    <>
      <SiteNav
        activeSection="archive"
        contextLabel={`${entries.length} ENTRIES`}
        stat={{ count: entries.length, singular: "entry", plural: "entries" }}
      />
      <div className="notebook-grid min-h-[calc(100dvh-48px)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-12">
          <div className="mb-6">
            <h1 className="font-mono text-2xl sm:text-[26px] font-bold">Archive</h1>
            <p className="text-sm text-secondary mt-1">
              All journal entries, unabridged and abridged
            </p>
          </div>

          {entries.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-secondary font-mono text-sm">
                No entries yet. Write one or submit a transcription to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <ArchiveCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
