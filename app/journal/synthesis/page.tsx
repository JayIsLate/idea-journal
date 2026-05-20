import SiteNav from "@/components/SiteNav";
import SynthesisView from "./SynthesisView";
import { getSupabase } from "@/lib/supabase";
import type { Entry } from "@/lib/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function fetchRecentEntries(): Promise<Entry[]> {
  const supabase = getSupabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const { data } = await supabase
    .from("entries")
    .select("*")
    .gte("date", cutoffStr)
    .order("day_number", { ascending: false });

  return (data || []) as Entry[];
}

async function fetchAllEntriesForIndex(): Promise<Entry[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("entries")
    .select("id, day_number, date, title")
    .order("day_number", { ascending: false });
  return (data || []) as Entry[];
}

function formatRange(entries: Entry[]): string {
  if (entries.length === 0) return "";
  const dates = entries
    .map((e) => new Date(e.date))
    .sort((a, b) => a.getTime() - b.getTime());
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase();
  return `${fmt(dates[0])} — ${fmt(dates[dates.length - 1])}`;
}

export default async function SynthesisPage() {
  const [recent, allEntries] = await Promise.all([
    fetchRecentEntries(),
    fetchAllEntriesForIndex(),
  ]);

  const summaries = recent
    .map((e) => e.summary)
    .filter((s): s is string => Boolean(s && s.trim()));

  const contextLabel = formatRange(recent);

  return (
    <>
      <SiteNav activeSection="synthesis" contextLabel={contextLabel} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-12">
        <SynthesisView summaries={summaries} entries={allEntries} />
      </div>
    </>
  );
}
