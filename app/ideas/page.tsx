"use client";

import { useEffect, useState } from "react";
import { Entry, Idea, IdeaCategory, IdeaStatus } from "@/lib/types";
import IdeaCard from "@/components/IdeaCard";

const categories: IdeaCategory[] = [
  "product",
  "content",
  "business",
  "personal",
  "technical",
  "creative",
];
const statuses: IdeaStatus[] = [
  "raw",
  "developing",
  "ready",
  "shipped",
  "archived",
];

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/entries");
      if (res.ok) {
        const entries: Entry[] = await res.json();
        const allIdeas = entries.flatMap((e) =>
          (e.ideas || []).map((idea) => ({ ...idea, entry_id: e.id }))
        );
        setIdeas(allIdeas);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filteredIdeas = ideas.filter((idea) => {
    if (categoryFilter !== "all" && idea.category !== categoryFilter)
      return false;
    if (statusFilter !== "all" && idea.status !== statusFilter) return false;
    if (
      search &&
      !idea.title.toLowerCase().includes(search.toLowerCase()) &&
      !idea.description.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className={`${view === "grid" ? "max-w-7xl" : "max-w-4xl"} mx-auto px-4 sm:px-6 pb-12`}>
      <div className="mb-5">
        <h1 className="font-mono text-xl sm:text-2xl font-bold">Ideas</h1>
        <p className="text-sm text-secondary mt-1">
          All extracted ideas, filterable and sortable
        </p>
      </div>

      <div className="space-y-2.5 mb-5">
        <input
          type="text"
          placeholder="Search ideas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm font-mono bg-card border border-border rounded-xl px-4 py-3 text-text placeholder:text-secondary focus:outline-none focus:border-accent"
        />

        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 text-sm font-mono bg-card border border-border rounded-xl px-3 py-2.5 text-secondary focus:outline-none focus:border-accent"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 text-sm font-mono bg-card border border-border rounded-xl px-3 py-2.5 text-secondary focus:outline-none focus:border-accent"
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div className="flex bg-card border border-border rounded-xl overflow-hidden shrink-0">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-2.5 text-sm font-mono ${view === "list" ? "bg-accent text-white" : "text-secondary"}`}
            >
              List
            </button>
            <button
              onClick={() => setView("grid")}
              className={`px-3 py-2.5 text-sm font-mono ${view === "grid" ? "bg-accent text-white" : "text-secondary"}`}
            >
              Grid
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-border rounded-xl" />
          ))}
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-secondary font-mono text-sm">
            {ideas.length === 0
              ? "No ideas yet."
              : "No ideas match your filters."}
          </p>
        </div>
      ) : (
        <div className={view === "grid" ? "grid grid-cols-2 lg:grid-cols-4 gap-3" : "space-y-3"}>
          {filteredIdeas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} showEntryLink compact={view === "grid"} />
          ))}
        </div>
      )}
    </div>
  );
}
