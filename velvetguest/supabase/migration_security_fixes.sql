-- ══════════════════════════════════════════════════════════════
-- WEGEMO — Security fixes migration
-- À exécuter dans Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- 1. FIX RLS: orders — remove "select all" policy
-- ─────────────────────────────────────────
-- Drop the overly permissive select policy
drop policy if exists "Anyone can read orders by id" on orders;

-- Customers need to track their own order by UUID.
-- Since anonymous clients have no auth, we expose orders only
-- via a SECURITY DEFINER function (see below).
-- Authenticated restaurant owners can still read via "Owner manages orders".

-- ─────────────────────────────────────────
-- 2. FIX RLS: order_items — remove "select all" policy
-- ─────────────────────────────────────────
drop policy if exists "Anyone can read own order items" on order_items;

-- ─────────────────────────────────────────
-- 3. RPC: get_order_status — for customer order tracking
-- Allows anonymous clients to fetch ONE specific order by its UUID.
-- SECURITY DEFINER bypasses RLS safely since we filter by exact id.
-- ─────────────────────────────────────────
create or replace function get_order_status(p_order_id uuid)
returns table (
  id uuid,
  status text,
  total numeric,
  table_number int,
  created_at timestamptz,
  items jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    o.id,
    o.status,
    o.total,
    t.number as table_number,
    o.created_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
        'name', mi.name,
        'emoji', mi.emoji,
        'quantity', oi.quantity
      ))
      from order_items oi
      join menu_items mi on mi.id = oi.menu_item_id
      where oi.order_id = o.id
      ), '[]'::jsonb
    ) as items
  from orders o
  left join tables t on t.id = o.table_id
  where o.id = p_order_id;
end;
$$;

-- Grant execute to anon and authenticated roles
grant execute on function get_order_status(uuid) to anon, authenticated;

-- ─────────────────────────────────────────
-- 4. ADD stock column to menu_items (if missing)
-- ─────────────────────────────────────────
alter table menu_items add column if not exists stock integer;

-- ─────────────────────────────────────────
-- 5. CREATE campaign_logs table
-- ─────────────────────────────────────────
create table if not exists campaign_logs (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  subject       text not null default '',
  sent_count    integer not null default 0,
  failed_count  integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table campaign_logs enable row level security;

create policy "Owner manages campaign_logs"
  on campaign_logs for all
  using (
    exists (
      select 1 from restaurants r
      where r.id = campaign_logs.restaurant_id and r.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- 6. RLS: ingredients / recipe_items — restrict to owner
-- ─────────────────────────────────────────
drop policy if exists "Anyone can read ingredients" on ingredients;
drop policy if exists "Anyone can read recipe_items" on recipe_items;

-- Only authenticated owners can read their own ingredients/recipes
-- (already covered by "Owner manages" policies)
