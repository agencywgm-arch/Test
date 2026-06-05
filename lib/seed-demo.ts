import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export async function seedIfEmpty() {
  try {
    // Vérifie si les participants existent déjà
    const count = await prisma.participant.count();
    if (count >= 25) {
      console.log("✅ DB déjà peuplée, seed ignoré");
      return;
    }
    console.log(`ℹ️ ${count} participants trouvés — reseed en cours...`);

    console.log("🌱 DB vide — lancement du seed démo...");

    const password = await bcrypt.hash("admin123", 10);
    await prisma.promoteur.upsert({
      where: { email: "promoteur@nightlife.paris" },
      update: {},
      create: { email: "promoteur@nightlife.paris", password, nom: "Promoteur Paris" },
    });

    const now = Date.now();
    const D = (days: number) => new Date(now + days * 86400000);

    const events = [
      { id: "evt-1", nom: "Dîner Rooftop Marais", date: D(4), lieu: "Le Perchoir Marais", adresse: "14 Rue Crespin du Gast, 75011 Paris", heureDebut: "20:00", heureFin: "01:00", dressCode: "Chic élégant", maxParticipants: 40, statut: "CONFIRME" },
      { id: "evt-2", nom: "Soirée Club Opéra", date: D(11), lieu: "Club Opéra", adresse: "12 Rue Auber, 75009 Paris", heureDebut: "23:00", heureFin: "05:00", dressCode: "All black", maxParticipants: 60, statut: "PLANIFIE" },
      { id: "evt-3", nom: "Brunch Privé Saint-Germain", date: D(18), lieu: "Café de Flore Privatisé", adresse: "172 Bd Saint-Germain, 75006 Paris", heureDebut: "11:30", heureFin: "15:00", dressCode: "Smart casual", maxParticipants: 25, statut: "PLANIFIE" },
      { id: "evt-4", nom: "Pool Party Vincennes", date: D(-7), lieu: "Villa Privée Vincennes", adresse: "Vincennes, 94300", heureDebut: "15:00", heureFin: "22:00", dressCode: "Summer chic", maxParticipants: 35, statut: "TERMINE" },
      { id: "evt-5", nom: "Cocktail Terrace Pigalle", date: D(-21), lieu: "Terrass Hotel", adresse: "12-14 Rue Joseph de Maistre, 75018 Paris", heureDebut: "19:00", heureFin: "00:00", dressCode: "Bohème luxe", maxParticipants: 30, statut: "TERMINE" },
    ];
    for (const e of events) {
      await prisma.evenement.upsert({ where: { id: e.id }, update: {}, create: e });
    }

    const participants = [
      { id: "p-01", prenom: "Léa", age: 24, instagram: "@lea.paris.lifestyle", statut: "ACCEPTEE", evenementId: "evt-1" },
      { id: "p-02", prenom: "Camille", age: 27, instagram: "@camille.mode.paris", statut: "ACCEPTEE", evenementId: "evt-1" },
      { id: "p-03", prenom: "Sofia", age: 22, instagram: "@sofia.nightlife", statut: "ACCEPTEE", evenementId: "evt-1" },
      { id: "p-04", prenom: "Clara", age: 25, instagram: "@clara.luxe", statut: "EN_ATTENTE", evenementId: "evt-1" },
      { id: "p-05", prenom: "Inès", age: 26, instagram: "@ines.parisienne", statut: "EN_ATTENTE", evenementId: "evt-1" },
      { id: "p-06", prenom: "Juliette", age: 23, instagram: "@juliette.style", statut: "REFUSEE", evenementId: "evt-1" },
      { id: "p-07", prenom: "Julie", age: 25, instagram: "@julie.style.paris", statut: "ACCEPTEE", evenementId: "evt-2" },
      { id: "p-08", prenom: "Chloé", age: 28, instagram: "@chloe.events.paris", statut: "ACCEPTEE", evenementId: "evt-2" },
      { id: "p-09", prenom: "Manon", age: 21, instagram: "@manon.clubbing", statut: "EN_ATTENTE", evenementId: "evt-2" },
      { id: "p-10", prenom: "Élodie", age: 29, instagram: "@elodie.vip", statut: "EN_ATTENTE", evenementId: "evt-2" },
      { id: "p-11", prenom: "Yasmine", age: 24, instagram: "@yasmine.paris.night", statut: "EN_ATTENTE", evenementId: "evt-2" },
      { id: "p-12", prenom: "Mathilde", age: 30, instagram: "@mathilde.brunch.paris", statut: "EN_ATTENTE", evenementId: "evt-3" },
      { id: "p-13", prenom: "Anaïs", age: 26, instagram: "@anais.sg", statut: "ACCEPTEE", evenementId: "evt-3" },
      { id: "p-14", prenom: "Océane", age: 23, instagram: "@oceane.summer", statut: "PRESENTE", evenementId: "evt-4" },
      { id: "p-15", prenom: "Lola", age: 27, instagram: "@lola.vincennes", statut: "PRESENTE", evenementId: "evt-4" },
      { id: "p-16", prenom: "Sara", age: 25, instagram: "@sara.pool.paris", statut: "PRESENTE", evenementId: "evt-4" },
      { id: "p-17", prenom: "Noémie", age: 22, instagram: "@noemie.events", statut: "PRESENTE", evenementId: "evt-4" },
      { id: "p-18", prenom: "Alexia", age: 28, instagram: "@alexia.pigalle", statut: "PRESENTE", evenementId: "evt-5" },
      { id: "p-19", prenom: "Priya", age: 24, instagram: "@priya.paris.luxe", statut: "PRESENTE", evenementId: "evt-5" },
      { id: "p-20", prenom: "Valentine", age: 26, instagram: "@valentine.terrasse", statut: "PRESENTE", evenementId: "evt-5" },
      { id: "p-21", prenom: "Emma", age: 23, instagram: "@emma.luxe.paris", statut: "EN_ATTENTE", evenementId: null },
      { id: "p-22", prenom: "Jade", age: 20, instagram: "@jade.new.paris", statut: "EN_ATTENTE", evenementId: null },
      { id: "p-23", prenom: "Marine", age: 29, instagram: "@marine.paris.night", statut: "REFUSEE", evenementId: null },
      { id: "p-24", prenom: "Pauline", age: 31, instagram: "@pauline.lifestyle", statut: "REFUSEE", evenementId: null },
      { id: "p-25", prenom: "Rania", age: 25, instagram: "@rania.paris.glam", statut: "ACCEPTEE", evenementId: null },
    ];
    for (const p of participants) {
      await prisma.participant.upsert({
        where: { id: p.id }, update: {},
        create: {
          id: p.id, prenom: p.prenom, age: p.age, instagram: p.instagram,
          email: `${p.id}@demo.com`, statut: p.statut,
          evenementId: p.evenementId ?? null, source: "Instagram DM",
        },
      });
    }

    const staffList = [
      { id: "st-1", prenom: "Alex", nom: "Martin", role: "Coordinateur", fiabilite: 5, whatsapp: "+33612345678" },
      { id: "st-2", prenom: "Sara", nom: "Dupont", role: "Hôtesse", fiabilite: 4, whatsapp: "+33623456789" },
      { id: "st-3", prenom: "Romain", nom: "Bernard", role: "Sécurité", fiabilite: 5, whatsapp: "+33634567890" },
      { id: "st-4", prenom: "Nina", nom: "Leroy", role: "Hôtesse", fiabilite: 3, whatsapp: "+33645678901" },
      { id: "st-5", prenom: "Karim", nom: "Benali", role: "DJ", fiabilite: 5, whatsapp: "+33656789012" },
      { id: "st-6", prenom: "Lucas", nom: "Moreau", role: "Photographe", fiabilite: 4, whatsapp: "+33667890123" },
      { id: "st-7", prenom: "Jade", nom: "Petit", role: "Hôtesse", fiabilite: 4, whatsapp: "+33678901234" },
      { id: "st-8", prenom: "Thomas", nom: "Girard", role: "Manager", fiabilite: 5, whatsapp: "+33689012345" },
    ];
    for (const s of staffList) {
      await prisma.staff.upsert({
        where: { id: s.id }, update: {},
        create: { id: s.id, prenom: s.prenom, nom: s.nom, role: s.role, fiabilite: s.fiabilite, whatsapp: s.whatsapp, email: `${s.id}@demo.com` },
      });
    }

    const assignments = [
      { staffId: "st-1", evenementId: "evt-1", statut: "OUI" },
      { staffId: "st-2", evenementId: "evt-1", statut: "OUI" },
      { staffId: "st-3", evenementId: "evt-1", statut: "OUI" },
      { staffId: "st-6", evenementId: "evt-1", statut: "OUI" },
      { staffId: "st-7", evenementId: "evt-1", statut: "EN_ATTENTE" },
      { staffId: "st-1", evenementId: "evt-2", statut: "OUI" },
      { staffId: "st-3", evenementId: "evt-2", statut: "EN_ATTENTE" },
      { staffId: "st-5", evenementId: "evt-2", statut: "OUI" },
      { staffId: "st-7", evenementId: "evt-2", statut: "EN_ATTENTE" },
      { staffId: "st-8", evenementId: "evt-2", statut: "OUI" },
      { staffId: "st-1", evenementId: "evt-3", statut: "EN_ATTENTE" },
      { staffId: "st-2", evenementId: "evt-3", statut: "OUI" },
      { staffId: "st-6", evenementId: "evt-3", statut: "EN_ATTENTE" },
      { staffId: "st-1", evenementId: "evt-4", statut: "OUI" },
      { staffId: "st-2", evenementId: "evt-4", statut: "OUI" },
      { staffId: "st-3", evenementId: "evt-4", statut: "OUI" },
      { staffId: "st-4", evenementId: "evt-4", statut: "NON" },
      { staffId: "st-5", evenementId: "evt-4", statut: "OUI" },
      { staffId: "st-2", evenementId: "evt-5", statut: "OUI" },
      { staffId: "st-6", evenementId: "evt-5", statut: "OUI" },
      { staffId: "st-8", evenementId: "evt-5", statut: "OUI" },
    ];
    for (const a of assignments) {
      await prisma.staffEvenement.upsert({
        where: { staffId_evenementId: { staffId: a.staffId, evenementId: a.evenementId } },
        update: {}, create: a,
      });
    }

    const D5ago = new Date(Date.now() - 5 * 86400000);
    const D12ago = new Date(Date.now() - 12 * 86400000);

    // Each slide includes photoId so CarouselViewer shows the real restaurant photo
    const mkSlides = (photoId: string, items: { titre: string; phrase: string }[]) =>
      JSON.stringify(items.map(s => ({ ...s, photoId })));

    const contenus = [
      {
        id: "ct-1", restaurant: "Le Perchoir Marais",
        scoreGlobal: 8.5, scoreViral: 9, scoreLuxe: 8, statut: "EN_ATTENTE", publishedAt: null,
        caption: "🌅 Paris comme tu ne l'as jamais vécu. Le Perchoir Marais t'attend pour nos prochains dîners exclusifs. Gratuit. Sélectif. Inoubliable.",
        hashtags: "#leperchoir #rooftopparis #marais #nightlifeparis #sunset",
        slides: mkSlides("1519864600265-abb23847ef5b", [
          { titre: "Paris vue d'en haut", phrase: "Le coucher de soleil depuis Le Perchoir — chaque soir un tableau différent" },
          { titre: "Dîner au sommet", phrase: "Cuisine méditerranéenne avec les toits de Paris pour décor" },
          { titre: "L'ambiance qui fait tout", phrase: "Musique curatée, lumières tamisées, cercle très select" },
          { titre: "Rejoins le prochain dîner", phrase: "Places limitées — envoie-nous un DM pour candidater" },
        ]),
      },
      {
        id: "ct-2", restaurant: "Brach Paris",
        scoreGlobal: 7.5, scoreViral: 7, scoreLuxe: 8, statut: "VALIDE", publishedAt: null,
        caption: "✨ Brach Paris — là où le luxe discret rencontre l'atmosphère la plus exclusive. Nos événements privés arrivent.",
        hashtags: "#brach #paris16 #luxe #soireeprivee #philippestarck",
        slides: mkSlides("1492571350019-22de08371d37", [
          { titre: "Hôtel particulier discret", phrase: "Un palace caché au cœur du 16ème" },
          { titre: "Bar signature", phrase: "Les cocktails les plus photographiés de tout Paris" },
          { titre: "Soirée intime & ultra-triée", phrase: "50 invitées max. Aucune pub. Tout le frisson." },
          { titre: "Ta prochaine soirée", phrase: "Envoie un DM pour rejoindre la liste VIP" },
        ]),
      },
      {
        id: "ct-3", restaurant: "Girafe Restaurant",
        scoreGlobal: 9.2, scoreViral: 9.5, scoreLuxe: 9.2, statut: "EN_ATTENTE", publishedAt: null,
        caption: "🗼 La Tour Eiffel comme toile de fond. Notre prochain dîner chez Girafe sera inoubliable. Places très limitées.",
        hashtags: "#giraferestaurant #toureiffel #trocadero #luxeparis #gastronomie",
        slides: mkSlides("1503917988258-f87a78e3c995", [
          { titre: "La Tour Eiffel en fond", phrase: "Dîner face au monument le plus célèbre du monde" },
          { titre: "Cuisine franco-méditerranéenne", phrase: "Des saveurs qui transportent, une vue qui captive" },
          { titre: "La salle la plus photogénique de Paris", phrase: "Chaque angle est une carte postale" },
          { titre: "Sois des nôtres", phrase: "Réponds à notre story pour rejoindre le prochain dîner privé" },
        ]),
      },
      {
        id: "ct-4", restaurant: "Loulou Restaurant",
        scoreGlobal: 6.8, scoreViral: 6, scoreLuxe: 7, statut: "REFUSE", publishedAt: null,
        caption: "🌿 Loulou au Jardin des Tuileries — nos brunchs et dîners dans le jardin le plus chic de Paris.",
        hashtags: "#loulouparis #louvre #tuileries #paris1er #brunch",
        slides: mkSlides("1473116763249-eb81d4fa6e6e", [
          { titre: "Jardin des Tuileries, table dressée", phrase: "Un restaurant suspendu entre Paris et l'art" },
          { titre: "Cuisine italienne chic", phrase: "Les meilleures pâtes fraîches avec le Louvre en fond" },
        ]),
      },
      {
        id: "ct-5", restaurant: "Lapérouse",
        scoreGlobal: 8.0, scoreViral: 7, scoreLuxe: 9, statut: "PUBLIE", publishedAt: D5ago,
        caption: "🕯️ Lapérouse — le rendez-vous secret des Parisiens depuis 1766. Notre prochain dîner privé dans les salons historiques.",
        hashtags: "#laperouse #paris #gastronomie #luxury #saintgermain",
        slides: mkSlides("1551218372-a8789b81b253", [
          { titre: "Le restaurant le plus mystérieux de Paris", phrase: "Depuis 1766, Lapérouse garde ses secrets" },
          { titre: "Salons privés hors du temps", phrase: "Chaque cabinet raconte une romance parisienne" },
          { titre: "Cuisine gastronomique dans un décor d'or", phrase: "Velours, bougies et dîner d'exception" },
          { titre: "Une soirée que l'on n'oublie pas", phrase: "Places rares. Accès sur invitation uniquement." },
        ]),
      },
      {
        id: "ct-6", restaurant: "Terass Hotel Rooftop",
        scoreGlobal: 8.8, scoreViral: 9, scoreLuxe: 8, statut: "PUBLIE", publishedAt: D12ago,
        caption: "🌇 Terass Hotel — Montmartre au coucher du soleil. Notre prochaine soirée privée : bientôt.",
        hashtags: "#montmartre #rooftopparis #cocktails #paris18 #nightlife",
        slides: mkSlides("1502602493604-6018e1c46f7a", [
          { titre: "Montmartre vu du ciel", phrase: "Le rooftop le plus photogénique du 18ème" },
          { titre: "Cocktails au coucher du soleil", phrase: "Quand Sacré-Cœur illumine ton verre" },
          { titre: "Les meilleures personnes de Paris", phrase: "Un cercle sélect qui se retrouve chaque semaine" },
          { titre: "La prochaine fois, c'est toi", phrase: "Réponds à notre story pour rejoindre la liste" },
        ]),
      },
      {
        id: "ct-7", restaurant: "Brasserie Lutetia",
        scoreGlobal: 7.2, scoreViral: 6, scoreLuxe: 8, statut: "EN_ATTENTE", publishedAt: null,
        caption: "🦪 Lutetia Paris — notre prochaine soirée gastronomique dans ce palace historique. Candidatures ouvertes.",
        hashtags: "#lutetia #palace #saintgermain #brasserie #gastronomie",
        slides: mkSlides("1414235077428-338989a2e8c0", [
          { titre: "L'hôtel des artistes depuis 1910", phrase: "Picasso, Hemingway, Gainsbourg — tous ont dormi ici" },
          { titre: "Brasserie d'exception", phrase: "Les meilleures huîtres et le champagne en abondance" },
          { titre: "Soirée très select", phrase: "30 places. Ambiance feutrée. Tenue de rigueur." },
        ]),
      },
      {
        id: "ct-8", restaurant: "Silencio Club",
        scoreGlobal: 9.0, scoreViral: 9, scoreLuxe: 9, statut: "VALIDE", publishedAt: null,
        caption: "🖤 Silencio — le club imaginé par David Lynch. Notre prochaine soirée privée dans les coulisses de Paris. Accès ultra-sélectif.",
        hashtags: "#silencio #davidlynch #paris #clubparis #nightlifeparis",
        slides: mkSlides("1508214751196-bcfd4ca60f91", [
          { titre: "Le club le plus secret de Paris", phrase: "Imaginé par David Lynch, réservé aux élus" },
          { titre: "Architecture unique au monde", phrase: "Chaque salle est une œuvre d'art habitée" },
          { titre: "La nuit dans sa version la plus pure", phrase: "Ni vu ni connu, juste ressenti" },
          { titre: "Tu veux entrer ?", phrase: "La liste est fermée. Envoie un DM quand même." },
        ]),
      },
    ];
    for (const c of contenus) {
      await prisma.contenu.upsert({ where: { id: c.id }, update: {}, create: c });
    }

    console.log("🎉 Seed démo terminé — 5 events, 25 participants, 8 staff, 8 contenus");
  } catch (err) {
    console.error("⚠️ Seed error (non bloquant):", err);
  }
}
