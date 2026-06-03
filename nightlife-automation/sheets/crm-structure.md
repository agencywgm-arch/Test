# Structure Google Sheets — CRM Nightlife Paris

Créer un seul Google Sheets avec 6 onglets. Partager ce fichier avec le compte de service Google (`GOOGLE_SERVICE_ACCOUNT_EMAIL`).

---

## Onglet 1 : CRM Participants

Toutes les participantes qui ont interagi via DM Instagram.

| Colonne | Type | Validation / Notes |
|---------|------|--------------------|
| **ID** | Texte | Généré automatiquement (ex: `mc_1234567890`) |
| **Prénom** | Texte | Obligatoire |
| **Age** | Nombre | Validation : entre 18 et 45 |
| **Instagram** | Texte | URL ou @handle |
| **Téléphone** | Texte | Format libre |
| **Email** | Texte | Validation : contient @ |
| **Date contact** | Date | Format `JJ/MM/AAAA` |
| **Statut** | Liste | `EN ATTENTE VALIDATION` / `ACCEPTÉE` / `REFUSÉE` / `INVITÉE` / `PRÉSENTE` |
| **Événement assigné** | Texte | Référence à l'ID événement |
| **Source** | Liste | `Instagram DM` / `Recommandation` / `Autre` |
| **Notes** | Texte | Commentaires libres |

**Mise en forme conditionnelle :**
- Statut `ACCEPTÉE` → fond vert clair
- Statut `REFUSÉE` → fond rouge clair
- Statut `EN ATTENTE VALIDATION` → fond jaune clair

---

## Onglet 2 : Événements

Calendrier de tous les événements passés et à venir.

| Colonne | Type | Validation / Notes |
|---------|------|--------------------|
| **ID** | Texte | Format `EVT-001`, `EVT-002`... |
| **Nom événement** | Texte | Ex: "Dîner Club Piscine", "Soirée Rooftop Marais" |
| **Date** | Date | Format `JJ/MM/AAAA` |
| **Lieu** | Texte | Nom de l'établissement |
| **Adresse** | Texte | Adresse complète avec code postal |
| **Heure début** | Heure | Format `HH:MM` |
| **Heure fin** | Heure | Format `HH:MM` |
| **Dress code** | Texte | Ex: "Chic casual", "Élégant", "All black" |
| **Nb participants max** | Nombre | Capacité maximale |
| **Nb participants inscrits** | Nombre | Mis à jour automatiquement |
| **Statut** | Liste | `PLANIFIÉ` / `CONFIRMÉ` / `TERMINÉ` / `ANNULÉ` |
| **Staff assigné** | Texte | IDs staff séparés par virgule |
| **Budget estimé** | Nombre | En euros |
| **Notes** | Texte | Commentaires organisateur |

**Mise en forme conditionnelle :**
- Statut `CONFIRMÉ` → fond bleu clair
- Statut `TERMINÉ` → fond gris clair
- Statut `ANNULÉ` → fond rouge clair + texte barré

---

## Onglet 3 : Staff

Répertoire de toute l'équipe.

| Colonne | Type | Validation / Notes |
|---------|------|--------------------|
| **ID** | Texte | Format `STAFF-01`, `STAFF-02`... |
| **Prénom** | Texte | |
| **Nom** | Texte | |
| **Telegram ID** | Texte | Chat ID numérique (obtenu via @userinfobot) |
| **WhatsApp** | Texte | Numéro avec indicatif pays |
| **Email** | Texte | |
| **Rôle** | Liste | `Hôtesse` / `Coordinateur` / `Sécurité` / `Photographe` / `DJ` / `Manager` |
| **Événements assignés** | Texte | IDs événements séparés par virgule |
| **Statut confirmation** | Liste | `EN ATTENTE` / `OUI` / `NON` |
| **Fiabilité** | Nombre | Score 1-5 (mis à jour après chaque événement) |
| **Disponibilités** | Texte | Ex: "Week-ends uniquement", "Tous les soirs" |
| **Notes** | Texte | |

---

## Onglet 4 : Contenu publié

Historique de tout le contenu créé et publié.

| Colonne | Type | Validation / Notes |
|---------|------|--------------------|
| **ID** | Texte | Format `CONT-001`... |
| **Restaurant** | Texte | Nom du restaurant scrapé |
| **Date création** | Date | Date de génération par l'IA |
| **Statut validation** | Liste | `EN ATTENTE` / `VALIDÉ` / `REFUSÉ` / `PUBLIÉ` |
| **Date publication** | Date | Date de publication effective |
| **Score global IA** | Nombre | Score Gemini 0-10 |
| **Score viral** | Nombre | 0-10 |
| **Score luxe** | Nombre | 0-10 |
| **Instagram URL** | URL | Lien vers le post Instagram |
| **TikTok URL** | URL | Lien vers la vidéo TikTok |
| **Nb likes Instagram** | Nombre | Mis à jour manuellement ou via API |
| **Nb partages** | Nombre | |
| **Caption** | Texte | Texte du post généré par Gemini |
| **Hashtags** | Texte | Liste des hashtags |

**Mise en forme conditionnelle :**
- Statut `PUBLIÉ` → fond vert
- Statut `REFUSÉ` → fond rouge
- Score global ≥ 8 → fond or

---

## Onglet 5 : Log Décisions

Journal automatique de toutes les décisions du promoteur.

| Colonne | Type | Notes |
|---------|------|-------|
| **Agent** | Texte | `agent1` / `agent2` / `staff` |
| **Action** | Texte | `valider` / `refuser` / `accepter` / `oui` / `non` |
| **Item ID** | Texte | ID de l'élément concerné |
| **Date** | Date | |
| **Heure** | Heure | |

---

## Onglet 6 : Dashboard

Tableau de bord avec formules automatiques. **Ne pas modifier les cellules avec formules.**

### Section A — Participants
```
A1: Total contacts DM          =COUNTA(CRM Participants!A2:A)
A2: Acceptées                  =COUNTIF(CRM Participants!H:H,"ACCEPTÉE")
A3: Refusées                   =COUNTIF(CRM Participants!H:H,"REFUSÉE")
A4: En attente                 =COUNTIF(CRM Participants!H:H,"EN ATTENTE VALIDATION")
A5: Taux d'acceptation         =IFERROR(A2/A1*100,0) & "%"
```

### Section B — Événements
```
B1: Événements à venir         =COUNTIF(Événements!E:E,"CONFIRMÉ")
B2: Événements ce mois         =COUNTIFS(Événements!C:C,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),Événements!C:C,"<="&EOMONTH(TODAY(),0))
B3: Événements terminés        =COUNTIF(Événements!E:E,"TERMINÉ")
```

### Section C — Contenu
```
C1: Contenu en attente         =COUNTIF('Contenu publié'!D:D,"EN ATTENTE")
C2: Contenu publié ce mois     =COUNTIFS('Contenu publié'!E:E,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),'Contenu publié'!D:D,"PUBLIÉ")
C3: Score moyen IA             =IFERROR(AVERAGE('Contenu publié'!F:F),0)
```

### Section D — Staff
```
D1: Total staff actif          =COUNTA(Staff!A2:A)
D2: Confirmés prochain event   =COUNTIF(Staff!H:H,"OUI")
D3: Pas encore répondu         =COUNTIF(Staff!H:H,"EN ATTENTE")
```

---

## Configuration Google Sheets API

1. Aller sur https://console.cloud.google.com
2. Créer un projet → Activer "Google Sheets API" et "Google Drive API"
3. Créer un compte de service → Télécharger le fichier JSON de clé
4. Copier `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
5. Copier `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
6. Partager le Google Sheets avec l'email du compte de service (éditeur)
7. Copier l'ID du Sheets depuis l'URL → `GOOGLE_SHEETS_SPREADSHEET_ID`
