import type { SupabaseClient } from "@supabase/supabase-js";
import type { Idea, IdeaContribution } from "./types";

export const MERGE_CONFIDENCE_THRESHOLD = 0.7;

interface ExtractedIdea {
  title: string;
  description: string;
  category: string;
  confidence: number;
  action_items: string[];
  tags: string[];
  ai_suggestions: string[];
  mergeIntoIdeaId?: string | null;
  mergeConfidence?: number;
}

interface MergeIntoArgs {
  supabase: SupabaseClient;
  existingId: string;
  extracted: ExtractedIdea;
  entryId: string;
  entryDate: string;
}

// Bumps last_activity_at, appends a contribution, unions tags, and appends
// novel action_items. Title and description stay stable — they are the
// idea's identity. Returns the updated idea row.
export async function mergeIntoExistingIdea({
  supabase,
  existingId,
  extracted,
  entryId,
  entryDate,
}: MergeIntoArgs): Promise<Idea | null> {
  const { data: existing } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", existingId)
    .single();

  if (!existing) return null;

  const existingTags: string[] = existing.tags || [];
  const newTags = Array.from(new Set([...existingTags, ...extracted.tags]));

  const existingActions: string[] = existing.action_items || [];
  const novelActions = extracted.action_items.filter(
    (a) => !existingActions.some((e) => e.toLowerCase() === a.toLowerCase())
  );
  const mergedActions = [...existingActions, ...novelActions];

  const existingContributions: IdeaContribution[] = existing.contributions || [];
  const snippet = extracted.description.slice(0, 200);
  const nextContributions: IdeaContribution[] = [
    ...existingContributions,
    { entry_id: entryId, date: entryDate, snippet },
  ];

  const { data: updated } = await supabase
    .from("ideas")
    .update({
      tags: newTags,
      action_items: mergedActions,
      contributions: nextContributions,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", existingId)
    .select()
    .single();

  return updated as Idea | null;
}

interface InsertNewArgs {
  supabase: SupabaseClient;
  extracted: ExtractedIdea;
  entryId: string;
  entryDate: string;
}

export async function insertNewIdea({
  supabase,
  extracted,
  entryId,
  entryDate,
}: InsertNewArgs): Promise<Idea | null> {
  const snippet = extracted.description.slice(0, 200);
  const originContribution: IdeaContribution = {
    entry_id: entryId,
    date: entryDate,
    snippet,
  };

  const { data, error } = await supabase
    .from("ideas")
    .insert({
      entry_id: entryId,
      title: extracted.title,
      description: extracted.description,
      category: extracted.category,
      status: "raw",
      confidence: extracted.confidence,
      action_items: extracted.action_items,
      tags: extracted.tags,
      ai_suggestions: extracted.ai_suggestions,
      contributions: [originContribution],
      last_activity_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    // Wrap so the message string actually carries the Postgres detail when
    // the caller serializes via err.message. Supabase errors aren't Error
    // instances by default — without this wrap, downstream catches that
    // check `err instanceof Error` would fall through to a generic message
    // and the real cause (missing column, constraint, etc.) gets lost.
    throw new Error(
      `Insert into ideas failed: ${error.message}${error.details ? ` (${error.details})` : ""}${error.hint ? ` [hint: ${error.hint}]` : ""}`
    );
  }
  return data as Idea | null;
}

// Loads the existing-ideas library Claude will see during extraction.
// We filter out archived/shipped because the writer is done with those —
// merging into them is rarely what's intended.
export async function loadActiveIdeasForMatching(
  supabase: SupabaseClient
): Promise<{ id: string; title: string; description: string; tags: string[]; category: string }[]> {
  const { data } = await supabase
    .from("ideas")
    .select("id, title, description, tags, category, status")
    .in("status", ["raw", "developing", "ready"]);
  return (data || []).map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    tags: d.tags || [],
    category: d.category,
  }));
}
