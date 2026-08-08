-- Wegemo — Reset order/transaction history for Médina Tacos + La Gratinade ONLY
-- (entering real production — accounting starts fresh, everything else kept:
-- menu, categories, photos, composition sub-groups, QR codes/tables, settings)
--
-- Run this in: Supabase Dashboard > SQL Editor > New query
--
-- Unlike reset_orders.sql (which wipes ALL restaurants), this script targets
-- exactly these two restaurants by id, so any other client already using the
-- platform is completely unaffected.

do $$
declare
  target_ids uuid[];
begin
  select array_agg(id) into target_ids
  from restaurants
  where slug in ('medina-tacos', 'la-gratinade')
     or name ilike '%medina%tacos%'
     or name ilike '%gratinade%';

  if target_ids is null or array_length(target_ids, 1) is null then
    raise exception 'No matching restaurants found — aborting to avoid wiping the wrong data. Check the slug/name filters above.';
  end if;

  raise notice 'Resetting order history for % restaurant(s): %', array_length(target_ids, 1), target_ids;

  delete from order_items where order_id in (
    select id from orders where restaurant_id = any(target_ids)
  );

  delete from reviews where restaurant_id = any(target_ids);

  delete from orders where restaurant_id = any(target_ids);

  delete from customers where restaurant_id = any(target_ids);

  -- Reset Vendus fiscal invoice counters/links so old invoice references
  -- don't linger on (now-deleted) orders — nothing to reset here since the
  -- orders themselves are gone, this is just informational.
end $$;

-- NOT touched (kept intact for both restaurants):
--   menu_items (menu, photos, supplements/extras sub-groups), tables (QR codes),
--   restaurant_settings (Stripe/Vendus/Resend config, category order, backgrounds),
--   promotions, restaurants row itself (name, slug, nif, is_payment_master...)
