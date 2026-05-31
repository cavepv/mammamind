-- Grant table-level privileges (required alongside RLS policies)
-- events: anon can read (for future use, e.g. listing events)
grant select on public.events to anon;

-- access_keys + purchases: no anon grants — service role only via Edge Functions
