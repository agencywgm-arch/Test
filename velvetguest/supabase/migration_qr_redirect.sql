-- Wegemo — Reuse already-printed QR codes for a different restaurant
-- Run this in: Supabase Dashboard > SQL Editor > New query
--
-- Adds `redirect_to_restaurant_id` on `restaurants`. When set, every QR code
-- already printed for THIS restaurant (which hardcodes its id in the URL)
-- transparently serves the target restaurant's menu/tables/orders instead —
-- with zero change to the physical QR code image.

alter table restaurants
  add column if not exists redirect_to_restaurant_id uuid references restaurants(id) on delete set null;

-- A restaurant can never redirect to itself (would show its own menu anyway,
-- but this avoids confusing/broken state).
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'restaurants' and constraint_name = 'restaurants_no_self_redirect'
  ) then
    alter table restaurants
      add constraint restaurants_no_self_redirect check (redirect_to_restaurant_id <> id);
  end if;
end $$;
