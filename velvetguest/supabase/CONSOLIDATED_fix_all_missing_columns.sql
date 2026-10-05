-- Wegemo — Consolidated safety-net migration
-- Run this in: Supabase Dashboard > SQL Editor > New query
--
-- Adds EVERY column/table the app expects, if it's not already there. 100%
-- idempotent (safe to run multiple times, safe to run during live service —
-- no existing data is touched, only missing structure is added).
--
-- Why this exists: "column paid does not exist" proved this project's database
-- was missing columns several past migrations were supposed to add — likely
-- because some of them were never actually run here. This closes that gap in
-- one shot instead of hunting file by file.

-- orders: payment/order-type/fiscal columns
alter table orders add column if not exists paid boolean not null default false;
alter table orders add column if not exists order_type text;
alter table orders add column if not exists customer_nif text;
alter table orders add column if not exists vendus_invoice_id text;
alter table orders add column if not exists vendus_invoice_number text;
alter table orders add column if not exists vendus_invoice_url text;
alter table orders add column if not exists vendus_invoice_created_at timestamptz;
alter table orders add column if not exists receipt_email_sent boolean not null default false;
alter table orders add column if not exists estimated_ready_at timestamptz;

-- customers (CRM): fiscal id + the anon insert/update policies it needs to
-- ever receive data from a real customer order
alter table customers add column if not exists nif text;
drop policy if exists "Anyone can create their own customer profile" on customers;
create policy "Anyone can create their own customer profile"
  on customers for insert with check (true);
drop policy if exists "Anyone can update their own customer profile" on customers;
create policy "Anyone can update their own customer profile"
  on customers for update using (true);

-- restaurants: franchise payment-master + QR redirect/choice + NIF + Vendus
alter table restaurants add column if not exists is_payment_master boolean not null default false;
alter table restaurants add column if not exists redirect_to_restaurant_id uuid references restaurants(id) on delete set null;
alter table restaurants add column if not exists qr_choice_enabled boolean not null default false;
alter table restaurants add column if not exists nif text;
alter table restaurants add column if not exists vendus_enabled boolean not null default false;

-- tables: per-table QR redirect
alter table tables add column if not exists redirect_to_restaurant_id uuid references restaurants(id) on delete set null;

-- qr_scans: real-time scan analytics
create table if not exists qr_scans (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id      uuid references tables(id) on delete set null,
  table_number  int,
  scanned_at    timestamptz not null default now()
);
alter table qr_scans enable row level security;
drop policy if exists "Anyone can log a scan" on qr_scans;
create policy "Anyone can log a scan" on qr_scans for insert with check (true);
drop policy if exists "Owner reads their scans" on qr_scans;
create policy "Owner reads their scans" on qr_scans for select using (
  exists (select 1 from restaurants r where r.id = qr_scans.restaurant_id and r.owner_id = auth.uid())
);
create index if not exists idx_qr_scans_restaurant on qr_scans(restaurant_id, scanned_at desc);
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'qr_scans') then
    alter publication supabase_realtime add table qr_scans;
  end if;
end $$;

-- push_subscriptions: Web Push for "order ready" alerts
create table if not exists push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references orders(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  unique(order_id, endpoint)
);
alter table push_subscriptions enable row level security;
drop policy if exists "Anyone can insert their own push subscription" on push_subscriptions;
create policy "Anyone can insert their own push subscription" on push_subscriptions for insert with check (true);

-- restaurant_settings: ticket customization + Resend + Stripe columns, in case
-- the base migration_settings.sql was itself only partially applied
alter table restaurant_settings add column if not exists ticket_address text;
alter table restaurant_settings add column if not exists ticket_phone text;
alter table restaurant_settings add column if not exists ticket_tax_id text;
alter table restaurant_settings add column if not exists ticket_footer text;
alter table restaurant_settings add column if not exists menu_background_url text;
alter table restaurant_settings add column if not exists menu_header_bg_url text;
alter table restaurant_settings add column if not exists menu_body_bg_url text;
alter table restaurant_settings add column if not exists category_order jsonb;

-- ── Quick self-check — run separately after the block above to confirm ──
-- select column_name from information_schema.columns where table_name = 'orders' order by column_name;
