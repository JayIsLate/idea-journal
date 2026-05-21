-- Caches synthesis results so we don't re-call Claude on every page load.
-- One latest row is kept; we use the entry_ids array to detect when new
-- entries have been added since the last synthesis was generated.

create table if not exists syntheses (
  id uuid primary key default gen_random_uuid(),
  synthesis text not null,
  entry_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table syntheses enable row level security;

-- service_role bypasses RLS, so no policies needed for server-side reads/writes.
-- If you ever expose this to the client directly, add policies here.

create index if not exists syntheses_created_at_idx on syntheses (created_at desc);
