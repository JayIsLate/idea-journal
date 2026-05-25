export type IdeaCategory =
  | "product"
  | "content"
  | "business"
  | "personal"
  | "technical"
  | "creative";

export type IdeaStatus = "raw" | "developing" | "ready" | "shipped" | "archived";

export interface IdeaContribution {
  entry_id: string;
  date: string;
  snippet: string;
  // Populated on merge contributions (not on origin). Lets the UI mark which
  // action_items / tags were newly added to an idea so the writer can see
  // what's fresh at a glance.
  added_action_items?: string[];
  added_tags?: string[];
}

export interface Idea {
  id: string;
  entry_id: string;
  title: string;
  description: string;
  category: IdeaCategory;
  status: IdeaStatus;
  confidence: number;
  action_items: string[];
  tags: string[];
  ai_suggestions: string[];
  word_count?: number;
  last_activity_at?: string;
  contributions?: IdeaContribution[];
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: string;
  day_number: number;
  date: string;
  raw_transcription: string;
  title: string;
  summary: string;
  mood: string;
  tags: string[];
  ideas?: Idea[];
  created_at: string;
  updated_at: string;
}

export interface ClaudeResponse {
  title: string;
  summary: string;
  mood: string;
  tags: string[];
  ideas: {
    title: string;
    description: string;
    category: IdeaCategory;
    confidence: number;
    action_items: string[];
    tags: string[];
    ai_suggestions: string[];
    // Smart-clustering fields populated when existing ideas are provided.
    // mergeIntoIdeaId is the id of an existing idea this extracted idea
    // should merge into; null/undefined means create a new idea.
    mergeIntoIdeaId?: string | null;
    mergeConfidence?: number;
  }[];
}
