-- Migration: initial schema for locked-event-access

create extension if not exists "pgcrypto";

-- Events
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  content_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  price_sek integer not null,
  stripe_price_id text
);

-- Purchases
create table purchases (
  id uuid primary key default gen_random_uuid(),
  stripe_payment_intent_id text unique not null,
  event_id uuid not null references events(id),
  email text not null,
  amount integer not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Access keys
create table access_keys (
  id uuid primary key default gen_random_uuid(),
  key uuid unique not null default gen_random_uuid(),
  event_id uuid not null references events(id),
  email text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  purchase_id uuid references purchases(id)
);

-- RLS
alter table events enable row level security;
alter table purchases enable row level security;
alter table access_keys enable row level security;

-- events: anon can read all
create policy "events_anon_select" on events
  for select to anon using (true);

-- access_keys: no anon access — verify-key uses service role key
-- purchases: no anon access (service role only)
-- (no policy = no access for anon on access_keys and purchases)
