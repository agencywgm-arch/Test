-- Wegemo — "Restaurant principal" (payment master) for a franchise/account.
-- One restaurant per account can be flagged as the payment master; its Stripe
-- configuration is then used as a fallback by every sibling restaurant of the
-- same owner that hasn't configured its own Stripe keys.
-- Run this in: Supabase Dashboard > SQL Editor > New query

alter table restaurants add column if not exists is_payment_master boolean not null default false;

-- Handy partial index to look up an account's master quickly.
create index if not exists idx_restaurants_payment_master
  on restaurants (owner_id) where is_payment_master = true;
