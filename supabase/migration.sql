-- Idea Journal Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Entries table
create table entries (
  id uuid primary key default uuid_generate_v4(),
  day_number integer not null unique,
  date date not null default current_date,
  raw_transcription text not null,
  title text not null,
  summary text not null,
  mood text not null check (mood in ('energized', 'reflective', 'anxious', 'excited', 'calm', 'frustrated', 'hopeful', 'scattered')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ideas table
create table ideas (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid not null references entries(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null check (category in ('product', 'content', 'business', 'personal', 'technical', 'creative')),
  status text not null default 'raw' check (status in ('raw', 'developing', 'ready', 'shipped', 'archived')),
  confidence numeric(3,2) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  action_items text[] not null default '{}',
  tags text[] not null default '{}',
  ai_suggestions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_entries_day_number on entries(day_number);
create index idx_entries_date on entries(date);
create index idx_ideas_entry_id on ideas(entry_id);
create index idx_ideas_category on ideas(category);
create index idx_ideas_status on ideas(status);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger entries_updated_at
  before update on entries
  for each row execute function update_updated_at();

create trigger ideas_updated_at
  before update on ideas
  for each row execute function update_updated_at();
