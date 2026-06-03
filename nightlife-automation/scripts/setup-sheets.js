/**
 * setup-sheets.js
 *
 * Crée et structure automatiquement le Google Sheets CRM Nightlife Paris.
 *
 * Prérequis :
 *   npm install googleapis dotenv
 *   Remplir .env avec GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
 *   GOOGLE_SHEETS_SPREADSHEET_ID
 *
 * Usage :
 *   node scripts/setup-sheets.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });
const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');

if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
  console.error('❌ Variables manquantes : GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
  process.exit(1);
}

const auth = new google.auth.JWT(
  SERVICE_ACCOUNT_EMAIL,
  null,
  PRIVATE_KEY,
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

const SHEETS_CONFIG = [
  {
    title: 'CRM Participants',
    headers: ['ID', 'Prénom', 'Age', 'Instagram', 'Téléphone', 'Email', 'Date contact', 'Statut', 'Événement assigné', 'Source', 'Notes'],
    headerColor: { red: 0.2, green: 0.6, blue: 0.9 }
  },
  {
    title: 'Événements',
    headers: ['ID', 'Nom événement', 'Date', 'Lieu', 'Adresse', 'Heure début', 'Heure fin', 'Dress code', 'Nb participants max', 'Nb participants inscrits', 'Statut', 'Staff assigné', 'Budget estimé', 'Notes'],
    headerColor: { red: 0.4, green: 0.8, blue: 0.4 }
  },
  {
    title: 'Staff',
    headers: ['ID', 'Prénom', 'Nom', 'Telegram ID', 'WhatsApp', 'Email', 'Rôle', 'Événements assignés', 'Statut confirmation', 'Fiabilité', 'Disponibilités', 'Notes'],
    headerColor: { red: 1.0, green: 0.6, blue: 0.2 }
  },
  {
    title: 'Contenu publié',
    headers: ['ID', 'Restaurant', 'Date création', 'Statut validation', 'Date publication', 'Score global IA', 'Score viral', 'Score luxe', 'Instagram URL', 'TikTok URL', 'Nb likes Instagram', 'Nb partages', 'Caption', 'Hashtags'],
    headerColor: { red: 0.8, green: 0.4, blue: 0.8 }
  },
  {
    title: 'Log Décisions',
    headers: ['Agent', 'Action', 'Item ID', 'Date', 'Heure'],
    headerColor: { red: 0.6, green: 0.6, blue: 0.6 }
  },
  {
    title: 'Dashboard',
    headers: ['Métrique', 'Valeur', 'Détail'],
    headerColor: { red: 1.0, green: 0.8, blue: 0.0 }
  }
];

async function getExistingSheets() {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  return res.data.sheets.map(s => ({ title: s.properties.title, id: s.properties.sheetId }));
}

async function createOrGetSheet(title, existingSheets) {
  const existing = existingSheets.find(s => s.title === title);
  if (existing) {
    console.log(`  ↩️  Onglet "${title}" existe déjà (ID: ${existing.id})`);
    return existing.id;
  }

  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }]
    }
  });
  const sheetId = res.data.replies[0].addSheet.properties.sheetId;
  console.log(`  ✅ Onglet "${title}" créé (ID: ${sheetId})`);
  return sheetId;
}

async function setupSheet(config, sheetId) {
  const { title, headers, headerColor } = config;

  const requests = [
    // Écrire les en-têtes en ligne 1
    {
      updateCells: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: headers.length
        },
        rows: [{
          values: headers.map(h => ({
            userEnteredValue: { stringValue: h },
            userEnteredFormat: {
              backgroundColor: headerColor,
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
              horizontalAlignment: 'CENTER'
            }
          }))
        }],
        fields: 'userEnteredValue,userEnteredFormat'
      }
    },
    // Figer la première ligne
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 1 }
        },
        fields: 'gridProperties.frozenRowCount'
      }
    },
    // Auto-resize toutes les colonnes
    {
      autoResizeDimensions: {
        dimensions: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: headers.length
        }
      }
    }
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests }
  });

  console.log(`  📋 En-têtes configurées pour "${title}" (${headers.length} colonnes)`);
}

async function setupDashboard(sheetId) {
  const dashboardData = [
    ['=== PARTICIPANTS ===', '', ''],
    ['Total contacts DM', "=COUNTA('CRM Participants'!A2:A)", ''],
    ['Acceptées', "=COUNTIF('CRM Participants'!H:H,\"ACCEPTÉE\")", ''],
    ['Refusées', "=COUNTIF('CRM Participants'!H:H,\"REFUSÉE\")", ''],
    ['En attente', "=COUNTIF('CRM Participants'!H:H,\"EN ATTENTE VALIDATION\")", ''],
    ['Taux acceptation', '=IFERROR(B3/B2*100,0)&"%"', '% des contacts'],
    ['', '', ''],
    ['=== ÉVÉNEMENTS ===', '', ''],
    ['À venir (confirmés)', "=COUNTIF(Événements!K:K,\"CONFIRMÉ\")", ''],
    ['Terminés', "=COUNTIF(Événements!K:K,\"TERMINÉ\")", ''],
    ['', '', ''],
    ['=== CONTENU ===', '', ''],
    ['En attente validation', "=COUNTIF('Contenu publié'!D:D,\"EN ATTENTE\")", ''],
    ['Publiés', "=COUNTIF('Contenu publié'!D:D,\"PUBLIÉ\")", ''],
    ['Score moyen IA', "=IFERROR(AVERAGE('Contenu publié'!F2:F),0)", '/10'],
    ['', '', ''],
    ['=== STAFF ===', '', ''],
    ['Total membres', "=COUNTA(Staff!A2:A)", ''],
    ['Confirmés prochain event', "=COUNTIF(Staff!I:I,\"OUI\")", ''],
    ['Pas encore répondu', "=COUNTIF(Staff!I:I,\"EN ATTENTE\")", '']
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Dashboard!A2:C${dashboardData.length + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: dashboardData }
  });

  console.log('  📊 Formules Dashboard configurées');
}

async function main() {
  console.log('🚀 Setup Google Sheets — Nightlife Paris CRM\n');
  console.log(`📊 Spreadsheet ID: ${SPREADSHEET_ID}\n`);

  try {
    console.log('📋 Récupération des onglets existants...');
    const existingSheets = await getExistingSheets();
    console.log(`   ${existingSheets.length} onglet(s) trouvé(s)\n`);

    for (const config of SHEETS_CONFIG) {
      console.log(`\n🔧 Configuration de l'onglet "${config.title}"...`);
      const sheetId = await createOrGetSheet(config.title, existingSheets);
      await setupSheet(config, sheetId);

      if (config.title === 'Dashboard') {
        await setupDashboard(sheetId);
      }
    }

    console.log('\n✅ Setup terminé avec succès !');
    console.log('\n📌 Prochaines étapes :');
    console.log('   1. Ouvrir le Google Sheets et vérifier les onglets');
    console.log('   2. Partager le fichier avec le compte de service (éditeur)');
    console.log('   3. Configurer les credentials Google Sheets dans n8n');
    console.log(`\n🔗 URL : https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit\n`);

  } catch (err) {
    console.error('\n❌ Erreur :', err.message);
    if (err.errors) {
      err.errors.forEach(e => console.error('  -', e.message));
    }
    process.exit(1);
  }
}

main();
