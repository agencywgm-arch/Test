# Wegemo — Historique des fonctionnalités

## Nom & Identité
- **Renommage VelvetGuest → Wegemo** (logo, titre, emails, schema SQL, agent IA)
- **Assistant IA renommé Velvet → Gémo** (dashboard admin + vue client)

---

## Fonctionnalités principales

### 🧾 Commandes
- **Modification de commande** — bouton ✏️ sur chaque commande non-servie dans l'onglet Commandes. Modale avec ajustement des quantités, suppression d'articles, ajout depuis la carte, recalcul du total et sauvegarde en base.
- **Numéro + nom client dans les notifications** — quand une commande arrive, la notification push affiche `#XXXXXX — Table N · Prénom`
- **Nom client sur les cartes cuisine** — le prénom saisi à la commande est visible sur chaque carte du kanban cuisine

### 🌍 Langues
- **Sélecteur de langue** sur l'écran de sélection du restaurant (FR 🇫🇷 / EN 🇬🇧 / ES 🇪🇸 / PT 🇵🇹)
- Toute l'interface dashboard change de langue instantanément
- Préférence persistée dans `localStorage`
- **Chat client multilingue** — l'assistant Gémo détecte automatiquement la langue du client et répond dans cette langue (FR, EN, ES, AR, etc.)

### 📱 QR Codes & Tables
- **QR codes permanents** basés sur l'UUID du restaurant (pas le slug) — survivent à un renommage
- **Gestion dynamique des tables** — ajouter ou supprimer des tables à tout moment depuis l'onglet QR Codes, persisté en base Supabase (`tables`)
- Téléchargement PNG par table, couleur personnalisable

### 📧 Campagnes email (CRM)
- **Intégration Resend** pour l'envoi de campagnes email (remplace Gmail OAuth)
- Segments : tous les clients / inactifs 30j+ / meilleurs clients
- L'agent Gémo peut proposer une campagne email en JSON structuré, le propriétaire confirme avant envoi
- Config requise : secret Supabase `RESEND_API_KEY` + `RESEND_FROM`

### 🔧 Dashboard
- Onglet "Résumé" renommé **"Dashboard"** (toutes langues)
- **Mode démo** entièrement fonctionnel : menu, commandes, vue client, paiement fictif — aucun accès Supabase requis

---

## Architecture technique

| Élément | Détail |
|---|---|
| Frontend | React + Vite, SPA mono-fichier `App.jsx` (~5 500 lignes) |
| Backend | Supabase (PostgreSQL + Edge Functions Deno + Realtime) |
| Auth admin | JWT par slug, cookie `admin_<slug>` |
| Emails | Resend API via Edge Function `send-campaign` |
| IA | OpenAI GPT-4o-mini via Edge Function `chat-agent` |
| Déploiement | GitHub Pages, branche `claude/hopeful-galileo-1o4Hi` |

---

## Secrets Supabase à configurer

```
RESEND_API_KEY = re_...          # clé API Resend
RESEND_FROM    = no-reply@...    # email expéditeur vérifié sur Resend
OPENAI_API_KEY = sk-...          # pour l'assistant Gémo
```

---

## Migrations SQL à appliquer

```sql
-- Table pour les tables du restaurant (si pas encore créée)
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  qr_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les logs de campagnes email (optionnelle)
CREATE TABLE campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  subject TEXT,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
