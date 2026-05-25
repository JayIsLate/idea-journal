-- Backfill origin contributions for ideas that pre-date the clustering feature.
-- Each idea originated from a single entry (its entry_id). Without this row,
-- the "↩ N" badge undercounts because it only sees merges-in, not the origin.
-- Safe to re-run: prepends only when the origin entry isn't already recorded.

update ideas
set contributions = jsonb_build_array(
  jsonb_build_object(
    'entry_id', entry_id,
    'date', to_char(created_at, 'YYYY-MM-DD'),
    'snippet', left(coalesce(description, ''), 200)
  )
) || contributions
where entry_id is not null
  and not exists (
    select 1
    from jsonb_array_elements(contributions) elem
    where elem->>'entry_id' = entry_id::text
  );
