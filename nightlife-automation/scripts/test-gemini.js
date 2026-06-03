/**
 * test-gemini.js
 *
 * Teste l'API Gemini 1.5 Flash pour le scoring et la génération de contenu carrousel.
 * Démontre les prompts utilisés dans le workflow n8n agent1-content.
 *
 * Prérequis :
 *   npm install node-fetch dotenv
 *   Remplir .env avec GEMINI_API_KEY
 *
 * Usage :
 *   node scripts/test-gemini.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

if (!GEMINI_API_KEY) {
  console.error('❌ Variable manquante : GEMINI_API_KEY requise');
  process.exit(1);
}

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function geminiRequest(prompt) {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json'
      }
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${JSON.stringify(data.error)}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return { raw: text, parsed: JSON.parse(text) };
}

const RESTAURANT_SAMPLE = {
  nom: 'Le Perchoir Marais',
  description: 'Rooftop bar et restaurant avec vue panoramique sur les toits de Paris. Cuisine méditerranéenne créative, cocktails signature et ambiance festive.',
  ambiance: 'Rooftop / Bar tendance',
  cuisine: 'Méditerranéenne, Fusion',
  note: 4.4,
  nbAvis: 1287,
  adresse: '14 Rue Crespin du Gast, 75011 Paris'
};

async function testContentGeneration() {
  console.log('🎨 Test 1 — Génération contenu carrousel Instagram\n');
  console.log(`Restaurant : ${RESTAURANT_SAMPLE.nom}\n`);

  const prompt = `Tu es un expert en marketing lifestyle et nightlife parisien. Analyse ce restaurant et génère un contenu Instagram carrousel percutant pour attirer un public féminin 18-30 ans CSP+.

RESTAURANT :
Nom: ${RESTAURANT_SAMPLE.nom}
Description: ${RESTAURANT_SAMPLE.description}
Ambiance: ${RESTAURANT_SAMPLE.ambiance}
Cuisine: ${RESTAURANT_SAMPLE.cuisine}
Note: ${RESTAURANT_SAMPLE.note}/5 (${RESTAURANT_SAMPLE.nbAvis} avis)
Adresse: ${RESTAURANT_SAMPLE.adresse}

Génère un JSON avec cette structure exacte :
{
  "score_viral": [0-10],
  "score_luxe": [0-10],
  "score_feminin": [0-10],
  "score_lifestyle": [0-10],
  "score_global": [0-10],
  "slides": [
    {"titre": "[titre court percutant 3-5 mots]", "phrase": "[phrase émotionnelle 10-15 mots]"},
    {"titre": "[titre slide 2]", "phrase": "[phrase émotionnelle slide 2]"},
    {"titre": "[titre slide 3]", "phrase": "[phrase émotionnelle slide 3]"},
    {"titre": "[titre slide 4]", "phrase": "[phrase émotionnelle slide 4]"},
    {"titre": "Pour rejoindre nos prochains dîners privés", "phrase": "Envoyez-nous un message pour participer gratuitement à nos prochains restaurants et événements privés."}
  ],
  "hashtags": ["#paris", "#nightlifeparis", "..."],
  "caption_instagram": "[caption complet avec emojis et hashtags]"
}

Réponds uniquement avec le JSON valide, sans markdown ni backticks.`;

  const result = await geminiRequest(prompt);

  console.log('📊 Scores IA :');
  console.log(`   Viral     : ${result.parsed.score_viral}/10`);
  console.log(`   Luxe      : ${result.parsed.score_luxe}/10`);
  console.log(`   Féminin   : ${result.parsed.score_feminin}/10`);
  console.log(`   Lifestyle : ${result.parsed.score_lifestyle}/10`);
  console.log(`   Global    : ${result.parsed.score_global}/10`);

  console.log('\n📱 Slides carrousel :');
  result.parsed.slides?.forEach((slide, i) => {
    console.log(`\n   Slide ${i + 1} :`);
    console.log(`   Titre  : ${slide.titre}`);
    console.log(`   Phrase : ${slide.phrase}`);
  });

  console.log('\n🏷️  Hashtags :');
  console.log(`   ${result.parsed.hashtags?.join(' ')}`);

  console.log('\n📝 Caption Instagram :');
  console.log(`   ${result.parsed.caption_instagram?.substring(0, 200)}...`);

  return result.parsed;
}

async function testPhotoScoring() {
  console.log('\n\n📸 Test 2 — Scoring photos (simulation sans images réelles)\n');

  const photoDescriptions = [
    'Photo d\'un rooftop au coucher du soleil avec vue sur Paris, lumière dorée, groupe de jeunes femmes élégantes avec des cocktails colorés',
    'Photo floue d\'un intérieur de bar sombre avec peu de lumière, peu de clients visible',
    'Photo d\'une table dressée élégamment avec des bougies, verres à pied, et décoration florale moderne dans un restaurant chic'
  ];

  const prompt = `Tu es un expert en marketing Instagram lifestyle parisien. Évalue ces 3 descriptions de photos pour un compte Instagram nightlife Paris ciblant des femmes 18-30 ans CSP+.

PHOTOS :
${photoDescriptions.map((d, i) => `Photo ${i + 1}: ${d}`).join('\n')}

Pour chaque photo, attribue un score de 0 à 10 sur ces dimensions :
- qualite: qualité visuelle générale
- viral: potentiel de partage/viralité
- lifestyle: correspond au lifestyle aspirationnel
- luxe: sentiment de luxe et exclusivité
- feminin: attrait pour un public féminin

Réponds avec ce JSON exact :
{
  "photos": [
    {"id": 1, "qualite": 0, "viral": 0, "lifestyle": 0, "luxe": 0, "feminin": 0, "score_global": 0, "retenir": true},
    {"id": 2, "qualite": 0, "viral": 0, "lifestyle": 0, "luxe": 0, "feminin": 0, "score_global": 0, "retenir": false},
    {"id": 3, "qualite": 0, "viral": 0, "lifestyle": 0, "luxe": 0, "feminin": 0, "score_global": 0, "retenir": true}
  ],
  "top_photos": [1, 3],
  "recommandation": "[conseil en une phrase pour améliorer le contenu visuel]"
}`;

  const result = await geminiRequest(prompt);

  console.log('📊 Scores par photo :');
  result.parsed.photos?.forEach(p => {
    const statut = p.retenir ? '✅ Retenue' : '❌ Éliminée';
    console.log(`\n   Photo ${p.id} (${statut}) :`);
    console.log(`   Qualité: ${p.qualite}/10 | Viral: ${p.viral}/10 | Lifestyle: ${p.lifestyle}/10`);
    console.log(`   Luxe: ${p.luxe}/10 | Féminin: ${p.feminin}/10 | Global: ${p.score_global}/10`);
  });

  console.log(`\n   🏆 Photos retenues : ${result.parsed.top_photos?.join(', ')}`);
  console.log(`   💡 Recommandation : ${result.parsed.recommandation}`);
}

async function testRGPDMessage() {
  console.log('\n\n📜 Test 3 — Génération message RGPD / refus poli\n');

  const prompt = `Génère un message de refus poli en français pour une participante dont le profil ne correspond pas aux critères de sélection pour des événements nightlife parisiens exclusifs. Le message doit être :
- Chaleureux et non-blessant
- Court (maximum 3 phrases)
- Encourager à rester abonnée
- Mentionner la possibilité de futurs événements plus ouverts

Réponds avec ce JSON :
{
  "message_refus": "[le message complet]",
  "ton": "chaleureux",
  "longueur_mots": 0
}`;

  const result = await geminiRequest(prompt);
  console.log('💬 Message de refus généré :');
  console.log(`   "${result.parsed.message_refus}"`);
  console.log(`\n   Ton : ${result.parsed.ton}`);
  console.log(`   Longueur : ~${result.parsed.longueur_mots} mots`);
}

async function main() {
  console.log('🚀 Test API Gemini 1.5 Flash — Nightlife Paris\n');
  console.log(`🤖 Modèle : ${GEMINI_MODEL}\n`);
  console.log('─'.repeat(60));

  try {
    await testContentGeneration();
    await testPhotoScoring();
    await testRGPDMessage();

    console.log('\n\n✅ Tous les tests Gemini ont réussi !');
    console.log('\n📌 Prochaines étapes :');
    console.log('   1. Les prompts ci-dessus sont intégrés dans agent1-content.json');
    console.log('   2. Ajuster les scores minimaux dans le nœud "Score ≥ 6 ?" selon tes critères');
    console.log('   3. Configurer la clé API Gemini dans les credentials n8n\n');

  } catch (err) {
    console.error('\n❌ Erreur Gemini :', err.message);
    if (err.message.includes('API_KEY_INVALID')) {
      console.error('   → GEMINI_API_KEY invalide. Vérifier sur https://aistudio.google.com');
    } else if (err.message.includes('QUOTA_EXCEEDED')) {
      console.error('   → Quota dépassé. Attendre ou passer au plan payant');
    }
    process.exit(1);
  }
}

main();
