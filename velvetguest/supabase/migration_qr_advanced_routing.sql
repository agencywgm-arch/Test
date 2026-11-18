-- Wegemo — Advanced QR routing: per-table redirect + "let the customer choose"
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- Requires migration_qr_redirect.sql to have been run first (restaurant-level redirect).

-- ═════════════════════════════════════════════════════════════════
-- 1. Per-table redirect: repoint ONE specific already-printed QR code
--    (a single table) to a different restaurant, without affecting any
--    other table of the same restaurant.
-- ═════════════════════════════════════════════════════════════════
alter table tables
  add column if not exists redirect_to_restaurant_id uuid references restaurants(id) on delete set null;

-- ═════════════════════════════════════════════════════════════════
-- 2. "Let the customer choose" mode: instead of auto-redirecting, show a
--    picker of the account's restaurants and let the customer decide which
--    one they're ordering from. Toggle on/off per restaurant.
-- ═════════════════════════════════════════════════════════════════
alter table restaurants
  add column if not exists qr_choice_enabled boolean not null default false;
