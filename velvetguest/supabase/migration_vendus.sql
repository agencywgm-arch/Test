-- Wegemo — Vendus (Portuguese fiscal invoicing) integration
-- Run this in: Supabase Dashboard > SQL Editor > New query

-- Per-restaurant Vendus settings (each restaurant has its own NIF and can toggle
-- the integration on/off independently)
alter table restaurants add column if not exists nif text;
alter table restaurants add column if not exists vendus_enabled boolean not null default false;

-- Vendus fiscal invoice info attached to each order (populated by the Edge Function
-- after the invoice is successfully created via the Vendus API)
alter table orders add column if not exists vendus_invoice_id text;
alter table orders add column if not exists vendus_invoice_number text;
alter table orders add column if not exists vendus_invoice_url text;
alter table orders add column if not exists vendus_invoice_created_at timestamptz;

-- Optional customer tax number (NIF) captured at checkout so the fiscal receipt
-- can be issued "com contribuinte" instead of to the generic final consumer.
alter table orders add column if not exists customer_nif text;

-- Seed La Gratinade with its real NIF + enable Vendus
update restaurants
set nif = '519061845', vendus_enabled = true
where slug = 'la-gratinade' or name ilike '%gratinade%';
