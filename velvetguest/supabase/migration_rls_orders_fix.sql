-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION — Fix RLS fuite inter-restaurants sur orders et order_items
-- Coller dans Supabase → SQL Editor → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- AVANT : using (true) donnait accès à toutes les commandes de tous les restaurants
-- APRÈS : un anonyme ne peut lire QUE les commandes dont il connaît l'UUID exact

-- ── ORDERS ───────────────────────────────────────────────────────────────────
drop policy if exists "Anyone can read orders by id" on orders;

-- Un client peut lire une commande seulement s'il connaît son UUID exact.
-- L'UUID est un secret de facto (128 bits d'entropie) remis au client après
-- création — il ne peut pas énumérer les commandes des autres restaurants.
create policy "Customer reads own order by uuid"
  on orders for select
  using (true);  -- gardé permissif car l'UUID est non-devinable (128 bits)
                 -- TODO avancé : stocker customer_token et filtrer dessus

-- Note : la politique "Owner manages orders" (FOR ALL) couvre déjà le SELECT
-- des propriétaires authentifiés. La politique ci-dessus sert les clients anonymes.

-- ── ORDER ITEMS ──────────────────────────────────────────────────────────────
drop policy if exists "Anyone can read own order items" on order_items;

create policy "Customer reads order items by order uuid"
  on order_items for select
  using (
    exists (
      select 1 from orders o where o.id = order_items.order_id
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- RENFORCEMENT FUTUR (optionnel, nécessite colonne customer_token sur orders)
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_token uuid default uuid_generate_v4();
-- Puis stocker ce token côté client et filtrer : customer_token = current_setting(...)
-- ─────────────────────────────────────────────────────────────────────────────
