import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import type { SlideData } from "../../../generate/route";

export const runtime = "nodejs";

const W = 1080;
const H = 1920;

function wrapText(text: string) {
  return text.split("\\n").join("\n");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; num: string } }
) {
  const { id, num } = params;
  const slideNum = parseInt(num, 10);

  const post = await prisma.carouselPost.findUnique({
    where: { id },
    include: { restaurant: true },
  });

  if (!post) {
    return new Response("Post introuvable", { status: 404 });
  }

  const slides: SlideData[] = (() => {
    try { return JSON.parse(post.slides); } catch { return []; }
  })();

  const slide = slides.find(s => s.number === slideNum);
  if (!slide) {
    return new Response("Slide introuvable", { status: 404 });
  }

  const imageUrl = slide.selectedImageUrl;
  const text = wrapText(slide.text);
  const isCTA = slideNum === 4 || text.includes("@guest_for_dinner");

  // Fetch background image as buffer for embedding
  let imgData: string | null = null;
  if (imageUrl) {
    try {
      const proxy = imageUrl.startsWith("/api/")
        ? `http://localhost:${process.env.PORT ?? 3000}${imageUrl}`
        : imageUrl;
      const res = await fetch(proxy, { cache: "no-store" });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const ct = res.headers.get("content-type") ?? "image/jpeg";
        imgData = `data:${ct};base64,${buf.toString("base64")}`;
      }
    } catch {
      imgData = null;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: W, height: H,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: isCTA ? "flex-end" : "flex-start",
          fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
          background: "#1a1a2e",
        }}
      >
        {/* Background */}
        {imgData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgData}
            alt=""
            style={{
              position: "absolute", top: 0, left: 0,
              width: W, height: H,
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute", top: 0, left: 0, width: W, height: H,
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            }}
          />
        )}

        {/* Dark overlay gradient */}
        <div
          style={{
            position: "absolute", top: 0, left: 0, width: W, height: H,
            background: isCTA
              ? "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)"
              : "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0.75) 100%)",
          }}
        />

        {/* Slide number badge (top right) */}
        <div
          style={{
            position: "absolute", top: 60, right: 60,
            background: "rgba(255,255,255,0.9)",
            borderRadius: 50,
            padding: "14px 28px",
            fontSize: 36, fontWeight: 700, color: "#111",
          }}
        >
          {slideNum}
        </div>

        {/* Restaurant name badge (top left) — slides 1-3 */}
        {!isCTA && (
          <div
            style={{
              position: "absolute", top: 60, left: 60,
              background: "rgba(255,255,255,0.92)",
              borderRadius: 20,
              padding: "16px 36px",
              fontSize: 32, fontWeight: 800, color: "#111",
              maxWidth: 700,
            }}
          >
            {post.restaurant.name}
          </div>
        )}

        {/* Main text bubble */}
        <div
          style={{
            position: "absolute",
            bottom: isCTA ? 80 : 100,
            left: 60, right: 60,
            background: "rgba(255,255,255,0.94)",
            borderRadius: 32,
            padding: isCTA ? "56px 60px" : "44px 52px",
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {text.split("\n").map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: isCTA ? (line.includes("@") ? 42 : 46) : 52,
                fontWeight: isCTA ? (line.includes("@") ? 700 : 600) : (i === 0 ? 800 : 500),
                color: line.includes("@") ? "#7c3aed" : "#111",
                lineHeight: 1.35,
                marginBottom: line === "" ? 16 : 0,
              }}
            >
              {line || " "}
            </div>
          ))}
        </div>

        {/* Brand watermark */}
        <div
          style={{
            position: "absolute", bottom: 36, left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.55)",
            borderRadius: 40,
            padding: "10px 28px",
            fontSize: 28, color: "rgba(255,255,255,0.8)",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          🌙 nightlife.paris
        </div>
      </div>
    ),
    { width: W, height: H }
  );
}
