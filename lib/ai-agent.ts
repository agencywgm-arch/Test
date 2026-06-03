import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface LeadAnalysis {
  score: number;
  scoreLabel: string;
  painPoints: string[];
  opportunities: string[];
  websiteValue: string;
  recommendedApproach: string;
  estimatedBudget: string;
}

export interface OutreachEmail {
  subject: string;
  body: string;
}

const BUSINESS_TYPES: Record<string, string> = {
  restaurant: "restaurant / café / brasserie",
  coiffeur: "salon de coiffure / barbier",
  plombier: "plombier / chauffagiste",
  electricien: "électricien",
  maconnerie: "maçon / artisan BTP",
  beaute: "institut de beauté / spa / esthétique",
  medecin: "médecin / cabinet médical",
  dentiste: "dentiste / cabinet dentaire",
  avocat: "avocat / cabinet juridique",
  comptable: "expert-comptable / comptable",
  immobilier: "agence immobilière",
  garage: "garage / mécanicien auto",
  fleuriste: "fleuriste / jardinerie",
  photographe: "photographe / vidéaste",
  coach: "coach / consultant / formateur",
  artisan: "artisan / artisanat",
  commerce: "commerce de détail / boutique",
  autre: "business / entreprise locale",
};

export async function analyzeProspect(
  businessName: string,
  businessType: string,
  city: string,
  website: string | null | undefined,
  notes: string | null | undefined
): Promise<LeadAnalysis> {
  const businessLabel =
    BUSINESS_TYPES[businessType] || BUSINESS_TYPES["autre"];
  const hasWebsite = website && website.length > 0;

  const prompt = `Tu es un expert en vente de sites web pour les entreprises locales françaises.

Analyse ce prospect et donne une évaluation précise :

**Business :** ${businessName}
**Type :** ${businessLabel}
**Ville :** ${city || "Non précisée"}
**Site web actuel :** ${hasWebsite ? website : "AUCUN SITE WEB"}
**Notes :** ${notes || "Aucune note"}

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "score": <nombre entre 0 et 100>,
  "scoreLabel": "<Froid|Tiède|Chaud|Très chaud>",
  "painPoints": ["<problème 1>", "<problème 2>", "<problème 3>"],
  "opportunities": ["<opportunité 1>", "<opportunité 2>", "<opportunité 3>"],
  "websiteValue": "<valeur spécifique qu'un site web apporterait à ce business en 1-2 phrases>",
  "recommendedApproach": "<approche commerciale recommandée pour convaincre ce prospect en 2-3 phrases>",
  "estimatedBudget": "<fourchette de budget réaliste pour ce type de business, ex: 800€ - 2000€>"
}

Critères de scoring :
- 80-100 : Pas de site web + business actif + secteur à forte demande en ligne
- 60-79 : Site web obsolète OU secteur concurrentiel
- 40-59 : Site web basique mais améliorable
- 0-39 : Déjà bien équipé digitalement`;

  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  return JSON.parse(jsonMatch[0]) as LeadAnalysis;
}

export async function generateOutreachEmail(
  businessName: string,
  businessType: string,
  city: string,
  contactName: string | null | undefined,
  analysis: LeadAnalysis,
  website: string | null | undefined
): Promise<OutreachEmail> {
  const businessLabel =
    BUSINESS_TYPES[businessType] || BUSINESS_TYPES["autre"];
  const hasWebsite = website && website.length > 0;
  const greeting = contactName ? `Bonjour ${contactName}` : "Bonjour";

  const prompt = `Tu es un expert en vente de sites web pour les entreprises locales françaises.

Rédige un email de prospection froid (cold email) percutant et personnalisé.

**Prospect :**
- Business : ${businessName} (${businessLabel})
- Ville : ${city || "France"}
- Site web actuel : ${hasWebsite ? website : "AUCUN SITE WEB"}
- Points de douleur identifiés : ${analysis.painPoints.join(", ")}
- Valeur d'un site web pour eux : ${analysis.websiteValue}
- Approche recommandée : ${analysis.recommendedApproach}

**Règles d'or pour cet email :**
1. Commence par ${greeting},
2. Personnalise dès la première phrase avec le nom du business et la ville
3. Montre que tu as fait des recherches (mentionne leur absence de site ou leur site actuel)
4. Présente 2-3 bénéfices concrets et chiffrés (ex: "70% des clients cherchent en ligne avant de visiter")
5. Inclus une preuve sociale ou statistique pertinente pour leur secteur
6. Appel à l'action clair et sans friction (ex: appel de 15min gratuit)
7. Signature professionnelle avec prénom, titre et contact
8. Ton : professionnel mais chaleureux, jamais agressif
9. Longueur : 150-250 mots maximum

Réponds UNIQUEMENT en JSON valide :
{
  "subject": "<objet accrocheur et personnalisé, max 60 caractères>",
  "body": "<corps de l'email avec sauts de ligne \\n>"
}`;

  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  return JSON.parse(jsonMatch[0]) as OutreachEmail;
}

export async function generateFollowUpEmail(
  businessName: string,
  contactName: string | null | undefined,
  originalEmail: string,
  daysSinceContact: number
): Promise<OutreachEmail> {
  const greeting = contactName ? `Bonjour ${contactName}` : "Bonjour";

  const prompt = `Tu es un expert en vente de sites web.

Rédige un email de relance courtois et efficace.

**Contexte :**
- Business : ${businessName}
- Premier email envoyé il y a ${daysSinceContact} jours
- Aucune réponse reçue
- Email original : ${originalEmail.substring(0, 300)}...

**Règles :**
1. Court et direct (80-120 mots)
2. Commence par "${greeting},"
3. Rappelle brièvement la valeur offerte sans répéter tout l'email
4. Ajoute un nouvel élément de valeur ou d'urgence (ex: offre limitée, nouvelle stat)
5. Appel à l'action simple
6. Ton respectueux, jamais insistant

Réponds UNIQUEMENT en JSON valide :
{
  "subject": "<Re: [objet original] ou nouveau sujet accrocheur>",
  "body": "<corps de l'email de relance>"
}`;

  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  return JSON.parse(jsonMatch[0]) as OutreachEmail;
}
