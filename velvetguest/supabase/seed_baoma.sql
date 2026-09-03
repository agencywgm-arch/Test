-- ─────────────────────────────────────────────────────────────────────────────
-- SEED — Baoma Burger (Courbevoie)
-- Coller dans Supabase → SQL Editor → Run
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_owner   uuid;
  v_resto   uuid;

  -- ── Ingrédients ─────────────────────────────────────────────────────────────
  v_boeuf        uuid;  -- Steak bœuf haché
  v_poulet       uuid;  -- Cuisses / filets de poulet
  v_crevette     uuid;  -- Crevettes
  v_bao          uuid;  -- Pains bao
  v_croissant    uuid;  -- Croissants au beurre
  v_cheddar      uuid;  -- Cheddar
  v_salade       uuid;  -- Salade verte
  v_tomate       uuid;  -- Tomates
  v_champi       uuid;  -- Champignons
  v_sauce_bbq    uuid;  -- Sauce BBQ
  v_sauce_smoky  uuid;  -- Sauce Smoky Bacon
  v_sauce_korean uuid;  -- Sauce coréenne
  v_sauce_thai   uuid;  -- Sauce thaï
  v_moutarde     uuid;  -- Moutarde
  v_miel         uuid;  -- Miel
  v_truffe       uuid;  -- Huile de truffe
  v_pdterre      uuid;  -- Pommes de terre
  v_pdouce       uuid;  -- Patate douce
  v_bacon        uuid;  -- Bacon
  v_farine       uuid;  -- Farine (panure)
  v_fromb        uuid;  -- Fromage blanc (cheesecakes)
  v_frrouge      uuid;  -- Fruits rouges
  v_mangue       uuid;  -- Mangue
  v_chocolat     uuid;  -- Chocolat noir
  v_brioche      uuid;  -- Brioches
  v_creme        uuid;  -- Crème fraîche
  v_menthe       uuid;  -- Menthe fraîche
  v_citron       uuid;  -- Citrons verts
  v_sucre        uuid;  -- Sucre de canne
  v_soft         uuid;  -- Canettes soft
  v_cafe         uuid;  -- Café / thé

  -- ── Menu items ──────────────────────────────────────────────────────────────
  v_croissmash       uuid;
  v_nems_poulet      uuid;
  v_nems_crev        uuid;
  v_gyoza            uuid;
  v_tempura          uuid;
  v_rasengan         uuid;
  v_chidori          uuid;
  v_bf_crunchy       uuid;
  v_bf               uuid;
  v_wings_korean     uuid;
  v_wings_thai       uuid;
  v_wings_mm         uuid;
  v_crazy_champi     uuid;
  v_smash_choji      uuid;
  v_smash_bao        uuid;
  v_konoha           uuid;
  v_smash_truffe     uuid;
  v_smash_cheese     uuid;
  v_bao_bf_crunchy   uuid;
  v_bao_bf_fondant   uuid;
  v_bao_pc           uuid;
  v_fried_spicy      uuid;
  v_fried_mm         uuid;
  v_bao_thai         uuid;
  v_bao_vege         uuid;
  v_asian_bf         uuid;
  v_crousty          uuid;
  v_asian_pc         uuid;
  v_poulet_thai      uuid;
  v_crev_thai        uuid;
  v_frites           uuid;
  v_frites_paprika   uuid;
  v_frites_pdouce    uuid;
  v_frites_cheddar   uuid;
  v_frites_bacon     uuid;
  v_ck_frrouge       uuid;
  v_ck_mangue        uuid;
  v_ck_caramel       uuid;
  v_bp_caramel       uuid;
  v_bp_choco         uuid;
  v_brookie          uuid;
  v_mojito_class     uuid;
  v_mojito_viol      uuid;
  v_mojito_pass      uuid;
  v_mojito_cerise    uuid;
  v_mojito_kiwi      uuid;
  v_the_glace        uuid;
  v_soft_item        uuid;
  v_cafe_item        uuid;

begin

  -- ── Owner ────────────────────────────────────────────────────────────────────
  select id into v_owner from auth.users where email = 'agencywgm@gmail.com' limit 1;
  if v_owner is null then
    raise exception 'Utilisateur introuvable — vérifie l''email dans le script';
  end if;

  -- ── Restaurant ───────────────────────────────────────────────────────────────
  insert into restaurants (owner_id, name, slug, address, logo_emoji)
  values (v_owner, 'Baoma Burger', 'baoma-burger', '54 avenue Puvis de Chavannes – Courbevoie', '🍔')
  returning id into v_resto;

  -- ── Tables (1 → 15) ──────────────────────────────────────────────────────────
  for i in 1..15 loop
    insert into tables (restaurant_id, number) values (v_resto, i);
  end loop;

  -- ════════════════════════════════════════════════════════════════════════════
  -- INGRÉDIENTS
  -- ════════════════════════════════════════════════════════════════════════════

  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Steak bœuf haché',    'kg',  '🥩', 12.0, 3.0)   returning id into v_boeuf;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Poulet (filets)',      'kg',  '🍗', 10.0, 3.0)   returning id into v_poulet;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Crevettes',            'kg',  '🦐', 4.0,  1.5)   returning id into v_crevette;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Pains bao',            'pcs', '🥖', 120,  30)    returning id into v_bao;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Croissants au beurre', 'pcs', '🥐', 20,   5)     returning id into v_croissant;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Cheddar',              'kg',  '🧀', 5.0,  1.0)   returning id into v_cheddar;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Salade verte',         'kg',  '🥬', 3.0,  0.8)   returning id into v_salade;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Tomates',              'kg',  '🍅', 4.0,  1.0)   returning id into v_tomate;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Champignons',          'kg',  '🍄', 3.0,  0.8)   returning id into v_champi;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Sauce BBQ',            'L',   '🍶', 4.0,  1.0)   returning id into v_sauce_bbq;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Sauce Smoky Bacon',    'L',   '🍶', 3.0,  0.8)   returning id into v_sauce_smoky;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Sauce coréenne',       'L',   '🌶', 3.5,  0.8)   returning id into v_sauce_korean;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Sauce thaï',           'L',   '🌿', 4.0,  1.0)   returning id into v_sauce_thai;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Moutarde',             'L',   '🟡', 2.0,  0.5)   returning id into v_moutarde;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Miel',                 'kg',  '🍯', 3.0,  0.5)   returning id into v_miel;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Huile de truffe',      'mL',  '🫙', 500,  100)   returning id into v_truffe;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Pommes de terre',      'kg',  '🥔', 40.0, 10.0)  returning id into v_pdterre;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Patate douce',         'kg',  '🍠', 15.0, 4.0)   returning id into v_pdouce;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Bacon',                'kg',  '🥓', 3.0,  0.8)   returning id into v_bacon;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Farine (panure)',      'kg',  '🌾', 8.0,  2.0)   returning id into v_farine;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Fromage blanc',        'kg',  '🥛', 4.0,  1.0)   returning id into v_fromb;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Fruits rouges',        'kg',  '🍓', 2.0,  0.5)   returning id into v_frrouge;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Mangue',               'kg',  '🥭', 2.0,  0.5)   returning id into v_mangue;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Chocolat noir',        'kg',  '🍫', 3.0,  0.6)   returning id into v_chocolat;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Brioches',             'pcs', '🍞', 30,   8)     returning id into v_brioche;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Crème fraîche',        'L',   '🥛', 3.0,  0.8)   returning id into v_creme;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Menthe fraîche',       'bouquets', '🌿', 15, 4)  returning id into v_menthe;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Citrons verts',        'pcs', '🍋', 40,   10)    returning id into v_citron;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Sucre de canne',       'kg',  '🍬', 5.0,  1.0)   returning id into v_sucre;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Canettes / soft',      'pcs', '🥤', 72,   20)    returning id into v_soft;
  insert into ingredients (restaurant_id, name, unit, emoji, stock, alert_threshold)
  values (v_resto, 'Café / thé (doses)',   'pcs', '☕', 80,   20)    returning id into v_cafe;

  -- ════════════════════════════════════════════════════════════════════════════
  -- MENU ITEMS
  -- ════════════════════════════════════════════════════════════════════════════

  -- ── NOUVEAUTÉ ────────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Croissmash', 'Croissant au beurre, sauce BBQ, sauce Smoky Bacon, salade, double cheddar, double steak smashés', 12.90, 'Nouveauté', '🥐', true, true, 18)
  returning id into v_croissmash;

  -- ── MENUS (illimités) ────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available) values
    (v_resto, 'Menu Midi',   'Burger + Frites (Végé, Fried Chicken, Cheese Burger, Smash Bao ou Chicken Thaï) — valable lun-ven 12h-15h. +1.50€ boisson / +3.50€ cocktail', 12.90, 'Menus', '🕛', true,  true),
    (v_resto, 'Menu Enfant', 'Burger ou Nuggets + 1 Frite + 1 Boisson + 1 Compote ou 1 boule de Glace', 8.90, 'Menus', '👶', false, true);

  -- ── STARTERS ─────────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Nêms Poulet', '2 pièces', 3.90, 'Starters', '🥟', false, true, 40) returning id into v_nems_poulet;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Nêms Crevette', '2 pièces', 3.90, 'Starters', '🥟', false, true, 35) returning id into v_nems_crev;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Gyoza Crevette', '2 pièces', 3.90, 'Starters', '🥟', false, true, 30) returning id into v_gyoza;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Tempura Crevette', '2 pièces', 3.90, 'Starters', '🍤', false, true, 28) returning id into v_tempura;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Chicken Rasengan', 'Starter signature', 6.90, 'Starters', '🍗', true, true, 22) returning id into v_rasengan;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Chidori Shrimp', 'Starter signature crevette', 7.90, 'Starters', '🦐', true, true, 15) returning id into v_chidori;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Boeuf Fromage Crunchy', '2 pièces', 6.90, 'Starters', '🧀', false, true, 20) returning id into v_bf_crunchy;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Boeuf Fromage', '2 pièces', 6.00, 'Starters', '🧀', false, true, 24) returning id into v_bf;

  -- ── WINGS ────────────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Wings Korean Style', '4 pièces', 6.00, 'Wings', '🍗', false, true, 30) returning id into v_wings_korean;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Wings Thaï Style', '4 pièces', 6.00, 'Wings', '🍗', false, true, 30) returning id into v_wings_thai;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Wings Moutarde Miel', '4 pièces', 6.00, 'Wings', '🍗', false, true, 25) returning id into v_wings_mm;

  -- ── SMASH BAO ────────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Crazy Champi', 'Smash Bao signature', 17.90, 'Smash Bao', '🍄', true, true, 12) returning id into v_crazy_champi;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Smash Choji', 'Smash Bao signature', 15.90, 'Smash Bao', '🍔', true, true, 20) returning id into v_smash_choji;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Smash Bao Burger', 'Smash Bao classic', 13.90, 'Smash Bao', '🍔', false, true, 25) returning id into v_smash_bao;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Konoha Smash', 'Smash Bao signature', 14.90, 'Smash Bao', '🍔', true, true, 18) returning id into v_konoha;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Smash Truffé', 'Smash Bao à la truffe', 17.90, 'Smash Bao', '🍔', true, true, 8) returning id into v_smash_truffe;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Smash Cheese', 'Smash Bao fromage', 11.90, 'Smash Bao', '🍔', false, true, 22) returning id into v_smash_cheese;

  -- ── BAO CRÉATIONS ────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Bao Boeuf Croustillant', 'Bao création', 14.90, 'Bao Créations', '🥙', false, true, 16) returning id into v_bao_bf_crunchy;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Bao Boeuf Fondant', 'Bao création', 14.90, 'Bao Créations', '🥙', false, true, 14) returning id into v_bao_bf_fondant;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Bao Poulet Croustillant', 'Bao création', 14.90, 'Bao Créations', '🥙', false, true, 18) returning id into v_bao_pc;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Fried Chicken / Spicy', 'Bao Fried Chicken épicé', 12.90, 'Bao Créations', '🌶️', true, true, 20) returning id into v_fried_spicy;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Fried Chicken Moutarde Miel', 'Bao Fried Chicken sauce moutarde miel', 12.90, 'Bao Créations', '🥙', false, true, 15) returning id into v_fried_mm;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Bao Chicken Thaï', 'Bao saveurs thaïlandaises', 12.90, 'Bao Créations', '🥙', true, true, 22) returning id into v_bao_thai;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Bao Végé', 'Bao végétarien', 12.90, 'Bao Créations', '🌿', false, true, 10) returning id into v_bao_vege;

  -- ── ASIAN FUSION ─────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Asian Boeuf Croustillant', 'Asian Fusion', 14.90, 'Asian Fusion', '🥢', false, true, 14) returning id into v_asian_bf;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Crousty Chicken', 'Asian Fusion', 13.90, 'Asian Fusion', '🥢', false, true, 18) returning id into v_crousty;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Asian Poulet Croustillant', 'Asian Fusion', 13.90, 'Asian Fusion', '🥢', false, true, 16) returning id into v_asian_pc;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Poulet Thaï', 'Asian Fusion', 13.50, 'Asian Fusion', '🥢', true, true, 20) returning id into v_poulet_thai;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Crevette Thaï', 'Asian Fusion', 14.90, 'Asian Fusion', '🦐', true, true, 12) returning id into v_crev_thai;

  -- ── ACCOMPAGNEMENTS (illimités) ───────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available)
  values (v_resto, 'Frites Maison', 'Frites fraîches', 3.00, 'Accompagnements', '🍟', true, true) returning id into v_frites;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available)
  values (v_resto, 'Frites Paprika', 'Frites assaisonnées au paprika', 3.50, 'Accompagnements', '🍟', false, true) returning id into v_frites_paprika;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available)
  values (v_resto, 'Frites Patate Douce', 'Frites de patate douce', 4.00, 'Accompagnements', '🍠', false, true) returning id into v_frites_pdouce;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available)
  values (v_resto, 'Frites Cheddar Maison', 'Frites nappées de cheddar maison', 4.50, 'Accompagnements', '🧀', true, true) returning id into v_frites_cheddar;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available)
  values (v_resto, 'Frites Bacon Cheddar', 'Frites, bacon croustillant et cheddar', 5.50, 'Accompagnements', '🥓', true, true) returning id into v_frites_bacon;

  -- ── DESSERTS ──────────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Cheesecake Fruits Rouges', 'Cheesecake fruits rouges maison', 6.90, 'Desserts', '🍰', false, true, 7) returning id into v_ck_frrouge;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Cheesecake Mangue', 'Cheesecake à la mangue', 6.90, 'Desserts', '🍰', false, true, 6) returning id into v_ck_mangue;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Cheesecake Caramel', 'Cheesecake au caramel', 6.90, 'Desserts', '🍰', false, true, 5) returning id into v_ck_caramel;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Brioche Perdue Caramel', 'Brioche perdue sauce caramel', 8.90, 'Desserts', '🍮', true, true, 9) returning id into v_bp_caramel;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Brioche Perdue Chocolat', 'Brioche perdue sauce chocolat', 8.90, 'Desserts', '🍫', true, true, 9) returning id into v_bp_choco;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Brookie au Chocolat', 'Brownie + cookie au chocolat', 6.50, 'Desserts', '🍪', false, true, 11) returning id into v_brookie;

  -- ── COCKTAILS (illimités) ─────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available)
  values (v_resto, 'Mojito Classique', 'Cocktail maison', 5.50, 'Cocktails', '🍹', true,  true) returning id into v_mojito_class;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available)
  values (v_resto, 'Mojito Violette',  'Cocktail maison', 5.50, 'Cocktails', '🍹', false, true) returning id into v_mojito_viol;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available)
  values (v_resto, 'Mojito Passion',   'Cocktail maison', 5.50, 'Cocktails', '🍹', false, true) returning id into v_mojito_pass;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available)
  values (v_resto, 'Mojito Cerise',    'Cocktail maison', 5.50, 'Cocktails', '🍹', false, true) returning id into v_mojito_cerise;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available)
  values (v_resto, 'Mojito Kiwi',      'Cocktail maison', 5.50, 'Cocktails', '🍹', false, true) returning id into v_mojito_kiwi;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available)
  values (v_resto, 'Thé Glacé',        'Thé glacé maison', 5.50, 'Cocktails', '🧊', false, true) returning id into v_the_glace;

  -- ── BOISSONS ─────────────────────────────────────────────────────────────────
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Soft', 'Pepsi, Pepsi Zero, Pepsi Cherry, Schweppes Pomme, Schweppes Agrumes, Orangina, Oasis Tropical, Ice Tea, Perrier, Eau', 2.50, 'Boissons', '🥤', false, true, 60) returning id into v_soft_item;
  insert into menu_items (restaurant_id, name, description, price, category, emoji, is_popular, available, stock)
  values (v_resto, 'Thé ou Café', 'Thé ou café chaud', 2.00, 'Boissons', '☕', false, true, 40) returning id into v_cafe_item;

  -- ════════════════════════════════════════════════════════════════════════════
  -- RECETTES (ingredient → menu_item avec qty_per_portion)
  -- ════════════════════════════════════════════════════════════════════════════

  -- Croissmash : double steak, croissant, sauce BBQ, sauce smoky, salade, double cheddar
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_croissmash, v_boeuf,       0.200),
    (v_croissmash, v_croissant,   1),
    (v_croissmash, v_sauce_bbq,   0.040),
    (v_croissmash, v_sauce_smoky, 0.040),
    (v_croissmash, v_salade,      0.030),
    (v_croissmash, v_cheddar,     0.060);

  -- Nêms Poulet (2 pcs surgelés)
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_nems_poulet, v_poulet, 0.060),
    (v_nems_poulet, v_farine, 0.020);

  -- Nêms Crevette (2 pcs)
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_nems_crev, v_crevette, 0.060),
    (v_nems_crev, v_farine,   0.020);

  -- Gyoza Crevette (2 pcs)
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_gyoza, v_crevette, 0.070),
    (v_gyoza, v_farine,   0.025);

  -- Tempura Crevette (2 pcs)
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_tempura, v_crevette, 0.080),
    (v_tempura, v_farine,   0.030);

  -- Chicken Rasengan
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_rasengan, v_poulet,       0.150),
    (v_rasengan, v_farine,       0.040),
    (v_rasengan, v_sauce_korean, 0.030);

  -- Chidori Shrimp
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_chidori, v_crevette,    0.120),
    (v_chidori, v_farine,      0.040),
    (v_chidori, v_sauce_thai,  0.030);

  -- Boeuf Fromage Crunchy (2 pcs)
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_bf_crunchy, v_boeuf,   0.100),
    (v_bf_crunchy, v_cheddar, 0.040),
    (v_bf_crunchy, v_farine,  0.030);

  -- Boeuf Fromage (2 pcs)
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_bf, v_boeuf,   0.100),
    (v_bf, v_cheddar, 0.040);

  -- Wings Korean Style (4 pcs)
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_wings_korean, v_poulet,       0.220),
    (v_wings_korean, v_sauce_korean, 0.040),
    (v_wings_korean, v_farine,       0.030);

  -- Wings Thaï Style (4 pcs)
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_wings_thai, v_poulet,      0.220),
    (v_wings_thai, v_sauce_thai,  0.040),
    (v_wings_thai, v_farine,      0.030);

  -- Wings Moutarde Miel (4 pcs)
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_wings_mm, v_poulet,   0.220),
    (v_wings_mm, v_moutarde, 0.025),
    (v_wings_mm, v_miel,     0.020),
    (v_wings_mm, v_farine,   0.030);

  -- Crazy Champi
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_crazy_champi, v_bao,     1),
    (v_crazy_champi, v_champi,  0.120),
    (v_crazy_champi, v_cheddar, 0.060),
    (v_crazy_champi, v_salade,  0.025);

  -- Smash Choji
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_smash_choji, v_bao,       1),
    (v_smash_choji, v_boeuf,     0.160),
    (v_smash_choji, v_cheddar,   0.050),
    (v_smash_choji, v_sauce_bbq, 0.030),
    (v_smash_choji, v_salade,    0.025);

  -- Smash Bao Burger
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_smash_bao, v_bao,     1),
    (v_smash_bao, v_boeuf,   0.150),
    (v_smash_bao, v_cheddar, 0.050),
    (v_smash_bao, v_salade,  0.025),
    (v_smash_bao, v_tomate,  0.040);

  -- Konoha Smash
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_konoha, v_bao,          1),
    (v_konoha, v_boeuf,        0.160),
    (v_konoha, v_sauce_korean, 0.035),
    (v_konoha, v_salade,       0.025);

  -- Smash Truffé
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_smash_truffe, v_bao,     1),
    (v_smash_truffe, v_boeuf,   0.160),
    (v_smash_truffe, v_cheddar, 0.060),
    (v_smash_truffe, v_truffe,  8);   -- 8 mL d'huile de truffe

  -- Smash Cheese
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_smash_cheese, v_bao,     1),
    (v_smash_cheese, v_boeuf,   0.150),
    (v_smash_cheese, v_cheddar, 0.080);

  -- Bao Boeuf Croustillant
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_bao_bf_crunchy, v_bao,     1),
    (v_bao_bf_crunchy, v_boeuf,   0.140),
    (v_bao_bf_crunchy, v_farine,  0.040),
    (v_bao_bf_crunchy, v_salade,  0.025);

  -- Bao Boeuf Fondant
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_bao_bf_fondant, v_bao,       1),
    (v_bao_bf_fondant, v_boeuf,     0.160),
    (v_bao_bf_fondant, v_sauce_bbq, 0.035);

  -- Bao Poulet Croustillant
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_bao_pc, v_bao,    1),
    (v_bao_pc, v_poulet, 0.140),
    (v_bao_pc, v_farine, 0.040),
    (v_bao_pc, v_salade, 0.025);

  -- Fried Chicken / Spicy
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_fried_spicy, v_bao,        1),
    (v_fried_spicy, v_poulet,     0.140),
    (v_fried_spicy, v_farine,     0.040),
    (v_fried_spicy, v_sauce_thai, 0.040);

  -- Fried Chicken Moutarde Miel
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_fried_mm, v_bao,      1),
    (v_fried_mm, v_poulet,   0.140),
    (v_fried_mm, v_farine,   0.040),
    (v_fried_mm, v_moutarde, 0.025),
    (v_fried_mm, v_miel,     0.020);

  -- Bao Chicken Thaï
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_bao_thai, v_bao,       1),
    (v_bao_thai, v_poulet,    0.140),
    (v_bao_thai, v_sauce_thai,0.040),
    (v_bao_thai, v_salade,    0.025);

  -- Bao Végé
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_bao_vege, v_bao,    1),
    (v_bao_vege, v_champi, 0.100),
    (v_bao_vege, v_salade, 0.040),
    (v_bao_vege, v_tomate, 0.050);

  -- Asian Boeuf Croustillant
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_asian_bf, v_boeuf,        0.160),
    (v_asian_bf, v_farine,       0.050),
    (v_asian_bf, v_sauce_korean, 0.040);

  -- Crousty Chicken
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_crousty, v_poulet,       0.160),
    (v_crousty, v_farine,       0.050),
    (v_crousty, v_sauce_korean, 0.040);

  -- Asian Poulet Croustillant
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_asian_pc, v_poulet,      0.160),
    (v_asian_pc, v_farine,      0.050),
    (v_asian_pc, v_sauce_thai,  0.040);

  -- Poulet Thaï
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_poulet_thai, v_poulet,     0.180),
    (v_poulet_thai, v_sauce_thai, 0.050);

  -- Crevette Thaï
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_crev_thai, v_crevette,   0.160),
    (v_crev_thai, v_sauce_thai, 0.050);

  -- Frites Maison
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_frites, v_pdterre, 0.250);

  -- Frites Paprika
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_frites_paprika, v_pdterre, 0.250);

  -- Frites Patate Douce
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_frites_pdouce, v_pdouce, 0.250);

  -- Frites Cheddar Maison
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_frites_cheddar, v_pdterre, 0.250),
    (v_frites_cheddar, v_cheddar, 0.060);

  -- Frites Bacon Cheddar
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_frites_bacon, v_pdterre, 0.250),
    (v_frites_bacon, v_bacon,   0.050),
    (v_frites_bacon, v_cheddar, 0.060);

  -- Cheesecake Fruits Rouges
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_ck_frrouge, v_fromb,   0.120),
    (v_ck_frrouge, v_frrouge, 0.080);

  -- Cheesecake Mangue
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_ck_mangue, v_fromb,  0.120),
    (v_ck_mangue, v_mangue, 0.080);

  -- Cheesecake Caramel
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_ck_caramel, v_fromb, 0.120),
    (v_ck_caramel, v_sucre, 0.030);

  -- Brioche Perdue Caramel
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_bp_caramel, v_brioche, 1),
    (v_bp_caramel, v_creme,   0.060),
    (v_bp_caramel, v_sucre,   0.020);

  -- Brioche Perdue Chocolat
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_bp_choco, v_brioche,  1),
    (v_bp_choco, v_creme,    0.060),
    (v_bp_choco, v_chocolat, 0.040);

  -- Brookie au Chocolat
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_brookie, v_chocolat, 0.060),
    (v_brookie, v_farine,   0.050);

  -- Mojitos (tous)
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_mojito_class,  v_menthe, 0.5), (v_mojito_class,  v_citron, 1), (v_mojito_class,  v_sucre, 0.015),
    (v_mojito_viol,   v_menthe, 0.5), (v_mojito_viol,   v_citron, 1), (v_mojito_viol,   v_sucre, 0.015),
    (v_mojito_pass,   v_menthe, 0.5), (v_mojito_pass,   v_citron, 1), (v_mojito_pass,   v_sucre, 0.015),
    (v_mojito_cerise, v_menthe, 0.5), (v_mojito_cerise, v_citron, 1), (v_mojito_cerise, v_sucre, 0.015),
    (v_mojito_kiwi,   v_menthe, 0.5), (v_mojito_kiwi,   v_citron, 1), (v_mojito_kiwi,   v_sucre, 0.015);

  -- Thé Glacé
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_the_glace, v_cafe,  1),
    (v_the_glace, v_citron,1),
    (v_the_glace, v_sucre, 0.015);

  -- Soft
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_soft_item, v_soft, 1);

  -- Thé ou Café
  insert into recipe_items (menu_item_id, ingredient_id, qty_per_portion) values
    (v_cafe_item, v_cafe, 1);

  raise notice 'Baoma Burger créé avec succès ! ID restaurant : %', v_resto;
end $$;
