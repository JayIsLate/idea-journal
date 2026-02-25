-- Writing Editor Tables
-- Run this in the Supabase SQL Editor after migration.sql

-- Idea writing table (one per idea)
create table idea_writing (
  id uuid primary key default uuid_generate_v4(),
  idea_id uuid not null references ideas(id) on delete cascade,
  pages jsonb not null default '{"summary":"","develop":"","reference":""}',
  active_page text not null default 'summary',
  highlights jsonb not null default '[]',
  word_count integer not null default 0,
  last_ai_feedback_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint idea_writing_idea_id_unique unique (idea_id)
);

-- Writing conversations table
create table writing_conversations (
  id uuid primary key default uuid_generate_v4(),
  idea_id uuid not null references ideas(id) on delete cascade,
  messages jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Storage bucket for writing images
-- Run this separately if needed:
-- insert into storage.buckets (id, name, public) values ('writing-images', 'writing-images', true);

-- Indexes
create index idx_idea_writing_idea_id on idea_writing(idea_id);
create index idx_writing_conversations_idea_id on writing_conversations(idea_id);

-- Updated_at triggers (reusing existing function)
create trigger idea_writing_updated_at
  before update on idea_writing
  for each row execute function update_updated_at();

create trigger writing_conversations_updated_at
  before update on writing_conversations
  for each row execute function update_updated_at();
