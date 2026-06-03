import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 10);

  const promoteur = await prisma.promoteur.upsert({
    where: { email: "promoteur@nightlife.paris" },
    update: {},
    create: {
      email: "promoteur@nightlife.paris",
      password,
      nom: "Promoteur Paris",
    },
  });
  console.log(`✅ Compte créé : ${promoteur.email} / admin123`);

  // Événements demo
  const evt1 = await prisma.evenement.upsert({
    where: { id: "evt-demo-1" },
    update: {},
    create: {
      id: "evt-demo-1",
      nom: "Dîner Rooftop Marais",
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      lieu: "Le Perchoir Marais",
      adresse: "14 Rue Crespin du Gast, 75011 Paris",
      heureDebut: "20:00",
      heureFin: "01:00",
      dressCode: "Chic élégant",
      maxParticipants: 40,
      statut: "CONFIRME",
    },
  });

  const evt2 = await prisma.evenement.upsert({
    where: { id: "evt-demo-2" },
    update: {},
    create: {
      id: "evt-demo-2",
      nom: "Soirée Club Opéra",
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      lieu: "Club Opéra",
      adresse: "12 Rue Auber, 75009 Paris",
      heureDebut: "23:00",
      heureFin: "05:00",
      dressCode: "All black",
      maxParticipants: 60,
      statut: "PLANIFIE",
    },
  });

  // Participants demo
  const participantsDemo = [
    { prenom: "Léa", age: 24, instagram: "@lea.paris.lifestyle", statut: "EN_ATTENTE", evenementId: evt1.id },
    { prenom: "Camille", age: 27, instagram: "@camille.mode", statut: "ACCEPTEE", evenementId: evt1.id },
    { prenom: "Sofia", age: 22, instagram: "@sofia.nightlife", statut: "ACCEPTEE", evenementId: evt1.id },
    { prenom: "Marine", age: 29, instagram: "@marine.paris", statut: "REFUSEE" },
    { prenom: "Julie", age: 25, instagram: "@julie.style.paris", statut: "EN_ATTENTE", evenementId: evt2.id },
    { prenom: "Emma", age: 23, instagram: "@emma.luxe", statut: "EN_ATTENTE" },
    { prenom: "Chloé", age: 28, instagram: "@chloe.events.paris", statut: "ACCEPTEE", evenementId: evt2.id },
  ];

  for (const p of participantsDemo) {
    await prisma.participant.upsert({
      where: { id: `part-${p.prenom.toLowerCase()}` },
      update: {},
      create: {
        id: `part-${p.prenom.toLowerCase()}`,
        prenom: p.prenom,
        age: p.age,
        instagram: p.instagram,
        email: `${p.prenom.toLowerCase()}@demo.com`,
        telephone: "06 XX XX XX XX",
        statut: p.statut,
        evenementId: p.evenementId ?? null,
        source: "Instagram DM",
      },
    });
  }
  console.log(`✅ ${participantsDemo.length} participantes créées`);

  // Staff demo
  const staffDemo = [
    { prenom: "Alex", nom: "Martin", role: "Coordinateur", fiabilite: 5 },
    { prenom: "Sara", nom: "Dupont", role: "Hôtesse", fiabilite: 4 },
    { prenom: "Romain", nom: "Bernard", role: "Sécurité", fiabilite: 5 },
    { prenom: "Nina", nom: "Leroy", role: "Hôtesse", fiabilite: 3 },
  ];

  for (const s of staffDemo) {
    const staff = await prisma.staff.upsert({
      where: { id: `staff-${s.prenom.toLowerCase()}` },
      update: {},
      create: {
        id: `staff-${s.prenom.toLowerCase()}`,
        prenom: s.prenom,
        nom: s.nom,
        role: s.role,
        fiabilite: s.fiabilite,
        email: `${s.prenom.toLowerCase()}@demo.com`,
      },
    });

    await prisma.staffEvenement.upsert({
      where: { staffId_evenementId: { staffId: staff.id, evenementId: evt1.id } },
      update: {},
      create: {
        staffId: staff.id,
        evenementId: evt1.id,
        statut: s.fiabilite >= 4 ? "OUI" : "EN_ATTENTE",
      },
    });
  }
  console.log(`✅ ${staffDemo.length} membres staff créés`);

  // Contenu demo
  const contenusDemo = [
    {
      id: "cont-demo-1",
      restaurant: "Le Perchoir Marais",
      scoreGlobal: 8.5,
      scoreViral: 9,
      scoreLuxe: 8,
      slides: JSON.stringify([
        { titre: "Paris vue d'en haut", phrase: "Quand le coucher de soleil se mêle au champagne sur les toits" },
        { titre: "Une cuisine d'exception", phrase: "Chaque plat raconte une histoire de saveurs méditerranéennes" },
        { titre: "L'ambiance qui fait tout", phrase: "Musique, lumières tamisées et compagnie parfaite" },
        { titre: "Rejoins nos dîners privés", phrase: "Envoie-nous un message pour participer gratuitement" },
      ]),
      caption: "🌅 Paris comme tu ne l'as jamais vécu. Le Perchoir Marais t'attend pour nos prochains dîners exclusifs. Gratuit. Sélectif. Inoubliable. #nightlifeparis #dinerexclusif #rooftopparis",
      hashtags: "#nightlifeparis #rooftopparis #lifestyle #paris #luxe",
      statut: "EN_ATTENTE",
    },
    {
      id: "cont-demo-2",
      restaurant: "Brach Paris",
      scoreGlobal: 7.5,
      scoreViral: 7,
      scoreLuxe: 8,
      slides: JSON.stringify([
        { titre: "Hôtel particulier", phrase: "Un palace discret au cœur du 16ème" },
        { titre: "Bar signature", phrase: "Les cocktails les plus photographiés de Paris" },
        { titre: "Soirée intime", phrase: "50 invitées. Aucune publicité. Tout le frisson." },
        { titre: "Ta prochaine soirée", phrase: "Envoie-nous un DM pour rejoindre la liste" },
      ]),
      caption: "✨ Brach Paris — là où le luxe discret rencontre l'atmosphère la plus exclusive de la ville. Nos prochains événements privés arrivent. #paris #luxe #soiree",
      hashtags: "#paris #luxe #soireeprivee #brach #lifestyle",
      statut: "VALIDE",
    },
  ];

  for (const c of contenusDemo) {
    await prisma.contenu.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }
  console.log(`✅ ${contenusDemo.length} contenus créés`);
  console.log("\n📱 Accès : email = promoteur@nightlife.paris / mdp = admin123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
