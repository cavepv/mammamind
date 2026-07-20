-- Grant full table privileges to service_role (used by Edge Functions).
-- Without this, service_role inserts/updates fail with "permission denied"
-- even though service_role bypasses RLS — RLS bypass and table-level GRANT
-- are separate Postgres permission layers.
grant select, insert, update, delete on public.events to service_role;
grant select, insert, update, delete on public.access_keys to service_role;
grant select, insert, update, delete on public.purchases to service_role;
