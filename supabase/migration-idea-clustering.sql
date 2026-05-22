-- Smart idea clustering: bump-to-top + per-entry contribution tracking
-- Adds two columns to the ideas table and backfills existing rows.

alter table ideas
  add column if not exists last_activity_at timestamptz not null default now();

alter table ideas
  add column if not exists contributions jsonb not null default '[]'::jsonb;

-- Backfill: existing ideas get their created_at as the initial activity timestamp
update ideas
  set last_activity_at = created_at
  where last_activity_at is null or last_activity_at = now()::date::timestamptz;

-- Sort index for the /ideas page default order
create index if not exists ideas_last_activity_at_idx on ideas (last_activity_at desc);
