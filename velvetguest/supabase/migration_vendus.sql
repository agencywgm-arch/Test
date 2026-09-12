-- Wegemo — Vendus (Portuguese fiscal invoicing) integration
-- Run this in: Supabase Dashboard > SQL Editor > New query

-- Per-restaurant Vendus settings (each restaurant has its own NIF and can toggle
-- the integration on/off independently)
alter table restaurants add column if not exists nif text;
alter table restaurants add column if not exists vendus_enabled boolean not null default false;
-- VAT code override (NOR/INT/RED/ISE/OUT/NS) read by create-vendus-invoice.
-- Without this column the function's restaurant lookup errors on the missing
-- column and every invoice attempt fails with "restaurant not found".
alter table restaurants add column if not exists vendus_tax_id text;
-- Vendus payment-type ids (Definições → Tipos de Pagamento → editar → id in
-- the URL). These are per-account generated numbers, not small sequential
-- ones — the API's own payment-types lookup endpoint doesn't work reliably,
-- so create-vendus-invoice needs each restaurant's real ids configured here
-- to attach a valid payment to every "FS" document (Vendus requires one).
alter table restaurants add column if not exists vendus_cash_payment_id bigint;
alter table restaurants add column if not exists vendus_card_payment_id bigint;
-- Optional: a dedicated second Vendus register ("caixa") to route
-- backlog/backdated invoices through. Vendus auto-assigns one invoicing
-- series per register, each with its own independent chronological date
-- history — once a register's series has a document dated "today" it can
-- never backdate anything again, so a second register (created for this
-- purpose in the Vendus dashboard) gets a fresh series to backdate into.
-- Leave null to keep using the account's default/main register.
alter table restaurants add column if not exists vendus_register_id bigint;

-- Vendus fiscal invoice info attached to each order (populated by the Edge Function
-- after the invoice is successfully created via the Vendus API)
alter table orders add column if not exists vendus_invoice_id text;
alter table orders add column if not exists vendus_invoice_number text;
alter table orders add column if not exists vendus_invoice_url text;
alter table orders add column if not exists vendus_invoice_created_at timestamptz;

-- Optional customer tax number (NIF) captured at checkout so the fiscal receipt
-- can be issued "com contribuinte" instead of to the generic final consumer.
alter table orders add column if not exists customer_nif text;

-- Seed La Gratinade with its real NIF + enable Vendus + its real Vendus
-- payment-type ids (Dinheiro / Cartão de Crédito, from its own account)
update restaurants
set nif = '519061845', vendus_enabled = true,
    vendus_cash_payment_id = 356589025, vendus_card_payment_id = 356589027
where slug = 'la-gratinade' or name ilike '%gratinade%';
