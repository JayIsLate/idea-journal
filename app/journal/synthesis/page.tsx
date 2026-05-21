import SiteNav from "@/components/SiteNav";
import SynthesisView from "./SynthesisView";
import { getSupabase } from "@/lib/supabase";
import type { Entry } from "@/lib/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface SynthesisRow {
  id: string;
  synthesis: string;
  entry_ids: string[];
  created_at: string;
}

interface EntryWithSummary {
  id: string;
  summary: string;
}

async function fetchEntriesWithSummary(): Promise<EntryWithSummary[]> {
  const supabase = getSupabase();
  // 30-day window for synthesis input
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const { data } = await supabase
    .from("entries")
    .select("id, summary, date")
    .gte("date", cutoffStr)
    .order("day_number", { ascending: false });

  return ((data || []) as { id: string; summary: string | null }[])
    .filter((e): e is { id: string; summary: string } => Boolean(e.summary && e.summary.trim()))
    .map((e) => ({ id: e.id, summary: e.summary }));
}

async function fetchLatestSynthesis(): Promise<SynthesisRow | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("syntheses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SynthesisRow | null) ?? null;
}

async function fetchAllEntriesForIndex(): Promise<Entry[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("entries")
    .select("id, day_number, date, title")
    .order("day_number", { ascending: false });
  return (data || []) as Entry[];
}

function formatRange(dates: string[]): string {
  if (dates.length === 0) return "";
  const sorted = dates.map((d) => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase();
  return `${fmt(sorted[0])} — ${fmt(sorted[sorted.length - 1])}`;
}

export default async function SynthesisPage() {
  const [entriesWithSummary, cached, allEntries] = await Promise.all([
    fetchEntriesWithSummary(),
    fetchLatestSynthesis(),
    fetchAllEntriesForIndex(),
  ]);

  const recentEntryDates = allEntries
    .filter((e) => entriesWithSummary.some((es) => es.id === e.id))
    .map((e) => e.date);

  const contextLabel = formatRange(recentEntryDates);

  return (
    <>
      <SiteNav activeSection="synthesis" contextLabel={contextLabel} />
      <div className="notebook-grid min-h-[calc(100dvh-48px)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-12">
          <SynthesisView
            entries={entriesWithSummary}
            cached={cached}
            allEntries={allEntries}
          />
        </div>
      </div>
    </>
  );
}
