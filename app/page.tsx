import EntryCard from "@/components/EntryCard";
import { getSupabase } from "@/lib/supabase";
import { Entry } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getEntries(): Promise<Entry[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("entries")
      .select("*, ideas(*)")
      .order("day_number", { ascending: false });
    if (error) {
      console.error("Home page query error:", error);
      return [];
    }
    return data as Entry[];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const entries = await getEntries();

  return (
    <div className="max-w-stream mx-auto px-4 sm:px-6">
      <div className="mb-5">
        <h1 className="font-mono text-xl sm:text-2xl font-bold">Stream</h1>
        <p className="text-sm text-secondary mt-1">
          Morning voice memos, processed and archived
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-secondary font-mono text-sm">
            No entries yet. Submit a transcription to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
