# Wegemo — Journal des modifications

## Session du 05/06/2026

---

### 🔐 Authentification

- **Bouton "Connexion"** sur la landing page ouvre directement l'onglet "Se connecter" (plus "Créer un compte" par défaut)
- **`SignupPage`** accepte un prop `initialMode` (`signup` | `login`)
- **`onDone`** après login utilise `maybeSingle()` pour éviter une erreur si aucun groupe franchise n'existe
- **Bouton "← Retour à l'accueil"** sur la page login : fond noir, bien visible

---

### 🏢 Franchise

- **Persistance du groupe** : `initSession` vérifie d'abord le cache localStorage, puis Supabase (`maybeSingle`), sans jamais vider le cache à la déconnexion
- **Page restaurants** : si un groupe existe en cache ou en base, affiche un bloc sombre "Ma Franchise — Accéder →" au lieu du bouton "Créer un groupe"
- **`createFranchiseGroup`** vérifie localStorage et Supabase avant de créer — évite les doublons
- **Dashboard franchise** : rafraîchit toujours le vrai nom du groupe depuis Supabase au chargement (corrige le nom périmé "Mon Groupe")
- **Restaurants dans la franchise** : chargés par `owner_id` directement (plus fiable que `group_id`)
- **Détection automatique** : `RestaurantsPage` requête Supabase au montage si aucun groupe en mémoire, et met à jour l'état sans rediriger

---

### 🖼️ Logo du groupe franchise

- **Champ photo** à côté de l'emoji dans les paramètres du groupe
- Upload vers Supabase Storage (`assets/group-logos/{id}.ext`)
- Aperçu en temps réel (photo prioritaire sur emoji)
- Sidebar affiche la photo si disponible, sinon l'emoji
- Bouton ✕ pour supprimer et revenir à l'emoji
- Sauvegarde du `logo_url` dans la table `franchise_groups`

> **Prérequis Supabase** : créer un bucket public `assets` dans Storage.

---

### 🌐 Landing page

- Titre remplacé par **"Wegemo"** en très grand (gemo en rouge comme le logo)
- Suppression du badge "SaaS de commande QR pour restaurants"
- Suppression de "30 jours gratuits" et "Sans carte bancaire"
- Conservé uniquement : "✓ Support 7j/7"
- Suppression de toute mention de l'IA dans le texte hero

---

### ⭐ Avis Google (post-commande QR)

**Paramètres restaurant → section "Avis Google" :**
- Champ URL de la page avis Google (depuis Google Business Profile → "Demander des avis")
- Toggle on/off pour activer le bouton
- Badge de statut dans la section "Statut de configuration"

**Page client (après commande QR) :**
- Si configuré et activé, affiche un bloc avec logo Google officiel
- Bouton "⭐ Laisser un avis sur Google" → redirige vers l'URL configurée
- S'affiche après la notation étoiles interne

---

### 📢 Campagnes franchise

- **Deux destinataires indépendants et combinables** :
  - 👤 **Clients** — avec choix de segment (tous / top clients / inactifs)
  - 🏢 **Établissements** — avec choix tous ou sélection manuelle
- Bouton "Envoyer" désactivé si aucun destinataire sélectionné
- Historique des campagnes affiche les destinataires utilisés
- Sous-texte sous "Alertes performance" : cliquer pour audit complet

---

### 📊 Alertes performance (franchise)

- Chaque alerte est désormais **cliquable**
- Panneau d'analyse qui s'ouvre avec :
  - Diagnostic basé sur les données réelles (panier moyen, volume commandes, % de baisse)
  - Recommandations concrètes
  - Boutons : "📧 Lancer une campagne" et "📊 Voir le dashboard"

---

### 🗂️ SQL à exécuter dans Supabase

```sql
-- Colonnes Google Review dans restaurant_settings
ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS google_review_url text,
  ADD COLUMN IF NOT EXISTS google_review_enabled boolean DEFAULT false;

-- Logo URL dans franchise_groups
ALTER TABLE franchise_groups
  ADD COLUMN IF NOT EXISTS logo_url text;
```
