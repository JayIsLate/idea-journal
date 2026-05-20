-- Adds inline-annotation storage to entries so the Hermes panel on /journal/[id]
-- can persist highlights across reloads (mirrors idea_writing.highlights).
ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS highlights jsonb NOT NULL DEFAULT '[]'::jsonb;
