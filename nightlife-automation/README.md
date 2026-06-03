# Nightlife Paris — AI Automation Stack

Automatisation 80% des tâches d'un promoteur nightlife parisien via 3 agents IA.
Stack 100% gratuite. MVP en 30 jours.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PROMOTEUR TELEGRAM                       │
│              Valider ✅  /  Refuser ❌  /  Plus d'infos ℹ️       │
└───────────────────────┬─────────────────────────────────────────┘
                        │  Validation humaine obligatoire
          ┌─────────────┼─────────────┐
          │             │             │
    AGENT 1        AGENT 2        AGENT 3
    Contenu          DMs            Staff
      │               │               │
   Apify           ManyChat       Telegram
   Gemini          n8n webhook    n8n scheduler
   Canva           Google Sheets  Google Sheets
   Instagram/TikTok
          │             │               │
          └─────────────┴───────────────┘
                        │
                  GOOGLE SHEETS CRM
               (source de vérité centrale)
```

---

## Stack technique (100% gratuit)

| Service | Usage | Tier gratuit |
|---------|-------|-------------|
| **n8n** self-hosted | Orchestration workflows | Railway free tier |
| **Google Sheets** | CRM central | Gratuit |
| **ManyChat Free** | DM Instagram automation | Jusqu'à 1 000 contacts |
| **Apify Free** | Scraping restaurants Paris | 5$/mois de crédits offerts |
| **Gemini 1.5 Flash** | Génération textes + scoring photos | ~gratuit |
| **Canva Free** | Visuels carrousels | Gratuit |
| **Telegram Bot API** | Alertes + validations promoteur | Gratuit |

**Coût total estimé : 0–5€/mois**

---

## Prérequis

Avant de commencer, créer les comptes suivants :

1. **Railway** — https://railway.app (hébergement n8n)
2. **Google Cloud Console** — https://console.cloud.google.com (Google Sheets API + Service Account)
3. **Telegram** — Créer un bot via @BotFather, noter le token
4. **ManyChat** — https://manychat.com (connecter la page Instagram)
5. **Apify** — https://apify.com (noter le token API)
6. **Google AI Studio** — https://aistudio.google.com (clé API Gemini)
7. **Meta for Developers** — https://developers.facebook.com (Instagram Graph API token)

---

## Setup semaine par semaine

### S1 — Infrastructure (Railway + Google Sheets + n8n)

```bash
# 1. Cloner ce repo et configurer les variables d'environnement
cp config/env.example .env
# Remplir toutes les variables dans .env

# 2. Déployer n8n sur Railway
# - Créer un nouveau projet Railway
# - "Deploy from GitHub" → pointer sur ce repo
# - Railway détecte config/Dockerfile.n8n automatiquement
# - Ajouter toutes les env vars depuis .env dans Railway Dashboard

# 3. Créer et structurer le Google Sheets CRM
npm install googleapis
node scripts/setup-sheets.js

# 4. Tester le bot Telegram
node scripts/test-telegram.js

# 5. Importer les workflows n8n
# - Ouvrir n8n (https://votre-projet.railway.app)
# - Menu → Import Workflow → importer chaque fichier n8n/*.json
```

### S2 — Agent DM (ManyChat + n8n + Telegram)

```bash
# 1. Tester la connexion Gemini
node scripts/test-gemini.js

# 2. Dans ManyChat :
#    - Importer les flows décrits dans manychat/flows.md
#    - Configurer le webhook vers n8n : POST /webhook/agent2-dm

# 3. Dans n8n :
#    - Activer le workflow agent2-dm.json
#    - Copier l'URL webhook et la coller dans ManyChat

# 4. Test end-to-end :
#    - Envoyer un DM test depuis un compte Instagram personnel
#    - Vérifier que le profil arrive dans Google Sheets
#    - Vérifier que l'alerte arrive sur Telegram promoteur
```

### S3 — Agent Contenu (Apify + Gemini + Canva + Instagram)

```bash
# 1. Dans n8n :
#    - Activer le workflow agent1-content.json
#    - Configurer les credentials Apify, Gemini, Instagram Graph API

# 2. Test manuel (trigger immédiat) :
#    - Ouvrir agent1-content dans n8n
#    - Cliquer "Execute Workflow" pour test
#    - Vérifier que le message Telegram arrive avec preview carrousel

# 3. Valider le flow complet :
#    - Cliquer ✅ Valider sur Telegram
#    - Vérifier publication Instagram (mode test d'abord)
```

### S4 — Agent Staff + Tests end-to-end

```bash
# 1. Dans n8n :
#    - Activer le workflow agent3-staff.json
#    - Activer le workflow promoteur-webhook.json

# 2. Ajouter des événements tests dans Google Sheets (onglet Événements)
#    - Date = J+2 depuis aujourd'hui
#    - Ajouter staff avec leurs Telegram IDs

# 3. Attendre le trigger automatique ou forcer l'exécution

# 4. Checklist finale avant production :
#    ✓ Agent 1 : scrape → Gemini → Telegram promoteur → publication
#    ✓ Agent 2 : DM → collecte profil → qualification → Telegram promoteur
#    ✓ Agent 3 : briefing staff J-2 → confirmations → rapport J+1
#    ✓ Webhook promoteur : réponses Telegram routent correctement
#    ✓ Google Sheets : toutes les données centralisées
```

---

## Variables d'environnement

Voir `config/env.example` pour la liste complète.

Variables critiques à configurer en premier :
- `TELEGRAM_BOT_TOKEN` — depuis @BotFather
- `TELEGRAM_PROMOTEUR_CHAT_ID` — envoyer `/start` au bot, récupérer l'ID via https://api.telegram.org/bot{TOKEN}/getUpdates
- `GOOGLE_SHEETS_SPREADSHEET_ID` — dans l'URL du Google Sheets
- `GEMINI_API_KEY` — depuis Google AI Studio

---

## Roadmap 90 jours

**Mois 1** — MVP opérationnel, 3 agents à 70%, validation promoteur sur tout

**Mois 2** — Scoring IA photos amélioré, qualification DM plus fine, dashboard Google Sheets promoteur

**Mois 3** — Multi-événements en parallèle, stats de conversion automatiques, A/B test contenus

---

## Risques et conformité

- Utiliser **uniquement ManyChat** (partenaire Meta officiel) pour les DMs Instagram
- **Mention RGPD** dans le bot DM dès le premier contact (collecte données personnelles)
- **Validation humaine systématique** avant toute publication ou invitation — intégrée dans l'architecture
- **Cap de dépenses** Gemini : configurer une alerte budget dans Google Cloud Console
- Ne jamais stocker de mots de passe en clair — utiliser les credentials chiffrés de n8n
