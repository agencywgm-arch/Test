/**
 * test-telegram.js
 *
 * Teste la connexion Telegram Bot et le flow de validation promoteur.
 * Envoie un message de test avec boutons inline Valider/Refuser/Plus d'infos.
 *
 * Prérequis :
 *   npm install node-fetch dotenv
 *   Remplir .env avec TELEGRAM_BOT_TOKEN et TELEGRAM_PROMOTEUR_CHAT_ID
 *
 * Usage :
 *   node scripts/test-telegram.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_PROMOTEUR_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('❌ Variables manquantes : TELEGRAM_BOT_TOKEN et TELEGRAM_PROMOTEUR_CHAT_ID requis');
  process.exit(1);
}

const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function telegramRequest(method, body) {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch(`${BASE_URL}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API error: ${data.description}`);
  return data.result;
}

async function testBotInfo() {
  console.log('🤖 Récupération des infos du bot...');
  const bot = await telegramRequest('getMe', {});
  console.log(`   ✅ Bot connecté : @${bot.username} (${bot.first_name})`);
  return bot;
}

async function sendTestValidation() {
  console.log('\n📤 Envoi du message de test validation...');

  const message = await telegramRequest('sendMessage', {
    chat_id: CHAT_ID,
    parse_mode: 'Markdown',
    text: `🧪 *TEST — Validation Nightlife Paris*\n\nCeci est un message de test pour vérifier le flow de validation promoteur.\n\n*Scénario Agent 1 (Contenu) :*\n🍽️ Restaurant test : _Le Perchoir Marais_\n📊 Score IA : 8.5/10\n📍 Paris 3e\n\n_Si vous voyez ce message, le bot Telegram fonctionne correctement !_\n\nTestez les boutons ci-dessous :`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Valider et publier', callback_data: 'test_valider_test123' },
          { text: '❌ Refuser', callback_data: 'test_refuser_test123' }
        ],
        [
          { text: 'ℹ️ Plus d\'infos', callback_data: 'test_info_test123' }
        ]
      ]
    }
  });

  console.log(`   ✅ Message envoyé (ID: ${message.message_id})`);
  return message;
}

async function sendAgentDMTest() {
  console.log('\n📤 Envoi du message de test Agent 2 (DM)...');

  await telegramRequest('sendMessage', {
    chat_id: CHAT_ID,
    parse_mode: 'Markdown',
    text: `👤 *TEST — Nouveau profil DM*\n\n*Marie Dupont*, 26 ans\n\n📸 Instagram : @marie.lifestyle.paris\n📱 Téléphone : 06 12 34 56 78\n📧 Email : marie@test.com\n\n📅 Contact le : ${new Date().toLocaleDateString('fr-FR')}\n🔗 Source : Instagram DM\n\n_Ceci est un profil de test._`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Accepter', callback_data: 'agent2_accepter_test_dm_123' },
          { text: '❌ Refuser', callback_data: 'agent2_refuser_test_dm_123' }
        ],
        [
          { text: 'ℹ️ Plus d\'infos', callback_data: 'agent2_info_test_dm_123' }
        ]
      ]
    }
  });

  console.log('   ✅ Message Agent 2 envoyé');
}

async function sendStaffBriefingTest() {
  console.log('\n📤 Envoi du message de test Agent 3 (Staff)...');

  await telegramRequest('sendMessage', {
    chat_id: CHAT_ID,
    parse_mode: 'Markdown',
    text: `📋 *TEST BRIEFING — Dîner Club Opéra*\n\nBonjour [Prénom] ! Voici ton briefing pour dans 2 jours.\n\n📅 *Date :* ${new Date(Date.now() + 2 * 86400000).toLocaleDateString('fr-FR')}\n⏰ *Horaires :* 20:00 → 01:00\n📍 *Lieu :* Club Opéra\n🗺️ *Adresse :* 12 rue Auber, 75009 Paris\n👗 *Dress code :* Chic élégant\n\n🎯 *Ton rôle :* Hôtesse d'accueil\n\n_Confirme ta présence :_`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ OUI, je serai là !', callback_data: 'staff_oui_STAFF01_EVT001' },
          { text: '❌ Je ne peux pas', callback_data: 'staff_non_STAFF01_EVT001' }
        ]
      ]
    }
  });

  console.log('   ✅ Message Agent 3 envoyé');
}

async function checkWebhook() {
  console.log('\n🔗 Vérification du webhook Telegram...');
  const info = await telegramRequest('getWebhookInfo', {});

  if (info.url) {
    console.log(`   ✅ Webhook configuré : ${info.url}`);
    if (info.last_error_message) {
      console.warn(`   ⚠️  Dernière erreur : ${info.last_error_message}`);
    }
  } else {
    console.log('   ℹ️  Aucun webhook configuré');
    const n8nUrl = process.env.N8N_WEBHOOK_BASE_URL;
    if (n8nUrl) {
      console.log(`\n   Pour configurer le webhook vers n8n, exécuter :`);
      console.log(`   curl "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${n8nUrl}/webhook/telegram-webhook"`);
    }
  }
}

async function main() {
  console.log('🚀 Test connexion Telegram — Nightlife Paris\n');

  try {
    await testBotInfo();
    await checkWebhook();
    await sendTestValidation();
    await sendAgentDMTest();
    await sendStaffBriefingTest();

    console.log('\n✅ Tous les tests ont réussi !');
    console.log('\n📱 Vérifie Telegram — tu dois avoir reçu 3 messages avec boutons.');
    console.log('\n📌 Prochaines étapes :');
    console.log('   1. Configurer le webhook Telegram vers n8n (voir commande curl ci-dessus)');
    console.log('   2. Importer les workflows n8n depuis n8n/*.json');
    console.log('   3. Activer le workflow promoteur-webhook.json en premier\n');

  } catch (err) {
    console.error('\n❌ Erreur :', err.message);
    if (err.message.includes('chat not found')) {
      console.error('   → TELEGRAM_PROMOTEUR_CHAT_ID invalide. Envoie /start au bot et récupère ton chat_id via /getUpdates');
    } else if (err.message.includes('Unauthorized')) {
      console.error('   → TELEGRAM_BOT_TOKEN invalide. Vérifie le token avec @BotFather');
    }
    process.exit(1);
  }
}

main();
