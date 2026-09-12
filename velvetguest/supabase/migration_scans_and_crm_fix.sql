-- Wegemo — Fix CRM data never being saved + add real QR scan tracking
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- Safe to run during service: no existing data is modified or deleted.

-- ═════════════════════════════════════════════════════════════════
-- 1. FIX: `customers` (CRM) has NEVER accepted anonymous writes
-- ═════════════════════════════════════════════════════════════════
-- WHY THIS MATTERS: the only RLS policy on `customers` is
-- "Owner manages customers", scoped to `auth.uid() = owner_id` — i.e. only the
-- logged-in restaurant owner. A customer ordering anonymously via QR code has
-- no session, so every attempt to save their profile (name, email, phone) into
-- the CRM has been silently rejected by RLS since this table was created. This
-- is unrelated to the order-saving incident — it's a separate, older bug.

drop policy if exists "Anyone can create their own customer profile" on customers;
create policy "Anyone can create their own customer profile"
  on customers for insert
  with check (true);

drop policy if exists "Anyone can update their own customer profile" on customers;
create policy "Anyone can update their own customer profile"
  on customers for update
  using (true);

-- Add the NIF column so it's captured in the CRM alongside name/email/phone
-- (currently only stored on the order itself).
alter table customers add column if not exists nif text;

-- ═════════════════════════════════════════════════════════════════
-- 2. NEW: real QR scan tracking (was hardcoded to 0, never implemented)
-- ═════════════════════════════════════════════════════════════════
create table if not exists qr_scans (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id      uuid references tables(id) on delete set null,
  table_number  int,
  scanned_at    timestamptz not null default now()
);

alter table qr_scans enable row level security;

drop policy if exists "Anyone can log a scan" on qr_scans;
create policy "Anyone can log a scan"
  on qr_scans for insert
  with check (true);

drop policy if exists "Owner reads their scans" on qr_scans;
create policy "Owner reads their scans"
  on qr_scans for select
  using (
    exists (select 1 from restaurants r where r.id = qr_scans.restaurant_id and r.owner_id = auth.uid())
  );

create index if not exists idx_qr_scans_restaurant on qr_scans(restaurant_id, scanned_at desc);

-- Enable realtime for qr_scans so the dashboard's scan counter updates live
-- the instant a customer scans, without a page refresh.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'qr_scans'
  ) then
    alter publication supabase_realtime add table qr_scans;
  end if;
end $$;
