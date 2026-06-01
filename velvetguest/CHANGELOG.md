# VelvetGuest — Changelog complet

> SaaS de commande QR code multi-tenant pour restaurants.  
> Stack : React + Vite · TailwindCSS · Supabase (Auth, DB, Realtime, Storage, Edge Functions) · Stripe · OpenAI gpt-4o-mini

---

## Dernières modifications (session courante)

### ⚡ Onglet Setup — Onboarding IA
- Nouvel onglet "⚡ Setup" en première position dans la sidebar, mis en évidence en orange
- **Phase 1 — Importer la carte** : l'utilisateur colle du texte (site web, PDF, WhatsApp…) → l'IA (`gpt-4o-mini`) extrait tous les plats → preview éditable groupée par catégorie → import en base en un clic
  - Édition inline du nom (clic → input), du prix, de l'emoji par plat
  - Toggle inclure/exclure par plat
  - Indicateur de progression animé (étapes 1 → 2)
- **Phase 2 — Générer l'inventaire** : après import de la carte, l'IA déduit proactivement les ingrédients de chaque plat (quantités par portion, unités, stocks de départ, seuils d'alerte) → preview deux colonnes (ingrédients + recettes) → sauvegarde en base
- Mode démo : l'IA fonctionne mais aucune écriture en base
- Edge Function mise à jour : modes `setup-menu` et `setup-inventory` avec `response_format: { type: "json_object" }` et `max_tokens: 4096`

### 📦 Onglet Inventaire (remplace "Avis")
- **Sous-onglet Stocks** : grille d'ingrédients avec badge couleur (OK / Stock bas / Épuisé), barre de progression, boutons +/− par 0.1, modal ajout/édition/suppression, KPIs en haut
- **Sous-onglet Recettes** : sélection d'un plat → configuration des ingrédients par portion (qty_per_portion), ajout/suppression par ligne
- **Décrément automatique** : à chaque commande QR, les `recipe_items` sont lus, les quantités multipliées par les portions commandées, et les stocks ingrédients décrémentés en base
- Mode démo : DEMO_INGREDIENTS + DEMO_RECIPES (8 ingrédients, recettes pour 6 plats), mutations en mémoire

### 💬 Chat mobile — Page client QR
- Remplacement du panneau flottant fixe par un **bottom sheet natif** (hauteur 85dvh, animation `sheetUp` translateY)
- Overlay sombre cliquable pour fermer
- `env(safe-area-inset-bottom)` pour support iPhone notch/home bar
- Scroll inertiel iOS (`WebkitOverflowScrolling: touch`)
- Auto-focus input 300 ms après ouverture
- Chips de suggestions qui envoient directement sans passer par l'état input

### 💬 Chat dans la Vue client admin (ClientViewChat)
- Composant `ClientViewChat` autonome ajouté aux 3 étapes de la preview admin (menu, panier, paiement)
- Bouton flottant fixe (bottom: 100px, right: 32px) distinct du bouton principal
- Panel compact (maxWidth 380, maxHeight 400) avec le même mode `customer`

### 🤖 Alertes intelligentes — Agent dashboard
- Panneau d'alertes collapsible au-dessus des messages de l'agent
- 🔴 Commandes urgentes (≥ 20 min d'attente)
- 🟡 Nouvelles commandes en attente
- 🟠 Stock bas (≤ 5 unités), rafraîchi toutes les 2 min
- Badge sur le bouton agent : rouge si urgence, orange sinon, avec compteur

### 🌱 Seed Baoma Burger — données complètes
- Stock fictif renseigné sur les plats du jour et suggestions
- 31 ingrédients avec stocks réalistes + seuils d'alerte
- Recettes complètes pour les 48 plats (protéines, sauces, pains, produits frais, desserts, bar)
- Script PL/pgSQL avec `returning id into v_xxx` pour tous les liens FK

### 🔧 Corrections
- `ClientView` panier : suppression des champs `customerName`/`customerEmail` qui n'existent que dans `CustomerPage` (évitait un crash)
- `AgentChat` z-index porté à 1010 pour passer au-dessus du bandeau démo (z-index 999)

---

## Architecture générale

```
velvetguest/
├── src/
│   ├── App.jsx              — composant racine unique (~3 000 lignes)
│   └── lib/supabase.js      — client Supabase
├── supabase/
│   ├── schema.sql           — schéma complet (tables, RLS, triggers)
│   ├── migration_inventory.sql  — tables ingredients + recipe_items
│   ├── seed_baoma.sql       — seed Baoma Burger (Courbevoie)
│   └── functions/
│       ├── chat-agent/index.ts        — Edge Function IA (OpenAI)
│       └── create-payment-intent/     — Edge Function Stripe
└── CHANGELOG.md
```

### Routes

| URL | Vue |
|-----|-----|
| `/` | Landing page SaaS |
| `/r/[slug]/t/[num]` | Page client QR (menu → panier → paiement → confirmation) |
| `/dashboard` | Dashboard restaurant (post-login) |

### Routing interne (state machine dans App.jsx)

`page` : `landing` → `login` → `restaurants` → `dashboard` → `client` (preview) / `kitchen`

`step` (CustomerPage) : `loading` → `menu` → `cart` → `payment` → `done` / `error`

---

## Base de données Supabase

### Tables

| Table | Description |
|-------|-------------|
| `profiles` | Un profil par utilisateur auth |
| `restaurants` | Restaurants (slug unique, owner_id) |
| `tables` | Tables physiques (number, qr_url) |
| `menu_items` | Plats (name, price, category, emoji, photo_url, stock, is_popular, available) |
| `orders` | Commandes (status ENUM, total, payment_method, customer_name, customer_email) |
| `order_items` | Lignes de commande (menu_item_id, quantity, detail) |
| `reviews` | Avis clients (rating 1-5, comment) |
| `ingredients` | Ingrédients (name, unit, stock, alert_threshold, emoji) |
| `recipe_items` | Recettes : lien ingredient ↔ menu_item avec qty_per_portion |

### Colonnes ajoutées en cours de projet

```sql
alter table menu_items add column if not exists photo_url text;
alter table menu_items add column if not exists stock int default null;
alter table orders add column if not exists payment_method text default 'cash';
alter table orders add column if not exists customer_name text default '';
alter table orders add column if not exists customer_email text default '';
```

> Fichier complet : `supabase/schema.sql`  
> Inventaire : `supabase/migration_inventory.sql`

### Storage

Bucket `menu-images` — photos des plats uploadées depuis le dashboard.

```sql
insert into storage.buckets (id, name, public) values ('menu-images', 'menu-images', true);
create policy "Owner uploads" on storage.objects for insert with check (bucket_id = 'menu-images' and auth.uid() is not null);
create policy "Public read" on storage.objects for select using (bucket_id = 'menu-images');
```

### Realtime

Activé sur `orders` et `order_items` (Dashboard > Database > Replication).

---

## Fonctionnalités livrées

### 1. Données réelles partout

La preview admin (`ClientView`) et la page client (`CustomerPage`) sont connectées à Supabase. Aucun chiffre fictif codé en dur en dehors du mode démo.

---

### 2. Gestion de stock sur la carte

- Champ `stock` optionnel sur chaque plat (null = illimité).
- Badge couleur automatique : vert (> seuil), orange (1-3), rouge (épuisé).
- Boutons +/− dans le dashboard pour ajustement rapide.
- À la commande : décrémentation automatique du stock.
- Si `stock = 0` → le plat passe en `available = false`.
- Alertes stock ≤ 5 dans le résumé.

---

### 3. Caisse (onglet "Caisse")

- CA du jour (commandes au statut `DONE`).
- Répartition carte / espèces / Apple Pay.
- Journal horodaté des commandes servies.
- Export CSV pour comptabilité.
- Impression rapport Z (fenêtre navigateur).
- Ticket moyen calculé en temps réel.

---

### 4. Paiement client (page QR)

**Flux :** menu → panier → choix méthode → confirmation → ticket.

**Méthodes disponibles :**
- 💳 Carte bancaire / Apple Pay / Google Pay → Stripe (si `VITE_STRIPE_PUBLISHABLE_KEY` configuré)
- 💵 Espèces → commande enregistrée directement, encaissement par le serveur

**Formulaire de carte simulé** (si Stripe non configuré) :
- Widget carte visuel mis à jour en temps réel (numéro, expiry, CVV, titulaire)
- Traitement simulé de 1.8 s puis confirmation réelle en base

**Robustesse :**
- Auto-création de la table si introuvable en base
- Fallback insert sans colonnes optionnelles si migration non encore appliquée
- Try/catch global → erreurs affichées inline (jamais de page blanche)

---

### 5. Collecte nom + email client

Sur la page QR, le client saisit son nom et son email avant de payer.  
Ces données sont stockées dans `orders.customer_name` et `orders.customer_email`.  
Affichées sur le ticket de confirmation.

---

### 6. Ticket de confirmation client

Après commande, un ticket stylisé affiche :
- Nom du restaurant + numéro de table
- ID de commande (8 premiers caractères en majuscules)
- Date et heure
- Nom + email du client
- Détail des articles + total
- Méthode de paiement
- Barre de progression animée (En attente → En cuisine → Prêt → Servi)

---

### 7. Photo par plat

- Bouton d'upload dans le formulaire d'édition de plat (onglet Carte).
- Upload vers Supabase Storage (bucket `menu-images`).
- Affichage de la photo sur la carte client (remplace l'emoji si présente).
- Preview immédiate après upload.

---

### 8. QR Codes

- Un QR code par table, URL unique : `/r/[slug]/t/[numéro]`
- Génération via la librairie `qrcode`
- Personnalisation couleur
- Téléchargement PNG
- Lecture RLS publique configurée

---

### 9. Vue Cuisine (Kanban)

- 3 colonnes : Nouvelles / En cuisine / Prêtes
- Avancement bouton : Accepter → Prête → Servie
- Cases à cocher par item pour suivre la préparation
- Alerte rouge si commande > 20 min
- Temps réel via Supabase Realtime (postgres_changes)

---

### 10. Assistant IA Velvet — Dashboard

Bouton ✨ flottant (bottom-right) dans le dashboard admin.

**Fonctionnalités :**
- Propulsé par `gpt-4o-mini` via l'Edge Function `chat-agent`
- Contexte injecté : CA du jour, commandes actives, ticket moyen, nom du restaurant
- Suggestions rapides au premier lancement
- Effacer la conversation

**Panneau d'alertes intelligentes** (affiché en haut du panel si alertes) :
- 🔴 Commandes urgentes (≥ 20 min d'attente)
- 🟡 Nouvelles commandes en attente
- 🟠 Stock bas (≤ 5 unités, rafraîchi toutes les 2 min)
- Badge sur le bouton : rouge si urgence, orange sinon

**Edge Function** : `supabase/functions/chat-agent/index.ts`  
Clé : `OPENAI_API_KEY` en secret Supabase (ne jamais mettre dans le code).

---

### 11. Assistant allergènes Velvet — Page client QR

Bouton 💬 flottant sur les étapes menu, panier et paiement de la page client.

**Fonctionnalités :**
- Mode `customer` : système prompt axé allergènes et ingrédients
- Contexte : nom du restaurant + liste complète du menu avec descriptions
- Suggestions rapides : "Plats sans gluten ?", "Végétarien ?", "Allergènes ?"
- Disponible aussi dans la Vue client (preview admin) via `ClientViewChat`

---

### 12. Mode Démo

Accessible depuis la page de sélection des restaurants (après connexion) via la carte "Explorer la démo".

**Données fictives :**
- Restaurant "Le Bistro Démo"
- 12 plats répartis en 5 catégories
- 3 commandes actives (new / cooking / ready)
- 3 commandes servies
- 8 ingrédients avec stocks + recettes pour 6 plats

**Toutes les actions sont interactives** (mutations en mémoire, aucune écriture Supabase) :
- Ajouter/modifier/supprimer des plats ✓
- Avancer des commandes en cuisine ✓
- Modifier les stocks ✓
- Gérer les ingrédients et recettes ✓
- Simuler le chat IA ✓

Bandeau orange en haut : "MODE DÉMO — Tout est interactif, explorez librement !"

---

### 13. Inventaire (onglet remplaçant "Avis")

#### Sous-onglet Stocks
- Carte par ingrédient : emoji, nom, stock, badge (✓ OK / ⚠️ Stock bas / Épuisé)
- Barre de progression par rapport au seuil d'alerte
- +/− rapide par 0.1 unité
- Modal ajout/édition : nom, emoji, unité, stock actuel, seuil d'alerte
- KPIs : total ingrédients / stocks bas / épuisés

#### Sous-onglet Recettes
- Sélection d'un plat → configuration de sa recette (ingrédients + quantités par portion)
- Ajout / modification / suppression de chaque ligne
- Seuls les ingrédients non encore utilisés sont proposés à l'ajout

#### Décrément automatique à la commande
Quand un client passe commande via QR, le système :
1. Récupère les `recipe_items` de chaque plat commandé
2. Multiplie les `qty_per_portion` par les quantités commandées
3. Décrémente chaque ingrédient en base

**Unités supportées :** kg · g · L · mL · pcs · boîtes · sachets

---

### 14. Seed Baoma Burger

Script `supabase/seed_baoma.sql` — 50+ plats, 10 catégories, 15 tables.

Catégories : Nouveauté · Menus · Starters · Wings · Smash Bao · Bao Créations · Asian Fusion · Accompagnements · Desserts · Cocktails · Boissons

---

## Variables d'environnement

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...   # optionnel
```

**Secrets Supabase Edge Functions :**
```
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...   # optionnel
```

---

## Déploiement

```bash
# Développement
npm run dev

# Production
npm run build

# Supabase migrations (SQL Editor)
# 1. supabase/schema.sql
# 2. supabase/migration_inventory.sql
# Colonnes supplémentaires (si pas encore migrées) :
#   alter table menu_items add column if not exists photo_url text;
#   alter table menu_items add column if not exists stock int default null;
#   alter table orders add column if not exists payment_method text default 'cash';
#   alter table orders add column if not exists customer_name text default '';
#   alter table orders add column if not exists customer_email text default '';

# Déployer les Edge Functions
supabase functions deploy chat-agent
supabase functions deploy create-payment-intent

# Seed Baoma Burger
# → Copier supabase/seed_baoma.sql dans SQL Editor → Run
```

---

## Branche de développement

`claude/hopeful-galileo-1o4Hi` → repo `agencywgm-arch/Test`
