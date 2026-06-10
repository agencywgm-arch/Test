export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import TikTokValidator from "@/components/TikTokValidator";
import type { SlideData } from "@/app/api/carousel/generate/route";

export default async function TikTokPage() {
  await requireAuth();

  const posts = await prisma.carouselPost.findMany({
    where: { status: { in: ["awaiting_validation", "validated", "composed", "delivered"] } },
    include: { restaurant: true },
    orderBy: { createdAt: "desc" },
  });

  const initialPosts = posts.map(p => ({
    id: p.id,
    status: p.status,
    restaurantName: p.restaurant.name,
    address: p.restaurant.address ?? null,
    createdAt: p.createdAt.toISOString(),
    slides: (() => {
      try { return JSON.parse(p.slides) as SlideData[]; } catch { return [] as SlideData[]; }
    })(),
    caption: p.caption ?? null,
    hashtags: (() => {
      try { return JSON.parse(p.hashtags ?? "[]") as string[]; } catch { return [] as string[]; }
    })(),
    verificationNotes: (() => {
      try {
        return JSON.parse(p.verificationNotes ?? "{}") as {
          sources?: string[];
          lastVerifiedAt?: string;
          toVerify?: string[];
          priceRange?: string;
          hours?: string;
          cuisine?: string;
        };
      } catch { return {}; }
    })(),
    finalAssets: (() => {
      try {
        return JSON.parse(p.finalAssets ?? "[]") as { slideNum: number; url: string }[];
      } catch { return []; }
    })(),
  }));

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0f" }}>
      <Sidebar />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        <TikTokValidator initialPosts={initialPosts} />
      </main>
    </div>
  );
}
