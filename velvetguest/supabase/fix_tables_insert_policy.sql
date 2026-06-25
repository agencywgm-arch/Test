-- Wegemo — Fix "null value in column table_id ... violates not-null constraint"
-- Root cause: the customer page auto-creates a `tables` row when a QR code
-- points at a table number that doesn't exist yet in the DB, but there was
-- no RLS policy letting an anonymous customer INSERT into `tables` (only
-- "Owner manages tables" for the restaurant owner, and a public SELECT).
-- So the insert was silently blocked, table_id stayed null, and the
-- following order insert failed.
--
-- This does NOT change any QR code URL or routing logic — it only allows
-- the existing auto-create-table code path to succeed.
--
-- Run this in: Supabase Dashboard > SQL Editor > New query

create policy "Anyone can create a table row for an existing restaurant"
  on tables for insert
  with check (
    exists (
      select 1 from restaurants r where r.id = tables.restaurant_id
    )
  );
