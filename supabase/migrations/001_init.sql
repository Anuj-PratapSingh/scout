-- Enable pgcrypto for UUID generation
create extension if not exists pgcrypto;

-- Users
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  telegram_id text unique,
  discord_id text unique,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Preferences
create table preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade unique,
  categories text[] default '{}',
  custom_criteria text[] default '{}',
  compulsory_criteria text[] default '{}',
  match_threshold integer default 5,
  updated_at timestamptz default now()
);

-- Global opportunity pool (shared across all users)
create table opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  url text unique not null,
  source text,
  tags text[] default '{}',
  deadline timestamptz,
  is_flagged boolean default false,
  fetched_at timestamptz default now()
);

create index on opportunities (deadline) where deadline is not null;
create index on opportunities (fetched_at desc);
create index on opportunities using gin(tags);

-- Notification log (prevents duplicate sends)
create table notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete cascade,
  channel text,
  sent_at timestamptz default now(),
  unique(user_id, opportunity_id, channel)
);

-- BYOK encrypted keys
create table user_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade unique,
  reddit_client_id text,
  reddit_client_secret text,
  google_cse_key text,
  google_cse_id text,
  resend_api_key text,
  ai_api_key text,
  ai_provider text, -- 'openai' | 'anthropic'
  updated_at timestamptz default now()
);

-- Row Level Security
alter table users enable row level security;
alter table preferences enable row level security;
alter table opportunities enable row level security;
alter table notification_log enable row level security;
alter table user_keys enable row level security;

-- Policies: users own their data
create policy "users: own row" on users for all using (auth.uid() = id);
create policy "preferences: own row" on preferences for all using (auth.uid() = user_id);
create policy "notification_log: own rows" on notification_log for all using (auth.uid() = user_id);
create policy "user_keys: own row" on user_keys for all using (auth.uid() = user_id);

-- Opportunities are public read (global pool), service role writes
create policy "opportunities: public read" on opportunities for select using (true);
create policy "opportunities: service role write" on opportunities for insert with check (true);
create policy "opportunities: service role update" on opportunities for update using (true);
