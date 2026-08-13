-- Wegemo — Rebuild the CRM `customers` table from existing order history
-- Run this AFTER the RLS fix (migration_scans_and_crm_fix.sql / the insert+
-- update policies) so future orders keep writing correctly too.
--
-- WHY: `customers` never accepted anonymous writes, so no order ever made it
-- into the CRM even though every order already stores customer_name,
-- customer_email and customer_nif directly. This reconstructs accurate
-- customer profiles (visit count, total spent, first/last visit) from that
-- existing order data. Nothing on `orders` is touched or deleted.
--
-- LIMITATION: phone numbers were only ever meant to be stored on `customers`,
-- never on `orders`, so phone numbers customers already gave in the past are
-- not recoverable this way — going forward they will be saved correctly.

-- The stats trigger normally forces order_count=1 / total_spent=last_order on
-- INSERT (it's designed for one-order-at-a-time upserts from the app, not a
-- bulk historical backfill) — disable it just for this one operation so the
-- real aggregated history is written instead, then re-enable it immediately.
alter table customers disable trigger customer_stats_trigger;

insert into customers (restaurant_id, email, first_name, nif, first_visit, last_visit, order_count, total_spent, last_order_total)
select
  o.restaurant_id,
  lower(trim(o.customer_email)) as email,
  (array_agg(o.customer_name order by o.created_at desc) filter (where o.customer_name is not null and o.customer_name <> ''))[1] as first_name,
  (array_agg(o.customer_nif order by o.created_at desc) filter (where o.customer_nif is not null))[1] as nif,
  min(o.created_at)::date as first_visit,
  max(o.created_at)::date as last_visit,
  count(*) as order_count,
  sum(o.total) as total_spent,
  (array_agg(o.total order by o.created_at desc))[1] as last_order_total
from orders o
where o.customer_email is not null and trim(o.customer_email) <> ''
group by o.restaurant_id, lower(trim(o.customer_email))
on conflict (restaurant_id, email) do update set
  first_name = excluded.first_name,
  nif = coalesce(excluded.nif, customers.nif),
  first_visit = least(customers.first_visit, excluded.first_visit),
  last_visit = greatest(customers.last_visit, excluded.last_visit),
  order_count = excluded.order_count,
  total_spent = excluded.total_spent,
  last_order_total = excluded.last_order_total;

alter table customers enable trigger customer_stats_trigger;

-- Verify:
-- select first_name, email, nif, order_count, total_spent, last_visit
-- from customers order by last_visit desc;
