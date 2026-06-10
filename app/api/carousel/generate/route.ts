import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ImageCandidate {
  url: string;
  thumbUrl: string;
  source: string;
  license: string;
  author: string;
  authorUrl: string;
}

export interface SlideData {
  number: number;
  text: string;
  imageKeywords: string[];
  imageCandidates: ImageCandidate[];
  selectedImageUrl: string | null;
  selectedThumbUrl: string | null;
}

interface ClaudeRestaurant {
  name: string;
  address: string;
  arrondissement: string;
  cuisine: string;
  priceRange: string;
  hours: string;
  verified_sources: string[];
  verified_at: string;
  to_verify: string[];
  slides: { number: number; text: string; imageKeywords: string[] }[];
  caption: string;
  hashtags: string[];
}

// ── Prompts ────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un agent de création de contenu spécialisé dans les carrousels TikTok
mettant en avant des restaurants parisiens milieu/haut de gamme, tendance et
instagrammables (style éditorial de référence : « visionfanopa / FANOPA »).

MISSION : donner envie de découvrir un lieu parisien en 3-4 slides, puis
rediriger vers l'offre soirée de la marque (@guest_for_dinner et
@the_gentlemen_paris sur Instagram).

CRITÈRES DE SÉLECTION
- Milieu ou haut de gamme uniquement. Jamais de bistrot banal, fast-food ou chaîne.
- Très photogénique : décor fort, terrasse à vue, rooftop, architecture remarquable, dressage soigné.
- Tendance : lieux dont on parle, clientèle stylée, adaptés à une sortie chic en soirée à Paris.
- En cas de doute (pas assez beau / pas assez aspirationnel) : ne pas proposer.

RÈGLE PRIORITAIRE — FIABILITÉ
Tu ne publies JAMAIS une info non vérifiée. Vérifie via sources actuelles :
- adresse exacte (rue + code postal + arrondissement)
- horaires d'ouverture à jour
- fourchette de prix réaliste en €
- style de cuisine réellement servi
Si une info n'est pas confirmable : marque-la dans to_verify, ne l'écris pas sur la slide.

FORMAT CARROUSEL (3-4 slides MAX)
Langue : français, ton accessible, chaleureux, un peu punchy. Émojis sobres : 📍 🕐 💶 🍽️ 🗼 ✨ 🌙
- Slide 1 — Accroche : visuel fort + titre court qui crée la curiosité
- Slide 2 — Le lieu : nom + 📍 adresse + 1 phrase d'ambiance
- Slide 3 — Infos pratiques : 🕐 horaires, 💶 prix, 🍽️ cuisine, conseil utile
- Slide 4 — CTA OBLIGATOIRE : "Dîner offert avec nos restaurants partenaires 🥂\\nContacte-nous en DM 🌙\\n@guest_for_dinner & @the_gentlemen_paris\\npour organiser ta soirée à Paris."

IMAGES
Pour imageKeywords : donne 2 termes de recherche précis et distincts par slide.
Priorité : photos officielles, banques libres (Unsplash/Pexels), licence vérifiée.

INTERDICTIONS : inventer des infos, reproposer un restaurant existant, dépasser 4 slides.`;

function buildUserPrompt(excluded: string[], date: string): string {
  return `Aujourd'hui ${date}, propose 3 restaurants parisiens différents pour des carrousels TikTok.

Restaurants déjà traités (NE PAS reproposer) :
${excluded.length ? excluded.map(n => `- ${n}`).join("\n") : "(aucun pour l'instant)"}

Utilise ta capacité de recherche web pour vérifier les informations de chaque restaurant.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte avant ou après le JSON :
{
  "restaurants": [
    {
      "name": "Nom exact",
      "address": "Adresse complète + code postal",
      "arrondissement": "75011",
      "cuisine": "Type de cuisine",
      "priceRange": "~80€/pers.",
      "hours": "Mar-Sam 19h-23h",
      "verified_sources": ["https://..."],
      "verified_at": "${date}",
      "to_verify": [],
      "slides": [
        {
          "number": 1,
          "text": "Texte accroche court et punchy",
          "imageKeywords": ["paris rooftop terrace golden hour", "restaurant vue panoramique paris"]
        },
        {
          "number": 2,
          "text": "📍 Adresse exacte\\n1 phrase d'ambiance",
          "imageKeywords": ["restaurant interior paris luxury decor", "paris restaurant entrance architecture"]
        },
        {
          "number": 3,
          "text": "🕐 Horaires\\n💶 Prix\\n🍽️ Cuisine\\nConseil utile",
          "imageKeywords": ["french fine dining plating gourmet", "paris restaurant signature dish"]
        },
        {
          "number": 4,
          "text": "Dîner offert avec nos restaurants partenaires 🥂\\nContacte-nous en DM 🌙\\n@guest_for_dinner & @the_gentlemen_paris\\npour organiser ta soirée à Paris.",
          "imageKeywords": ["paris restaurant evening romantic ambiance", "candlelight dinner paris luxury"]
        }
      ],
      "caption": "Légende TikTok avec émojis, #hashtags intégrés et CTA DM",
      "hashtags": ["#paris", "#restaurant", "#nightlifeparis", "#gastronomie"]
    }
  ]
}`;
}

// ── Unsplash helper ─────────────────────────────────────────────────────────

async function searchUnsplash(query: string, perPage = 3): Promise<ImageCandidate[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` }, cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).map((p: {
      urls: { regular: string; thumb: string };
      user: { name: string; links: { html: string } };
      links: { download_location: string };
    }) => ({
      url: p.urls.regular,
      thumbUrl: p.urls.thumb,
      source: "Unsplash",
      license: "Unsplash License (usage gratuit pour usage non-commercial et commercial)",
      author: p.user.name,
      authorUrl: p.user.links.html,
      downloadLocation: p.links.download_location,
    }));
  } catch {
    return [];
  }
}

// ── Agent loop ──────────────────────────────────────────────────────────────

async function runAgent(systemPrompt: string, userPrompt: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }];

  for (let i = 0; i < 8; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: systemPrompt,
      tools: [{ type: "web_search_20250305", name: "web_search" } as unknown as Anthropic.Tool],
      messages,
    });

    if (response.stop_reason === "end_turn") {
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("");
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = response.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
        .map(b => ({ type: "tool_result" as const, tool_use_id: b.id, content: "" }));
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Unexpected stop — return what we have
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("");
  }

  throw new Error("Agent loop timed out after 8 iterations");
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "no_key", message: "ANTHROPIC_API_KEY manquante — ajoute-la dans les variables Railway." },
      { status: 503 }
    );
  }

  try {
    // 1. Get existing restaurant names for anti-duplication
    const existing = await prisma.restaurantHistory.findMany({ select: { name: true } });
    const excluded = existing.map(r => r.name);

    const date = new Date().toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric",
    });

    // 2. Call Claude agent with web search
    const rawText = await runAgent(SYSTEM_PROMPT, buildUserPrompt(excluded, date));

    // 3. Parse JSON — strip possible markdown fences
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Réponse Claude non JSON : " + rawText.slice(0, 200));
    const parsed = JSON.parse(jsonMatch[0]) as { restaurants: ClaudeRestaurant[] };

    if (!parsed.restaurants?.length) throw new Error("Aucun restaurant dans la réponse");

    // 4. For each restaurant, search Unsplash for image candidates (parallel per slide)
    const createdPosts = [];

    for (const resto of parsed.restaurants.slice(0, 3)) {
      // Anti-duplication guard
      const nameNorm = resto.name.toLowerCase().trim();
      const already = await prisma.restaurantHistory.findFirst({
        where: { name: { equals: nameNorm } },
      });
      if (already) continue;

      // Search images for each slide in parallel
      const slidesWithImages: SlideData[] = await Promise.all(
        resto.slides.map(async (slide) => {
          const keyword = slide.imageKeywords?.[0] ?? `${resto.name} paris restaurant`;
          const candidates = await searchUnsplash(keyword, 3);
          return {
            number: slide.number,
            text: slide.text,
            imageKeywords: slide.imageKeywords ?? [],
            imageCandidates: candidates,
            selectedImageUrl: null,
            selectedThumbUrl: null,
          };
        })
      );

      // Save to DB
      const history = await prisma.restaurantHistory.create({
        data: {
          name: resto.name,
          address: resto.address ?? null,
          arrondissement: resto.arrondissement ?? null,
          status: "proposed",
        },
      });

      const post = await prisma.carouselPost.create({
        data: {
          restaurantId: history.id,
          slides: JSON.stringify(slidesWithImages),
          caption: resto.caption ?? null,
          hashtags: JSON.stringify(resto.hashtags ?? []),
          verificationNotes: JSON.stringify({
            sources: resto.verified_sources ?? [],
            lastVerifiedAt: resto.verified_at ?? date,
            toVerify: resto.to_verify ?? [],
            priceRange: resto.priceRange,
            hours: resto.hours,
            cuisine: resto.cuisine,
          }),
          status: "awaiting_validation",
        },
      });

      createdPosts.push({
        postId: post.id,
        restaurantName: history.name,
        address: history.address,
        slidesCount: slidesWithImages.length,
        status: post.status,
      });
    }

    return NextResponse.json({ success: true, posts: createdPosts, count: createdPosts.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Carousel generate error:", msg);
    return NextResponse.json({ error: "generation_failed", message: msg }, { status: 500 });
  }
}
