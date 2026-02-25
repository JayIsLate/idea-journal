export type PageKey = "summary" | "develop" | "reference";

export type Pages = Record<PageKey, string>;

export type HighlightType =
  | "question"
  | "suggestion"
  | "edit"
  | "voice"
  | "weakness"
  | "evidence"
  | "wordiness"
  | "factcheck";

export interface Highlight {
  id: string;
  type: HighlightType;
  matchText: string;
  comment: string;
  suggestedEdit?: string;
  pageKey: PageKey;
}

export interface IdeaWriting {
  id: string;
  idea_id: string;
  pages: Pages;
  active_page: PageKey;
  highlights: Highlight[];
  word_count: number;
  last_ai_feedback_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface WritingConversation {
  id: string;
  idea_id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export const PAGE_KEYS: PageKey[] = ["summary", "develop", "reference"];

export const PAGE_LABELS: Record<PageKey, string> = {
  summary: "Summary",
  develop: "Develop",
  reference: "Reference",
};

export const PAGE_COLORS: Record<PageKey, string> = {
  summary: "bg-blue-400",
  develop: "bg-amber-400",
  reference: "bg-emerald-400",
};

export const PAGE_BORDER_COLORS: Record<PageKey, string> = {
  summary: "border-blue-400",
  develop: "border-amber-400",
  reference: "border-emerald-400",
};

export const HIGHLIGHT_COLORS: Record<HighlightType, string> = {
  question: "border-b-2 border-blue-400 bg-blue-50",
  suggestion: "border-b-2 border-emerald-400 bg-emerald-50",
  edit: "border-b-2 border-amber-400 bg-amber-50",
  voice: "border-b-2 border-purple-400 bg-purple-50",
  weakness: "border-b-2 border-red-400 bg-red-50",
  evidence: "border-b-2 border-cyan-400 bg-cyan-50",
  wordiness: "border-b-2 border-orange-400 bg-orange-50",
  factcheck: "border-b-2 border-pink-400 bg-pink-50",
};

export const HIGHLIGHT_LABELS: Record<HighlightType, string> = {
  question: "Question",
  suggestion: "Suggestion",
  edit: "Edit",
  voice: "Voice",
  weakness: "Weakness",
  evidence: "Evidence",
  wordiness: "Wordiness",
  factcheck: "Fact Check",
};

export const DEFAULT_PAGES: Pages = {
  summary: "",
  develop: "",
  reference: "",
};
