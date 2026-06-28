-- Adds a dedicated column for the rich, structured "abridged" summary shown on
-- an entry's Abridged tab. The existing `summary` column stays as the short
-- 2-3 sentence blurb used on archive cards and as synthesis input.
-- Run once in the Supabase SQL Editor.
alter table entries add column if not exists abridged text;

-- Marks an entry's abridged summary as out-of-date because content was added
-- (e.g. another entry was merged in). The "Regenerate" button on the Abridged
-- tab only appears when this is true; the summarizer clears it on regenerate.
alter table entries add column if not exists abridged_stale boolean not null default false;
