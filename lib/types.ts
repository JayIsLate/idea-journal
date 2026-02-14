export type IdeaCategory =
  | "product"
  | "content"
  | "business"
  | "personal"
  | "technical"
  | "creative";

export type IdeaStatus = "raw" | "developing" | "ready" | "shipped" | "archived";

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
  }[];
}
