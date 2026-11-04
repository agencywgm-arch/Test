-- Wegemo — URGENT: restore order saving (broken by migration_prelaunch_security.sql)
-- Run this immediately in: Supabase Dashboard > SQL Editor > New query
--
-- migration_prelaunch_security.sql revoked anonymous SELECT on customer_name,
-- customer_email, note and customer_nif on `orders`. Every order INSERT ends
-- with a `.select()` that re-reads the inserted row (RETURNING), which needs
-- SELECT on every column being returned — so the revoke broke the INSERT
-- itself, not just later reads. This restores the previous working state.
--
-- A safer, permanent version of the original PII protection is being shipped
-- in the app code (order creation will only ask the database to return the
-- new order's id, never the personal columns), so re-granting here is safe
-- and won't reopen the original leak once that code is deployed.

grant select (customer_name, customer_email, note) on orders to anon;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'orders' and column_name = 'customer_nif'
  ) then
    execute 'grant select (customer_nif) on orders to anon';
  end if;
end $$;
