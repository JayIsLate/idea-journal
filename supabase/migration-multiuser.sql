-- Multi-user migration for IDEA LOG
-- Run this in the Supabase SQL Editor, in order.
--
-- Adds Google-auth-backed per-user ownership + Row Level Security to a schema
-- that was single-user (entries, ideas, syntheses, idea_writing,
-- writing_conversations). Every user-owned table gets a denormalized user_id so
-- RLS policies stay flat (auth.uid() = user_id, no joins).
--
-- ORDER OF OPERATIONS:
--   1. Run sections 1–6 below (schema, RLS, trigger, indexes).
--   2. Sign in with Google once as the owner so the auth.users + profiles rows
--      exist.
--   3. Run section 7 (backfill) to assign all existing rows to the owner.
--   4. After verifying, run section 8 (set NOT NULL).

-- ============================================================================
-- 1. Profiles + auto-create trigger
-- ============================================================================
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  anthropic_key text,                          -- optional BYOK
  settings      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

-- security definer + an explicit empty search_path is required so Supabase's
-- auth role can run this trigger; tables must be schema-qualified (public.*).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- 2. Add user_id to every user-owned table (nullable for now; see section 8)
-- ============================================================================
alter table entries               add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table ideas                 add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table syntheses             add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table idea_writing          add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table writing_conversations add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- ============================================================================
-- 3. day_number is now unique PER USER, not globally
-- ============================================================================
alter table entries drop constraint if exists entries_day_number_key;
create unique index if not exists entries_user_day_uniq on entries(user_id, day_number);

-- ============================================================================
-- 4. Enable Row Level Security
-- ============================================================================
alter table entries               enable row level security;
alter table ideas                 enable row level security;
alter table syntheses             enable row level security;
alter table idea_writing          enable row level security;
alter table writing_conversations enable row level security;
alter table profiles              enable row level security;

-- ============================================================================
-- 5. Policies — flat (auth.uid() = user_id) thanks to denormalized user_id.
--    No public-read policies: every journal is strictly private.
-- ============================================================================

-- entries
drop policy if exists entries_select on entries;
drop policy if exists entries_insert on entries;
drop policy if exists entries_update on entries;
drop policy if exists entries_delete on entries;
create policy entries_select on entries for select using (auth.uid() = user_id);
create policy entries_insert on entries for insert with check (auth.uid() = user_id);
create policy entries_update on entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy entries_delete on entries for delete using (auth.uid() = user_id);

-- ideas
drop policy if exists ideas_select on ideas;
drop policy if exists ideas_insert on ideas;
drop policy if exists ideas_update on ideas;
drop policy if exists ideas_delete on ideas;
create policy ideas_select on ideas for select using (auth.uid() = user_id);
create policy ideas_insert on ideas for insert with check (auth.uid() = user_id);
create policy ideas_update on ideas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ideas_delete on ideas for delete using (auth.uid() = user_id);

-- syntheses
drop policy if exists syntheses_select on syntheses;
drop policy if exists syntheses_insert on syntheses;
drop policy if exists syntheses_update on syntheses;
drop policy if exists syntheses_delete on syntheses;
create policy syntheses_select on syntheses for select using (auth.uid() = user_id);
create policy syntheses_insert on syntheses for insert with check (auth.uid() = user_id);
create policy syntheses_update on syntheses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy syntheses_delete on syntheses for delete using (auth.uid() = user_id);

-- idea_writing
drop policy if exists idea_writing_select on idea_writing;
drop policy if exists idea_writing_insert on idea_writing;
drop policy if exists idea_writing_update on idea_writing;
drop policy if exists idea_writing_delete on idea_writing;
create policy idea_writing_select on idea_writing for select using (auth.uid() = user_id);
create policy idea_writing_insert on idea_writing for insert with check (auth.uid() = user_id);
create policy idea_writing_update on idea_writing for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy idea_writing_delete on idea_writing for delete using (auth.uid() = user_id);

-- writing_conversations
drop policy if exists writing_conversations_select on writing_conversations;
drop policy if exists writing_conversations_insert on writing_conversations;
drop policy if exists writing_conversations_update on writing_conversations;
drop policy if exists writing_conversations_delete on writing_conversations;
create policy writing_conversations_select on writing_conversations for select using (auth.uid() = user_id);
create policy writing_conversations_insert on writing_conversations for insert with check (auth.uid() = user_id);
create policy writing_conversations_update on writing_conversations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy writing_conversations_delete on writing_conversations for delete using (auth.uid() = user_id);

-- profiles (insert is handled by the security-definer trigger)
drop policy if exists profiles_select on profiles;
drop policy if exists profiles_update on profiles;
create policy profiles_select on profiles for select using (auth.uid() = id);
create policy profiles_update on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ============================================================================
-- 6. Indexes
-- ============================================================================
create index if not exists idx_entries_user               on entries(user_id);
create index if not exists idx_ideas_user                 on ideas(user_id);
create index if not exists idx_syntheses_user             on syntheses(user_id);
create index if not exists idx_idea_writing_user          on idea_writing(user_id);
create index if not exists idx_writing_conversations_user on writing_conversations(user_id);

-- ============================================================================
-- 7. BACKFILL — run AFTER the owner has signed in once with Google.
--    Assigns every existing single-user row to the owner. Replace the email if
--    it differs from OWNER_EMAIL in your env.
-- ============================================================================
-- do $$
-- declare owner uuid := (select id from auth.users where lower(email) = lower('jaymyers405@gmail.com'));
-- begin
--   if owner is null then
--     raise exception 'Owner not found — sign in with Google first';
--   end if;
--   update entries               set user_id = owner where user_id is null;
--   update ideas                 set user_id = owner where user_id is null;
--   update syntheses             set user_id = owner where user_id is null;
--   update idea_writing          set user_id = owner where user_id is null;
--   update writing_conversations set user_id = owner where user_id is null;
-- end $$;

-- ============================================================================
-- 8. Lock it down — run AFTER the backfill has succeeded and is verified.
-- ============================================================================
-- alter table entries               alter column user_id set not null;
-- alter table ideas                 alter column user_id set not null;
-- alter table syntheses             alter column user_id set not null;
-- alter table idea_writing          alter column user_id set not null;
-- alter table writing_conversations alter column user_id set not null;
