# InstaScrap

Outil SaaS de prospection Instagram : scraping de comptes, campagnes DM automatisées, suivi en temps réel.

## Prérequis

- Node.js 18+
- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [RapidAPI](https://rapidapi.com) (gratuit, 100 req/mois)
- Un compte [Phantombuster](https://phantombuster.com) (gratuit)

## Installation

### 1. Cloner le repo

```bash
git clone <url-du-repo>
cd instascrap
npm install
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Remplissez `.env.local` :

| Variable | Où la trouver |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |
| `RAPIDAPI_KEY` | RapidAPI → Header Parameters → X-RapidAPI-Key |
| `PHANTOMBUSTER_KEY` | Phantombuster → Settings → API Key |

### 3. Initialiser la base de données Supabase

1. Allez sur supabase.com → votre projet → SQL Editor
2. Copiez-collez le contenu de `SUPABASE.sql`
3. Cliquez Run

### 4. Lancer l'application

```bash
npm run dev
```

Ouvrez http://localhost:3000 dans votre navigateur.

## Fonctionnalités

- Scraping hashtag : récupère les comptes ayant posté sur un hashtag
- Scraping usernames : analyse jusqu'à 15 comptes à la fois
- Filtres : followers min/max, engagement, email dans bio, certifiés
- Export CSV
- Campagnes DM via Phantombuster
- Suivi en temps réel des campagnes actives

## Architecture

```
src/
├── app/
│   ├── page.tsx                    → Redirect login/dashboard
│   ├── login/page.tsx              → Authentification Supabase
│   ├── dashboard/page.tsx          → App principale (3 onglets)
│   └── api/                        → Routes API (clés jamais exposées)
├── components/
│   ├── DashboardClient.tsx
│   ├── Onboarding.tsx
│   ├── ScrapingPanel.tsx
│   ├── CampaignPanel.tsx
│   ├── TrackingPanel.tsx
│   └── AccountCard.tsx
└── lib/
    ├── supabase.ts
    ├── rapidapi.ts
    └── phantombuster.ts
```
