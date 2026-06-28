-- Database-backed invite allowlist. Add a friend by inserting one row here
-- (Supabase Table Editor → allowed_emails → Insert), no redeploy needed.
-- A trigger lowercases/trims the email so casing never matters.
-- Run once in the Supabase SQL Editor.

create table if not exists allowed_emails (
  email      text primary key,
  added_at   timestamptz not null default now()
);

-- Private: only the service role (server) and the Supabase dashboard can read
-- or write it. No policies are added, so normal users can't see the list.
alter table allowed_emails enable row level security;

-- Normalize stored emails (lowercase + trim) on insert/update.
create or replace function public.lower_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists allowed_emails_lower on allowed_emails;
create trigger allowed_emails_lower
  before insert or update on allowed_emails
  for each row execute function public.lower_email();

-- Seed the owner (harmless — the owner is always allowed regardless).
insert into allowed_emails (email) values ('jaymyers405@gmail.com')
on conflict (email) do nothing;
