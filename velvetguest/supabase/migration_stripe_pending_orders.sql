-- Wegemo — Server-side safety net for redirect-based payment methods (MB WAY,
-- Multibanco...). Those send the customer's browser away entirely to confirm
-- payment; if it never comes back (app closed, tab killed, poor connection),
-- the money is captured by Stripe but the app-side flow that creates the
-- `orders` row never runs. The stripe-webhook Edge Function uses this table
-- to build the order anyway once Stripe confirms payment succeeded, keyed by
-- the payment intent id — so it can never collide with the normal flow if the
-- browser DOES come back and completes the order itself first.

create table if not exists stripe_pending_orders (
  id              text primary key,  -- the Stripe PaymentIntent id (pi_...)
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  table_number    int,
  cart            jsonb not null default '[]',
  customer_name   text,
  customer_email  text,
  customer_phone  text,
  customer_nif    text,
  note            text,
  order_type      text default 'dine_in',
  total           numeric(10,2) not null default 0,
  fulfilled       boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table stripe_pending_orders enable row level security;

-- Anonymous customers write this right before starting a card/MB WAY payment,
-- same as every other write on the public ordering flow (orders, qr_scans...).
drop policy if exists "Anyone can save a pending payment" on stripe_pending_orders;
create policy "Anyone can save a pending payment"
  on stripe_pending_orders for insert with check (true);

drop policy if exists "Anyone can update their own pending payment" on stripe_pending_orders;
create policy "Anyone can update their own pending payment"
  on stripe_pending_orders for update using (true);

-- Optional housekeeping: rows older than a few days are either long since
-- fulfilled or abandoned carts that were never paid — safe to prune manually
-- with, e.g.:
--   delete from stripe_pending_orders where created_at < now() - interval '7 days';

-- Per-restaurant Stripe webhook signing secret (each restaurant has its own
-- Stripe account/keys already — the webhook is configured the same way, one
-- endpoint per restaurant, see supabase/functions/stripe-webhook/index.ts).
alter table restaurant_settings add column if not exists stripe_webhook_secret text;

-- The webhook's "does an order already exist for this payment?" check and the
-- client-side resume's "don't create a duplicate" check both rely on this —
-- already added by migration_stripe_refund.sql, repeated here with
-- if-not-exists so this file is safe to run standalone.
alter table orders add column if not exists stripe_payment_intent_id text;
