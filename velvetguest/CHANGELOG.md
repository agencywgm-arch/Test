# VelvetGuest — Changelog complet

> SaaS de commande QR code multi-tenant pour restaurants.  
> Stack : React + Vite · TailwindCSS · Supabase (Auth, DB, Realtime, Storage, Edge Functions) · Stripe · OpenAI gpt-4o-mini

---

## Architecture générale

```
velvetguest/
├── src/
│   ├── App.jsx                        — composant racine unique (~4 500 lignes)
│   └── lib/supabase.js                — client Supabase
├── supabase/
│   ├── schema.sql                     — schéma complet (tables, RLS, triggers)
│   ├── migration_inventory.sql        — tables ingredients + recipe_items
│   ├── migration_promotions.sql       — table promotions
│   ├── migration_customers.sql        — table customers + trigger stats
│   ├── seed_baoma.sql                 — seed Baoma Burger (Courbevoie)
│   └── functions/
│       ├── chat-agent/index.ts        — Edge Function IA (OpenAI)
│       └── create-payment-intent/     — Edge Function Stripe
└── CHANGELOG.md
```

### Routes

| URL | Vue |
|-----|-----|
| `/` | Landing page SaaS |
| `/r/[slug]/t/[num]` | Page client QR (menu → profil → paiement → confirmation) |
| `/dashboard` | Dashboard restaurant (post-login) |

### Routing interne (state machine App.jsx)

`page` : `landing` → `login` → `restaurants` → `dashboard` → `client` / `kitchen`

`step` (CustomerPage) : `loading` → `menu` → `cart` → `profile` → `payment` → `done` / `error`

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
| `ingredients` | Ingrédients (name, unit, stock, alert_threshold, emoji) |
| `recipe_items` | Recettes : lien ingredient ↔ menu_item avec qty_per_portion |
| `promotions` | Promotions/événements (name, emoji, color, type, discount_percent, dates, active, send_count) |
| `customers` | Profils CRM clients (email unique/restaurant, prénom, téléphone, visites, dépenses) |

### Colonnes ajoutées

```sql
alter table menu_items add column if not exists photo_url text;
alter table menu_items add column if not exists stock int default null;
alter table orders add column if not exists payment_method text default 'cash';
alter table orders add column if not exists customer_name text default '';
alter table orders add column if not exists customer_email text default '';
```

### Migrations à appliquer dans l'ordre

```
1. supabase/schema.sql
2. supabase/migration_inventory.sql
3. supabase/migration_promotions.sql
4. supabase/migration_customers.sql
```

### Storage

Bucket `menu-images` — photos des plats uploadées depuis le dashboard.

### Realtime

Activé sur `orders`, `order_items`, `customers`, `promotions` (Dashboard > Database > Replication).

---

## Store partagé (useStore)

Toute la donnée live est dans un seul hook `useStore(restaurantId)` exposé via `StoreCtx` :

| Clé | Type | Description |
|-----|------|-------------|
| `orders` | Order[] | Commandes actives en temps réel |
| `doneOrders` | Order[] | Commandes servies du jour |
| `ingredients` | Ingredient[] | Stocks ingrédients |
| `promotions` | Promotion[] | Promos — mise à jour live via Realtime |
| `customers` | Customer[] | Profils CRM — mise à jour live via Realtime |
| `launchCampaign(data, isDemo)` | fn | Crée une promo + notif + écriture DB |
| `setPromotions` | fn | Mise à jour locale des promos |
| `setCustomers` | fn | Mise à jour locale des clients |
| `pushNotif(msg, type)` | fn | Toast notification |
| `revenue` | number | CA du jour |

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

**Flux :** menu → panier → profil → choix méthode → confirmation → ticket.

**Méthodes disponibles :**
- 💳 Carte bancaire / Apple Pay / Google Pay → Stripe (si `VITE_STRIPE_PUBLISHABLE_KEY` configuré)
- 💵 Espèces → commande enregistrée directement, encaissement par le serveur

**Formulaire de carte simulé** (si Stripe non configuré) :
- Widget carte visuel mis à jour en temps réel (numéro, expiry, CVV, titulaire)
- Traitement simulé de 1.8 s puis confirmation réelle en base

---

### 5. Collecte client & CRM automatique

**Étape "Profil"** dans le parcours QR (entre panier et paiement) :
- Champs : Prénom · Email (obligatoire) · Téléphone (optionnel)
- Message : "Recevez votre ticket de caisse par email et profitez des offres et avantages du restaurant."
- Bouton "Passer cette étape" disponible
- Après commande → upsert automatique dans `customers` (trigger SQL incrémente `order_count` + `total_spent`)

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
- 🟠 Stock bas (≤ 5 unités), rafraîchi toutes les 2 min
- Badge sur le bouton : rouge si urgence, orange sinon

**Edge Function** : `supabase/functions/chat-agent/index.ts`  
Clé : `OPENAI_API_KEY` en secret Supabase (ne jamais mettre dans le code).

---

### 11. Assistant allergènes Velvet — Page client QR

Bouton 💬 flottant sur les étapes menu, panier, profil et paiement de la page client.

- Mode `customer` : système prompt axé allergènes et ingrédients
- Contexte : nom du restaurant + liste complète du menu avec descriptions
- Suggestions rapides : "Plats sans gluten ?", "Végétarien ?", "Allergènes ?"
- Disponible aussi dans la Vue client (preview admin) via `ClientViewChat`
- **Mobile** : bottom sheet natif (85dvh, animation `sheetUp`, `env(safe-area-inset-bottom)`, scroll inertiel iOS)

---

### 12. Mode Démo

Accessible depuis la page de sélection des restaurants via "Explorer la démo".

**Données fictives :**
- Restaurant "Le Bistro Démo"
- 12 plats répartis en 5 catégories
- 3 commandes actives (new / cooking / ready) + 3 servies
- 8 ingrédients avec stocks + recettes pour 6 plats
- 3 promotions (Happy Hour, Saint-Valentin, Midi Express)
- 15 profils clients CRM avec historique réaliste

**Toutes les actions sont interactives** (mutations en mémoire, aucune écriture Supabase).

Bandeau orange en haut : "MODE DÉMO — Tout est interactif, explorez librement !"

---

### 13. Inventaire (onglet "Inventaire")

#### Sous-onglet Stocks
- Carte par ingrédient : emoji, nom, stock, badge (✓ OK / ⚠️ Stock bas / Épuisé)
- Barre de progression par rapport au seuil d'alerte
- +/− rapide par 0.1 unité
- Modal ajout/édition : nom, emoji, unité, stock actuel, seuil d'alerte
- KPIs : total ingrédients / stocks bas / épuisés

#### Sous-onglet Recettes
- Sélection d'un plat → configuration de sa recette (ingrédients + quantités par portion)
- Ajout / modification / suppression de chaque ligne

#### Décrément automatique à la commande
1. Récupère les `recipe_items` de chaque plat commandé
2. Multiplie les `qty_per_portion` par les quantités commandées
3. Décrémente chaque ingrédient en base

---

### 14. Alertes flottantes (AlertBubbles)

Cartes fixes top-right du dashboard, séparées du chat. 6 types d'alertes :

| Type | Déclencheur | Couleur |
|------|-------------|---------|
| 🔴 Commande urgente | elapsed ≥ 20 min | Rouge |
| 🟡 Nouvelle commande | status = new | Bleu |
| 🟠 Stock bas | stock ≤ alert_threshold | Orange |
| 🔴 Rupture de stock | stock = 0 | Rouge |
| 💤 Clients inactifs | last_visit > 30j | Violet |
| 🎵 Événement saisonnier | J-45 avant la date | Couleur événement |

Chaque alerte campagne a un bouton **"🚀 Lancer la campagne"** qui ouvre le `CampaignModal`.

---

### 15. Promotions & Événements (onglet "🎁 Promos")

#### Sous-onglet Promos
- CRUD complet : créer / modifier / supprimer / activer-désactiver
- Champs : emoji, nom, description, réduction %, couleur (6 swatches), type, dates, actif
- Bouton "Relance" → modal avec aperçu email + statistiques d'envoi
- Affiché sur la page QR client en bandeau scrollable si active

#### Sous-onglet Calendrier
- Vue mensuelle avec navigation mois par mois
- **Événements saisonniers automatiques** sur les bonnes dates : Saint-Valentin, Pâques, Fête des Mères, Fête des Pères, Fête de la Musique, 14 Juillet, Rentrée, Halloween, Noël, Réveillon
- **Promos avec dates** affichées comme barres colorées
- Légende en bas du calendrier
- Aujourd'hui mis en évidence

#### Calendrier saisonnier intégré (10 événements récurrents)
```
Fév 14 — ❤️ Saint-Valentin
Avr 20 — 🐣 Pâques
Mai 25 — 🌸 Fête des Mères
Juin 21 — 👔 Fête des Pères + 🎵 Fête de la Musique
Juil 14 — 🎆 14 Juillet
Sep 01 — 🍂 Rentrée
Oct 31 — 🎃 Halloween
Déc 25 — 🎄 Noël
Déc 31 — 🥂 Réveillon
```

---

### 16. CampaignModal — messages éditables

- Objet de l'email éditable (champ texte)
- Corps du message éditable (textarea pré-rempli par l'IA, modifiable librement)
- Stats : clients ciblés + CA estimé récupéré (clients × ticket moyen réel)
- Aperçu email stylisé avec bouton CTA coloré
- Au clic "Lancer" → promo créée dans le store → apparaît instantanément dans l'onglet Promos

---

### 17. CRM automatique (onglet "👥 CRM")

**Collecte automatique** : chaque commande QR alimente le profil client en base.

**Profil client** :
- Prénom, email (clé unique par restaurant), téléphone
- Première visite, dernière visite
- Nombre de commandes, total dépensé (mis à jour par trigger SQL)
- Panier moyen calculé à la volée

**7 segments** :
| Segment | Critère |
|---------|---------|
| Actifs | last_visit < 30j |
| Fidèles | order_count ≥ 5 |
| Haute valeur | panier moyen ≥ 25€ |
| Inactifs 30j | last_visit entre 30 et 59j |
| À risque 60j | last_visit entre 60 et 89j |
| Perdus 90j+ | last_visit ≥ 90j |

**Fonctionnalités** :
- KPIs : total / actifs / à relancer / panier moyen
- Cartes client avec badges FIDÈLE/VIP
- Clic → modal profil complet
- Recherche par nom ou email
- **Live** : Supabase Realtime écoute `customers` → se met à jour à chaque nouvelle commande QR

---

### 18. ⚡ Onglet Setup — Onboarding IA

**Phase 1 — Importer la carte** :
- Coller du texte brut (site web, PDF, WhatsApp, Google Docs…)
- L'IA extrait tous les plats → preview éditable groupée par catégorie
- Édition inline : nom, prix, emoji par plat ; toggle inclure/exclure
- Import en base en un clic

**Phase 2 — Générer l'inventaire** :
- L'IA déduit proactivement les ingrédients de chaque plat
- Quantités par portion, unités, stocks de départ, seuils d'alerte
- Preview deux colonnes (ingrédients + recettes) → sauvegarde en base

**Edge Function modes** :
- `setup-menu` → `MENU_PARSER_SYSTEM` + `response_format: json_object` + `max_tokens: 4096`
- `setup-inventory` → `INVENTORY_SYSTEM` + `response_format: json_object` + `max_tokens: 4096`

---

### 19. Seed Baoma Burger

Script `supabase/seed_baoma.sql` — 50+ plats, 11 catégories, 15 tables.

- Catégories : Nouveauté · Menus · Starters · Wings · Smash Bao · Bao Créations · Asian Fusion · Accompagnements · Desserts · Cocktails · Boissons
- 31 ingrédients avec stocks réalistes + seuils d'alerte
- Recettes complètes pour 48 plats
- Script PL/pgSQL avec `returning id into v_xxx` pour tous les liens FK

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
RESEND_API_KEY=re_...           # optionnel — envoi emails campagnes
```

---

## Déploiement

```bash
# Développement
npm run dev

# Production (Vercel)
# Root directory: velvetguest
# Build command: npm run build
# Output directory: dist

# Supabase migrations (SQL Editor — dans l'ordre)
# 1. supabase/schema.sql
# 2. supabase/migration_inventory.sql
# 3. supabase/migration_promotions.sql
# 4. supabase/migration_customers.sql

# Déployer les Edge Functions (CLI local)
supabase link --project-ref <ref>
supabase functions deploy chat-agent
supabase functions deploy create-payment-intent

# Seed Baoma Burger
# → Copier supabase/seed_baoma.sql dans SQL Editor → Run
```

---

## Branche de développement

`claude/hopeful-galileo-1o4Hi` → repo `agencywgm-arch/Test`
