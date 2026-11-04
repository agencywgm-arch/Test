# Wegemo — Dossier de reprise du projet

Document de passation complet : architecture, fonctionnalités, procédure
d'installation pour un nouveau restaurant, et surtout **les pièges déjà
rencontrés en production** (la partie la plus utile).

---

## 1. Ce qu'est le produit

SaaS multi-établissements de commande par QR code pour la restauration.
Le client scanne un QR sur sa table → menu → commande → paiement → suivi en
temps réel. La cuisine reçoit la commande instantanément avec alarme sonore.
Le gestionnaire pilote menu, caisse, CRM, promotions depuis un tableau de bord.

**Trois interfaces :**
- **Client** — téléphone, aucune application à installer
- **Cuisine** — tablette, tableau kanban temps réel
- **Gestion** — ordinateur, 14 modules

---

## 2. Stack technique

- **Frontend** : React 19 + Vite. Un fichier monolithique `src/App.jsx`
  (~11 000 lignes), styles en objets inline JS. Client Supabase dans
  `src/lib/supabase.js`.
- **Backend** : Supabase — PostgreSQL, RLS, Auth email/password, Realtime,
  Edge Functions (Deno), Storage.
- **Paiement** : Stripe (carte, Apple Pay, Google Pay) + espèces.
- **Fiscalité PT** : Vendus (facturation certifiée).
- **Emails** : Resend.
- **Notifications** : Web Push (Service Worker + VAPID).
- **Déploiement** : GitHub Actions → GitHub Pages, automatique à chaque push.
  Base path via `VITE_BASE_PATH`.
- **QR codes** : lib `qrcode`.
- **PDF / images** : Canvas 2D natif + writer PDF maison. **Ne pas utiliser
  html2canvas** (voir §7).

---

## 3. Structure du dépôt

```
velvetguest/
├── src/
│   ├── App.jsx              # toute l'application
│   └── lib/supabase.js      # client Supabase
├── public/
│   ├── sw.js                # Service Worker (Web Push)
│   └── embed.js             # widget bouton "Commander" pour site vitrine
├── supabase/
│   ├── schema.sql           # schéma de base
│   ├── migration_*.sql      # migrations incrémentales
│   ├── CONSOLIDATED_fix_all_missing_columns.sql   # filet de sécurité
│   └── functions/           # Edge Functions
└── brand-assets/            # schémas SVG/PNG de la marque
```

---

## 4. Modèle de données

| Table | Rôle |
|---|---|
| `restaurants` | établissements : name, slug, owner_id, logo, nif, vendus_enabled, vendus_tax_id, is_payment_master, redirect_to_restaurant_id, qr_choice_enabled |
| `franchise_groups` | regroupement multi-établissements |
| `tables` | tables physiques : number, qr_url, label, redirect_to_restaurant_id |
| `menu_items` | plats : prix, catégorie, photo, `supplements` (JSON), `extras` (JSON), translations |
| `orders` | statut PENDING→PREPARING→READY→DONE, total, paid, payment_method, customer_*, vendus_invoice_*, receipt_email_sent, estimated_ready_at |
| `order_items` | lignes de commande |
| `customers` | CRM : email, nom, téléphone, nif, stats |
| `qr_scans` | analytique des scans, lié à `order_id` si converti |
| `push_subscriptions` | abonnements Web Push |
| `restaurant_settings` | clés Stripe/Resend, personnalisation ticket, fonds d'écran |
| `promotions`, `promo_codes`, `reviews` | promos et avis |

**Options composables** : stockées en JSON dans `menu_items.supplements`
(groupes : gratinage, viandes, sauces…) et `menu_items.extras`. **Ne pas
normaliser en tables séparées** — le tunnel de composition client s'appuie
directement sur ce format.

---

## 5. Edge Functions

| Fonction | Rôle |
|---|---|
| `create-payment-intent` | crée l'intention de paiement Stripe (lit les clés en base, avec repli sur le restaurant principal de la franchise) |
| `create-vendus-invoice` | émet la facture fiscale portugaise certifiée |
| `send-receipt-email` | envoie le reçu par email via Resend (avec repli franchise) |
| `send-ready-push` | notification push « commande prête » |
| `send-campaign` | campagnes email CRM |
| `chat-agent` | assistant allergènes côté client |

⚠️ Les fonctions déployées peuvent avoir un **tiret final** dans leur nom
(`create-payment-intent-`). Le code client essaie les deux variantes.

---

## 6. Fonctionnalités

**Client** : choix sur place/à emporter · menu illustré multi-langues (FR/EN/AR/ES/PT,
traduction auto) · plats composables · panier · codes promo · NIF optionnel ·
paiement carte ou espèces · suivi temps réel avec compte à rebours · alerte
sonore + vibration + push à « commande prête » · ticket numérique · survie au
rafraîchissement de page.

**Cuisine** : kanban temps réel · alarme sonore agressive qui ne s'arrête que via
« Accepter » · ETA ajustable (+5/−5 min) · repli par interrogation périodique.

**Gestion** : commandes live · caisse + export CSV/Rapport Z · gestion menu
(CRUD, réordonnancement, traduction auto) · export menu PDF + image livraison
avec marge tarifaire · copie de menu entre établissements · QR codes (export
groupé PDF, redirection par restaurant ou par table, mode « le client choisit ») ·
CRM · promotions · analytique scans avec taux de conversion · multi-établissements
avec partage de config paiement/email.

---

## 7. Pièges rencontrés en production — À LIRE ABSOLUMENT

Ces problèmes ont tous causé des pannes réelles. Ils sont corrigés, mais il faut
comprendre le mécanisme pour ne pas les réintroduire.

### 7.1 Le piège du RETURNING (a bloqué TOUTES les commandes)
Un `.insert(...).select()` demande à PostgREST de **relire** la ligne insérée.
Postgres exige alors le privilège SELECT sur **chaque colonne retournée**. Une
révocation de SELECT sur des colonnes personnelles (RGPD) a donc fait échouer
**l'insertion elle-même**, pas seulement la lecture.
→ **Toujours écrire `.insert(...).select("id")`**, jamais `.select()` nu.

### 7.2 RLS : une policy manquante échoue en silence
Le CRM n'a jamais enregistré personne pendant des mois : `customers` n'avait
aucune policy INSERT pour le rôle anonyme. Aucune erreur visible.
→ Toute table écrite par un **client anonyme** (commandes, scans, CRM, tables
créées à la volée) a besoin d'une policy INSERT explicite `with check (true)`.

### 7.3 La traduction du navigateur casse React
Safari/Chrome remplacent les nœuds de texte lors d'une traduction automatique.
React perd la référence : le total du panier restait figé avant réduction.
→ `<html lang="fr" translate="no">` + `<meta name="google" content="notranslate">`
+ `translate="no"` sur tous les montants. Ne pas retirer.

### 7.4 html2canvas est inutilisable sur iOS
Au-delà d'une certaine hauteur de DOM, Safari dépasse sa limite de surface de
canvas et renvoie une image blanche, sans erreur.
→ Tous les exports (menu image, QR groupés) sont dessinés en **Canvas 2D natif**,
avec pagination automatique. Ne pas revenir en arrière.

### 7.5 iOS ne télécharge pas les fichiers
Safari ignore l'attribut `download`. Pour le PDF des QR codes, il faut passer par
`navigator.share()` (feuille de partage iOS → « Enregistrer dans Fichiers »).

### 7.6 Dates : UTC ≠ jour local
`new Date().toISOString()` donne le jour **UTC**. Au Portugal en été, toute vente
entre minuit et 1 h tombait sur la mauvaise journée comptable.
→ Utiliser le helper `localDateStr()`. Recalculer la frontière de journée en
continu, sinon un tableau de bord ouvert la nuit reste bloqué sur la veille.

### 7.7 Le temps réel meurt en silence
Une tablette en veille tue son websocket sans erreur : les commandes
apparaissaient 5 à 30 min en retard.
→ Interrogation de secours (3 s commandes actives, 30 s caisse) **avec
réconciliation complète** (ajoute ET retire), plus resynchronisation sur
`visibilitychange` / `focus` / `online`. Régler la tablette sur « veille : jamais ».

### 7.8 Ne jamais avaler une erreur d'appel de fonction
Des `catch(() => {})` silencieux ont masqué pendant des jours l'absence totale
d'emails et de factures.
→ Utiliser `invokeWithRetry()` (3 tentatives) et **remonter l'échec à l'écran**.

### 7.9 Secrets Supabase : guillemets parasites
Un secret enregistré avec des guillemets donne une clé de 34 caractères au lieu
de 32 → Vendus répondait `401 / A001 / AUTH`.
→ Normaliser à la lecture : `.trim().replace(/^["']+|["']+$/g, "")`.

### 7.10 Migrations non exécutées = pannes fantômes
La majorité des incidents venaient de migrations SQL jamais lancées sur le projet
(`column "paid" does not exist`).
→ En cas de comportement inexplicable, **lancer d'abord**
`CONSOLIDATED_fix_all_missing_columns.sql` (idempotent, sans risque).

---

## 8. Installation pour un nouveau restaurant

**Dans l'ordre.** Ne pas sauter d'étape.

### A. Base de données
1. `schema.sql`
2. Toutes les `migration_*.sql`
3. `CONSOLIDATED_fix_all_missing_columns.sql` (filet de sécurité)

### B. Edge Functions
Déployer les 6 fonctions (Dashboard → Edge Functions → Deploy a new function →
Via Editor, ou CLI `supabase functions deploy <nom> --use-api`).

### C. Secrets Supabase (Edge Functions → Secrets)
**Sans guillemets ni espaces.**
```
VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
VENDUS_API_KEY        (si Portugal)
RESEND_API_KEY        (optionnel, sinon par restaurant en base)
```

### D. Déploiement frontend
GitHub Actions, variables : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_BASE_PATH`.

### E. Configuration applicative
1. Créer le compte propriétaire, puis le restaurant
2. Paramètres → clés Stripe + clé Resend
3. En multi-établissements : activer **⭐ Restaurant principal** sur celui qui
   porte Stripe/Resend → les autres en héritent automatiquement
4. Créer les tables, imprimer les QR (export groupé PDF)
5. Saisir le menu (ou copier depuis un autre établissement)

### F. Fiscalité portugaise — chaîne complète
C'est la partie la plus longue. Chaque maillon est bloquant :
1. Compte **Vendus** avec abonnement actif
2. `restaurants.nif` renseigné + `vendus_enabled = true` (**NIF propre à chaque
   établissement**, jamais celui d'un autre)
3. Vendus → **Caixa de type API** (`Tipo de Caixa` = API)
4. Vendus → **identifiants de communication AT** (Autoridade Tributária), sans
   lesquels rien n'est émis (obligatoire pour l'ATCUD depuis 2023).
   Créer un sous-utilisateur sur portaldasfinancas.gov.pt avec les permissions
   **Comunicação de Séries (WSS)** et **Comunicação de Dados de Faturas (WFA)**.
5. `restaurants.vendus_tax_id` : code TVA (`NOR` 23 % par défaut, `INT` 13 %,
   `RED` 6 %) — **décision fiscale, à valider avec un comptable**

**Vérification :**
```sql
select
  count(*) filter (where paid) as encaissees,
  count(*) filter (where paid and vendus_invoice_id is not null) as facturees,
  count(*) filter (where paid and vendus_invoice_id is null) as sans_facture
from orders where created_at > now() - interval '30 days';
```
Un contrôle permanent existe aussi dans l'onglet **Caisse** (bandeau vert/rouge)
avec un bouton de régularisation des factures manquantes.

---

## 9. Points ouverts / limites connues

- **Web Push ne fonctionne pas sur iPhone Safari** en navigation normale (Apple
  exige l'ajout à l'écran d'accueil). Marche sur Android. Pour une alerte fiable
  tous téléphones : passer par SMS (Twilio) — non implémenté.
- **Impression physique des tickets** : non implémentée. Étudiée avec une
  imprimante thermique ESC/POS ; nécessite un poste dédié.
- **`orders` est en lecture publique** (`using (true)`) pour permettre le suivi
  client anonyme. Restreindre les colonnes personnelles casse l'insertion
  (cf. §7.1) — à traiter via une RPC `SECURITY DEFINER` dédiée si besoin.
- **`promo_codes` et `increment_promo_use`** ne sont dans aucun fichier SQL du
  dépôt (créés à la main). Si la RPC manque, `max_uses` n'est jamais appliqué.
- **Facturation Vendus non partageable entre établissements** (contrairement à
  Stripe/Resend) : chaque restaurant a sa propre identité fiscale.

---

## 10. Charte graphique

| Rôle | Hex |
|---|---|
| Fond | `#F5F5F7` |
| Surface | `#FFFFFF` |
| Texte | `#1D1D1F` |
| Texte secondaire | `#6E6E73` |
| **Accent principal** | `#FF375F` |
| Bleu | `#0071E3` |
| Vert (succès) | `#34C759` |
| Orange (en cours) | `#FF9F0A` |

Police unique **Figtree** (300–900). Coins très arrondis (10–20 px, pilules à
999 px), ombres douces `0 4px 24px rgba(0,0,0,0.08)`, beaucoup de blanc.
Émojis utilisés comme pictogrammes fonctionnels.
