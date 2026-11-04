-- Wegemo — Pre-launch security hardening
-- Run this in: Supabase Dashboard > SQL Editor > New query
--
-- WHY: `orders` and `order_items` currently have a permissive
-- `for select using (true)` policy. Because the anon key is public (it ships in
-- the JS bundle by design), anyone can currently list EVERY order of EVERY
-- restaurant — including customer_name, customer_email, customer_nif and totals.
-- customer_nif is a Portuguese tax ID, i.e. personal data under GDPR.
--
-- WHAT THIS DOES: keeps row access intact (so the customer tracking screen and
-- its realtime subscription keep working exactly as today) but removes the
-- anonymous role's privilege to read the personal-data columns. The restaurant
-- owner is authenticated, so the dashboard/kitchen are unaffected.
--
-- SAFE TO RUN DURING SERVICE: no data is modified, no policy is dropped.

-- The customer tracking screen only ever reads these columns anonymously:
--   status, estimated_ready_at, created_at, vendus_invoice_url, vendus_invoice_number
-- Everything else is dashboard-only (authenticated owner).

revoke select (customer_name, customer_email, note) on orders from anon;

-- customer_nif only exists once migration_vendus.sql has been run.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'orders' and column_name = 'customer_nif'
  ) then
    execute 'revoke select (customer_nif) on orders from anon';
  end if;
end $$;

-- Verify: this should list the columns anon can still read on `orders`.
-- select column_name from information_schema.column_privileges
--   where table_name = 'orders' and grantee = 'anon' and privilege_type = 'SELECT';
