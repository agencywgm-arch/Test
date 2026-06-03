# Déploiement sur Vercel

## Étapes

### 1. Pousser le code sur GitHub

```bash
git add .
git commit -m "Initial commit — InstaScrap"
git remote add origin https://github.com/votre-username/instascrap.git
git push -u origin main
```

### 2. Importer le projet sur Vercel

1. Allez sur [vercel.com](https://vercel.com) et connectez-vous
2. Cliquez sur **New Project**
3. Importez votre repo GitHub `instascrap`
4. Vercel détecte automatiquement Next.js — laissez les paramètres par défaut

### 3. Configurer les variables d'environnement

Dans Vercel → Project → Settings → Environment Variables, ajoutez :

| Clé | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Votre URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Votre clé anon Supabase |
| `RAPIDAPI_KEY` | Votre clé RapidAPI |
| `PHANTOMBUSTER_KEY` | Votre clé Phantombuster |

### 4. Déployer

Cliquez sur **Deploy**. Vercel build et déploie automatiquement.

### 5. Configurer Supabase pour votre domaine Vercel

1. Allez dans votre projet Supabase
2. **Authentication → URL Configuration**
3. **Site URL** : entrez votre URL Vercel (ex: `https://instascrap.vercel.app`)
4. **Redirect URLs** : ajoutez `https://instascrap.vercel.app/**`
5. Sauvegardez

### Déploiements automatiques

À chaque `git push` sur votre branche principale, Vercel redéploie automatiquement.
