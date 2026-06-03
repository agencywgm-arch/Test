# ManyChat — Flows Instagram DM

Configuration complète des 7 flows pour la gestion automatique des DMs Instagram.

**Prérequis :** Compte ManyChat connecté à la page Instagram professionnelle.

---

## Flow 1 — Welcome / Premier contact

**Déclencheur :** Premier DM reçu d'un nouvel abonné (trigger: "New Subscriber")

### Message 1 — Accueil
```
Bonjour {{ first_name }} ! 👋

Je suis l'assistante de [NOM PROMOTEUR], spécialiste des dîners et soirées privées à Paris. ✨

Tu viens de découvrir comment accéder gratuitement aux meilleurs restaurants et clubs de Paris avec une communauté de femmes lifestyle. 🍾

Qu'est-ce qui t'a amenée ici aujourd'hui ?
```

**Boutons :**
- 🎟️ Comment participer ?
- ❓ C'est gratuit ?
- ✅ Je veux m'inscrire
- 📋 Les critères

---

## Flow 2 — FAQ : C'est gratuit ?

**Déclencheur :** Bouton "C'est gratuit ?" OU mots-clés : `gratuit`, `prix`, `combien`, `payant`, `coût`

### Message — Réponse gratuit
```
Oui, c'est 100% GRATUIT pour toi ! 🎉

Comment c'est possible ? 

Les restaurants et clubs partenaires invitent notre communauté gratuitement car nous leur apportons une clientèle qualifiée et des femmes lifestyle qui valorisent leur établissement. 🌟

Tu ne paies rien — ni l'entrée, ni le repas dans certains cas.

Tu veux en savoir plus sur comment participer ? ⬇️
```

**Boutons :**
- ✅ Je veux m'inscrire
- 📋 Quels sont les critères ?

---

## Flow 3 — FAQ : Comment participer ?

**Déclencheur :** Bouton "Comment participer ?" OU mots-clés : `participer`, `comment`, `rejoindre`, `s'inscrire`, `inscription`

### Message — Étapes
```
Pour rejoindre notre communauté, c'est simple ! 🙌

Voici comment ça se passe :

1️⃣ Tu complètes ton profil ici (2 minutes)
2️⃣ Notre équipe valide ton profil sous 24-48h
3️⃣ Si tu es sélectionnée, on t'envoie les invitations directement en DM 📩
4️⃣ Tu confirmes ta présence et... tu profites ! 🥂

Les événements ont lieu plusieurs fois par mois — dîners privés, soirées rooftop, cocktails exclusifs...

Tu es prête à créer ton profil ?
```

**Boutons :**
- ✅ Oui, je commence !
- 📋 Les critères d'abord
- ❓ Avec une amie ?

---

## Flow 4 — FAQ : Les critères

**Déclencheur :** Bouton "Les critères" OU mots-clés : `critère`, `critères`, `condition`, `profil`, `sélection`

### Message — Critères
```
Voici ce que nous recherchons 🔍

✅ Être une femme de 18 à 35 ans
✅ Habiter en région parisienne (ou de passage à Paris)
✅ Avoir un profil Instagram actif
✅ Apprécier la gastronomie et les ambiances lifestyle
✅ Être disponible en soirée (du mardi au dimanche)

❌ Pas de critères physiques — nous valorisons la personnalité et le style de vie

C'est tout ! La sélection se base sur la cohérence de ton profil avec notre communauté.

Tu corresponds ? Crée ton profil en 2 minutes 👇
```

**Boutons :**
- ✅ Je crée mon profil
- ❓ Avec une amie ?

---

## Flow 5 — FAQ : Avec une amie ?

**Déclencheur :** Bouton "Avec une amie ?" OU mots-clés : `amie`, `copine`, `nous deux`, `ensemble`, `groupe`, `plusieurs`

### Message — Amies
```
Excellente question ! 💃💃

Oui, tu peux venir avec une ou plusieurs amies !

Pour ça, chaque amie doit :
1. Nous envoyer un DM sur ce compte
2. Créer son propre profil
3. Mentionner ton prénom dans ses infos

Si vous êtes toutes les deux sélectionnées, on essaiera de vous inviter aux mêmes événements. 🥂

Note : les places sont limitées, donc les inscriptions séparées augmentent vos chances !

Tu veux créer ton profil maintenant ?
```

**Boutons :**
- ✅ Je crée mon profil
- 📤 Partager ce compte à mon amie

---

## Flow 6 — Collecte de profil

**Déclencheur :** Bouton "Je crée mon profil" / "Oui, je commence !" / "Je m'inscris"

### Séquence de collecte (questions successives)

**Étape 1 — Prénom**
```
Super, on commence ! 🎉

Quel est ton prénom ?
```
→ Sauvegarder réponse dans custom field : `custom_prenom`

**Étape 2 — Âge**
```
Merci {{ custom_prenom }} ! 😊

Quel est ton âge ?
```
→ Sauvegarder réponse dans custom field : `custom_age`
→ Valider : nombre entre 18 et 45 (sinon : "Merci de répondre avec ton âge en chiffres (ex: 24)")

**Étape 3 — Instagram**
```
Quel est ton lien Instagram (ou @handle) ?

Exemple : @marie.lifestyle ou instagram.com/marie.lifestyle
```
→ Sauvegarder dans custom field : `custom_instagram`

**Étape 4 — Téléphone**
```
Ton numéro de téléphone ? (pour les invitations de dernière minute 📱)

Format : 06 12 34 56 78
```
→ Sauvegarder dans custom field : `custom_phone`

**Étape 5 — Email**
```
Et ton adresse email ? 📧

(Pour recevoir les récapitulatifs d'événements)
```
→ Sauvegarder dans custom field : `custom_email`

**Étape 6 — Consentement RGPD**
```
Dernière étape ! ✅

Conformément au RGPD, nous t'informons que tes données personnelles (prénom, âge, Instagram, téléphone, email) seront utilisées uniquement pour :
• Gérer ton inscription à nos événements
• Te contacter pour des invitations

Tes données ne seront jamais revendues à des tiers et seront supprimées sur simple demande.

Tu acceptes cette utilisation de tes données ?
```

**Boutons :**
- ✅ J'accepte
- ❌ Je refuse

→ Si `❌ Je refuse` :
```
Pas de problème ! Tes données ne seront pas conservées. 

Tu peux quand même nous suivre pour découvrir nos événements publics. À bientôt ! ✨
```

→ Si `✅ J'accepte` :

**Étape 7 — Confirmation envoi**
```
Parfait {{ custom_prenom }} ! 🎊

Ton profil a bien été reçu.

Notre équipe va l'examiner dans les 24-48 prochaines heures et tu recevras une réponse directement ici sur Instagram.

En attendant, n'hésite pas à suivre notre compte et à partager notre page à tes amies Parisiennes ! 💃

À très bientôt ! ✨
```

→ **Action webhook :** Envoyer POST vers n8n (URL webhook agent2-dm) avec :
```json
{
  "subscriber_id": "{{subscriber_id}}",
  "first_name": "{{custom_prenom}}",
  "age": "{{custom_age}}",
  "instagram": "{{custom_instagram}}",
  "phone": "{{custom_phone}}",
  "email": "{{custom_email}}",
  "gdpr_consent": "true",
  "timestamp": "{{current_datetime}}"
}
```

---

## Flow 7 — Réponse finale (déclenché par n8n)

**Déclencheur :** Webhook entrant depuis n8n (via ManyChat API `sendContent`)

Ce flow n'est PAS déclenché par l'utilisateur — il est déclenché par n8n après décision du promoteur.

### Message Acceptation
```
🎉 Félicitations {{ first_name }} !

Tu as été sélectionnée pour rejoindre notre communauté exclusive !

Notre équipe va te contacter très prochainement avec ta première invitation. 

En attendant :
📸 Tague-nous sur tes stories Instagram
💃 Invite tes amies Parisiennes à nous rejoindre

On se retrouve très bientôt dans les meilleurs endroits de Paris ! 🥂✨
```

### Message Refus
```
Bonjour {{ first_name }},

Merci pour ton intérêt et le temps que tu nous as accordé. 🙏

Après examen de ton profil, nous ne pouvons pas te proposer d'invitation pour le moment.

Nos événements ont des places très limitées et nous devons faire des choix difficiles.

Continue à nous suivre — nous organisons parfois des événements plus ouverts ! ✨

À bientôt,
L'équipe [NOM PROMOTEUR]
```

---

## Configuration technique ManyChat

### Webhook vers n8n
1. Dans ManyChat → Automation → Flows → Flow 6
2. À l'étape finale, ajouter une action **"External Request"**
3. URL : `https://VOTRE-N8N.railway.app/webhook/agent2-dm`
4. Méthode : POST
5. Headers : `Content-Type: application/json`
6. Body : (voir JSON ci-dessus)

### Custom Fields à créer
Dans ManyChat → Settings → Custom Fields :
- `custom_prenom` (Text)
- `custom_age` (Number)
- `custom_instagram` (Text)
- `custom_phone` (Text)
- `custom_email` (Email)
- `gdpr_consent` (Boolean)

### Keywords triggers
Dans ManyChat → Automation → Keywords :
- `gratuit`, `prix`, `payant` → Flow 2
- `participer`, `comment`, `rejoindre`, `inscription` → Flow 3
- `critère`, `condition`, `profil` → Flow 4
- `amie`, `copine`, `ensemble` → Flow 5
- `inscrire`, `commencer`, `oui`, `start` → Flow 6
