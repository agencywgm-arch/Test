-- ─────────────────────────────────────────────────────────────────────────────
-- SEED — Baoma Burger (Courbevoie)
-- Coller dans Supabase → SQL Editor → Run
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_owner   uuid;
  v_resto   uuid;
begin

  -- Récupère l'owner via son email
  select id into v_owner from auth.users where email = 'agencywgm@gmail.com' limit 1;
  if v_owner is null then
    raise exception 'Utilisateur introuvable — vérifie l''email dans le script';
  end if;

  -- Crée le restaurant
  insert into restaurants (owner_id, name, slug, address, logo_emoji)
  values (v_owner, 'Baoma Burger', 'baoma-burger', '54 avenue Puvis de Chavannes – Courbevoie', '🍔')
  returning id into v_resto;

  -- Tables (1 → 15)
  for i in 1..15 loop
    insert into tables (restaurant_id, number) values (v_resto, i);
  end loop;

  -- ── NOUVEAUTÉ ───────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock) values
    (v_resto, 'Croissmash', 'Croissant au beurre, sauce BBQ, sauce Smoky Bacon, salade, double cheddar, double steak smashés', 12.90, 'Nouveauté', '🥐', true, true, 18);

  -- ── MENUS ───────────────────────────────────────────────────────────────────
  -- Les menus sont illimités (stock null = pas de suivi)
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available) values
    (v_resto, 'Menu Midi', 'Burger + Frites (Végé, Fried Chicken, Cheese Burger, Smash Bao ou Chicken Thaï) — valable lun-ven 12h-15h. +1.50€ boisson / +3.50€ cocktail', 12.90, 'Menus', '🕛', true, true),
    (v_resto, 'Menu Enfant', 'Burger ou Nuggets + 1 Frite + 1 Boisson + 1 Compote ou 1 boule de Glace', 8.90, 'Menus', '👶', false, true);

  -- ── STARTERS ────────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock) values
    (v_resto, 'Nêms Poulet',         '2 pièces', 3.90, 'Starters', '🥟', false, true, 40),
    (v_resto, 'Nêms Crevette',       '2 pièces', 3.90, 'Starters', '🥟', false, true, 35),
    (v_resto, 'Gyoza Crevette',      '2 pièces', 3.90, 'Starters', '🥟', false, true, 30),
    (v_resto, 'Tempura Crevette',    '2 pièces', 3.90, 'Starters', '🍤', false, true, 28),
    (v_resto, 'Chicken Rasengan',    'Starter signature', 6.90, 'Starters', '🍗', true, true, 22),
    (v_resto, 'Chidori Shrimp',      'Starter signature crevette', 7.90, 'Starters', '🦐', true, true, 15),
    (v_resto, 'Boeuf Fromage Crunchy', '2 pièces', 6.90, 'Starters', '🧀', false, true, 20),
    (v_resto, 'Boeuf Fromage',       '2 pièces', 6.00, 'Starters', '🧀', false, true, 24);

  -- ── WINGS ───────────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock) values
    (v_resto, 'Wings Korean Style',   '4 pièces', 6.00, 'Wings', '🍗', false, true, 30),
    (v_resto, 'Wings Thaï Style',     '4 pièces', 6.00, 'Wings', '🍗', false, true, 30),
    (v_resto, 'Wings Moutarde Miel',  '4 pièces', 6.00, 'Wings', '🍗', false, true, 25);

  -- ── SMASH BAO ───────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock) values
    (v_resto, 'Crazy Champi',    'Smash Bao signature', 17.90, 'Smash Bao', '🍄', true,  true, 12),
    (v_resto, 'Smash Choji',     'Smash Bao signature', 15.90, 'Smash Bao', '🍔', true,  true, 20),
    (v_resto, 'Smash Bao Burger','Smash Bao classic',   13.90, 'Smash Bao', '🍔', false, true, 25),
    (v_resto, 'Konoha Smash',    'Smash Bao signature', 14.90, 'Smash Bao', '🍔', true,  true, 18),
    (v_resto, 'Smash Truffé',    'Smash Bao à la truffe', 17.90, 'Smash Bao', '🍔', true, true, 8),
    (v_resto, 'Smash Cheese',    'Smash Bao fromage',   11.90, 'Smash Bao', '🍔', false, true, 22);

  -- ── BAO CRÉATIONS ────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock) values
    (v_resto, 'Bao Boeuf Croustillant',      'Bao création', 14.90, 'Bao Créations', '🥙', false, true, 16),
    (v_resto, 'Bao Boeuf Fondant',           'Bao création', 14.90, 'Bao Créations', '🥙', false, true, 14),
    (v_resto, 'Bao Poulet Croustillant',     'Bao création', 14.90, 'Bao Créations', '🥙', false, true, 18),
    (v_resto, 'Fried Chicken / Spicy',       'Bao Fried Chicken épicé', 12.90, 'Bao Créations', '🌶️', true, true, 20),
    (v_resto, 'Fried Chicken Moutarde Miel', 'Bao Fried Chicken sauce moutarde miel', 12.90, 'Bao Créations', '🥙', false, true, 15),
    (v_resto, 'Bao Chicken Thaï',            'Bao saveurs thaïlandaises', 12.90, 'Bao Créations', '🥙', true, true, 22),
    (v_resto, 'Bao Végé',                    'Bao végétarien', 12.90, 'Bao Créations', '🌿', false, true, 10);

  -- ── ASIAN FUSION ────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock) values
    (v_resto, 'Asian Boeuf Croustillant', 'Asian Fusion', 14.90, 'Asian Fusion', '🥢', false, true, 14),
    (v_resto, 'Crousty Chicken',          'Asian Fusion', 13.90, 'Asian Fusion', '🥢', false, true, 18),
    (v_resto, 'Asian Poulet Croustillant','Asian Fusion', 13.90, 'Asian Fusion', '🥢', false, true, 16),
    (v_resto, 'Poulet Thaï',              'Asian Fusion', 13.50, 'Asian Fusion', '🥢', true,  true, 20),
    (v_resto, 'Crevette Thaï',            'Asian Fusion', 14.90, 'Asian Fusion', '🦐', true,  true, 12);

  -- ── ACCOMPAGNEMENTS ─────────────────────────────────────────────────────────
  -- Frites = illimitées (pommes de terre en stock continu), pas de suivi unitaire
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available) values
    (v_resto, 'Frites Maison',        'Frites fraîches', 3.00, 'Accompagnements', '🍟', true,  true),
    (v_resto, 'Frites Paprika',       'Frites assaisonnées au paprika', 3.50, 'Accompagnements', '🍟', false, true),
    (v_resto, 'Frites Patate Douce',  'Frites de patate douce', 4.00, 'Accompagnements', '🍠', false, true),
    (v_resto, 'Frites Cheddar Maison','Frites nappées de cheddar maison', 4.50, 'Accompagnements', '🧀', true,  true),
    (v_resto, 'Frites Bacon Cheddar', 'Frites, bacon croustillant et cheddar', 5.50, 'Accompagnements', '🥓', true,  true);

  -- ── DESSERTS ────────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock) values
    (v_resto, 'Cheesecake Fruits Rouges', 'Cheesecake fruits rouges maison', 6.90, 'Desserts', '🍰', false, true, 7),
    (v_resto, 'Cheesecake Mangue',        'Cheesecake à la mangue', 6.90, 'Desserts', '🍰', false, true, 6),
    (v_resto, 'Cheesecake Caramel',       'Cheesecake au caramel', 6.90, 'Desserts', '🍰', false, true, 5),
    (v_resto, 'Brioche Perdue Caramel',   'Brioche perdue sauce caramel', 8.90, 'Desserts', '🍮', true,  true, 9),
    (v_resto, 'Brioche Perdue Chocolat',  'Brioche perdue sauce chocolat', 8.90, 'Desserts', '🍫', true,  true, 9),
    (v_resto, 'Brookie au Chocolat',      'Brownie + cookie au chocolat', 6.50, 'Desserts', '🍪', false, true, 11);

  -- ── COCKTAILS ───────────────────────────────────────────────────────────────
  -- Cocktails préparés à la commande = illimités
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available) values
    (v_resto, 'Mojito Violette',  'Cocktail maison', 5.50, 'Cocktails', '🍹', false, true),
    (v_resto, 'Mojito Passion',   'Cocktail maison', 5.50, 'Cocktails', '🍹', false, true),
    (v_resto, 'Mojito Cerise',    'Cocktail maison', 5.50, 'Cocktails', '🍹', false, true),
    (v_resto, 'Mojito Kiwi',      'Cocktail maison', 5.50, 'Cocktails', '🍹', false, true),
    (v_resto, 'Mojito Classique', 'Cocktail maison', 5.50, 'Cocktails', '🍹', true,  true),
    (v_resto, 'Thé Glacé',        'Thé glacé maison', 5.50, 'Cocktails', '🧊', false, true);

  -- ── BOISSONS ────────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock) values
    (v_resto, 'Soft',       'Pepsi, Pepsi Zero, Pepsi Cherry, Schweppes Pomme, Schweppes Agrumes, Orangina, Oasis Tropical, Ice Tea, Perrier, Eau', 2.50, 'Boissons', '🥤', false, true, 60),
    (v_resto, 'Thé ou Café','Thé ou café chaud', 2.00, 'Boissons', '☕', false, true, 40);

  raise notice 'Baoma Burger créé avec succès ! ID restaurant : %', v_resto;
end $$;
