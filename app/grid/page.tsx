import GridTile from "@/components/GridTile";
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
    if (error) return [];
    return data as Entry[];
  } catch {
    return [];
  }
}

export default async function GridPage() {
  const entries = await getEntries();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="mb-5">
        <h1 className="font-mono text-xl sm:text-2xl font-bold">Grid</h1>
        <p className="text-sm text-secondary mt-1">
          Calendar view of all journal entries
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-secondary font-mono text-sm">No entries yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {entries.map((entry) => (
            <GridTile key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
