"use client";

import { useState } from "react";

interface Slide {
  titre: string;
  phrase: string;
  photoId?: string;   // legacy Unsplash format
  photoRef?: string;  // Google Maps photo_reference
}

const GRADIENTS = [
  "linear-gradient(135deg, #7c3aed, #db2777)",
  "linear-gradient(135deg, #db2777, #f59e0b)",
  "linear-gradient(135deg, #7c3aed, #06b6d4)",
  "linear-gradient(135deg, #10b981, #7c3aed)",
  "linear-gradient(135deg, #f59e0b, #ef4444)",
  "linear-gradient(135deg, #06b6d4, #10b981)",
];

function slidePhotoUrl(slide: Slide): string | null {
  if (slide.photoRef) return `/api/places/photo?ref=${encodeURIComponent(slide.photoRef)}&maxw=640`;
  if (slide.photoId) return `https://images.unsplash.com/photo-${slide.photoId}?fit=crop&w=640&h=640&q=80`;
  return null;
}

function thumbPhotoUrl(slide: Slide): string | null {
  if (slide.photoRef) return `/api/places/photo?ref=${encodeURIComponent(slide.photoRef)}&maxw=120`;
  if (slide.photoId) return `https://images.unsplash.com/photo-${slide.photoId}?fit=crop&w=120&h=120&q=70`;
  return null;
}

export function CarouselViewer({
  slides,
  restaurant,
  caption,
  hashtags,
}: {
  slides: Slide[];
  restaurant: string;
  caption?: string | null;
  hashtags?: string | null;
}) {
  const [current, setCurrent] = useState(0);
  const [showCaption, setShowCaption] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  if (slides.length === 0) return null;

  const prev = () => { setCurrent(i => (i - 1 + slides.length) % slides.length); };
  const next = () => { setCurrent(i => (i + 1) % slides.length); };
  const slide = slides[current];

  const rawUrl = imgErrors[current] ? null : slidePhotoUrl(slide);
  const gradient = GRADIENTS[current % GRADIENTS.length];

  return (
    <div>
      <div style={{ color: "#52525b", fontSize: 11, marginBottom: 10, letterSpacing: "0.08em" }}>
        APERÇU CARROUSEL
      </div>

      {/* Instagram frame */}
      <div style={{
        background: "#09090b", borderRadius: 14,
        border: "1px solid #27272a", overflow: "hidden",
      }}>
        {/* Fake IG header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderBottom: "1px solid #1f1f23",
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "linear-gradient(135deg, #7c3aed, #db2777)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0,
          }}>N</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "white", fontSize: 12, fontWeight: 600 }}>nightlife.paris</div>
            <div style={{ color: "#71717a", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{restaurant}</div>
          </div>
          <div style={{ color: "#52525b", fontSize: 18, flexShrink: 0 }}>···</div>
        </div>

        {/* Slide area — paddingBottom trick for reliable square */}
        <div style={{ position: "relative", width: "100%", paddingBottom: "100%", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0 }}>

            {/* Background */}
            {rawUrl ? (
              <img
                key={`${current}-${rawUrl}`}
                src={rawUrl}
                alt=""
                onError={() => setImgErrors(prev => ({ ...prev, [current]: true }))}
                style={{
                  position: "absolute", inset: 0, width: "100%", height: "100%",
                  objectFit: "cover", display: "block",
                }}
              />
            ) : (
              <div style={{
                position: "absolute", inset: 0,
                background: gradient,
                transition: "background 0.4s ease",
              }} />
            )}

            {/* Overlay */}
            <div style={{
              position: "absolute", inset: 0,
              background: rawUrl
                ? "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.04) 70%, rgba(0,0,0,0) 100%)"
                : "linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 60%)",
            }} />

            {/* Decorative circles (gradient only) */}
            {!rawUrl && (
              <>
                <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.06)", top: -40, right: -40 }} />
                <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.04)", bottom: -20, left: -20 }} />
              </>
            )}

            {/* Slide counter */}
            <div style={{
              position: "absolute", top: 14, left: 14, zIndex: 3,
              background: "rgba(0,0,0,0.45)", borderRadius: 20,
              padding: "3px 10px", fontSize: 11, color: "rgba(255,255,255,0.85)",
              fontWeight: 600, backdropFilter: "blur(4px)",
            }}>
              {current + 1} / {slides.length}
            </div>

            {/* Brand badge */}
            <div style={{
              position: "absolute", top: 14, right: 14, zIndex: 3,
              background: "rgba(0,0,0,0.45)", borderRadius: 20,
              padding: "3px 10px", fontSize: 10, color: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(4px)",
            }}>
              🌙 Nightlife Paris
            </div>

            {/* Text */}
            <div style={{ position: "absolute", bottom: 48, left: 18, right: 18, zIndex: 3 }}>
              <div style={{
                color: "white", fontWeight: 800, fontSize: 18,
                lineHeight: 1.25, marginBottom: 10,
                textShadow: "0 2px 12px rgba(0,0,0,0.8)",
              }}>
                {slide.titre}
              </div>
              <div style={{
                color: "rgba(255,255,255,0.88)", fontSize: 13,
                lineHeight: 1.5, fontStyle: "italic",
                textShadow: "0 1px 8px rgba(0,0,0,0.7)",
              }}>
                {slide.phrase}
              </div>
            </div>

            {/* Arrows */}
            {slides.length > 1 && (
              <>
                <button onClick={prev} style={{
                  position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                  width: 34, height: 34, borderRadius: "50%", border: "none",
                  background: "rgba(0,0,0,0.5)", color: "white", fontSize: 16,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(4px)", zIndex: 4,
                }}>‹</button>
                <button onClick={next} style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  width: 34, height: 34, borderRadius: "50%", border: "none",
                  background: "rgba(0,0,0,0.5)", color: "white", fontSize: 16,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(4px)", zIndex: 4,
                }}>›</button>
              </>
            )}

            {/* Dots */}
            {slides.length > 1 && (
              <div style={{
                position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
                display: "flex", gap: 6, zIndex: 4,
              }}>
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)} style={{
                    width: i === current ? 20 : 6, height: 6, borderRadius: 3, border: "none",
                    background: i === current ? "white" : "rgba(255,255,255,0.4)",
                    cursor: "pointer", padding: 0, transition: "all 0.25s ease",
                  }} />
                ))}
              </div>
            )}

          </div>
        </div>

        {/* IG action bar */}
        <div style={{ padding: "10px 14px" }}>
          <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
            <span style={{ color: "#a1a1aa", fontSize: 20, cursor: "pointer" }}>🤍</span>
            <span style={{ color: "#a1a1aa", fontSize: 20, cursor: "pointer" }}>💬</span>
            <span style={{ color: "#a1a1aa", fontSize: 20, cursor: "pointer" }}>📤</span>
            <span style={{ marginLeft: "auto", color: "#a1a1aa", fontSize: 20, cursor: "pointer" }}>🔖</span>
          </div>

          {caption && (
            <div>
              <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.5 }}>
                <span style={{ color: "white", fontWeight: 600 }}>nightlife.paris </span>
                {showCaption ? caption : caption.substring(0, 80) + (caption.length > 80 ? "…" : "")}
              </div>
              {caption.length > 80 && (
                <button onClick={() => setShowCaption(s => !s)} style={{
                  background: "none", border: "none", color: "#71717a",
                  fontSize: 12, cursor: "pointer", padding: 0, marginTop: 2,
                }}>
                  {showCaption ? "voir moins" : "voir plus"}
                </button>
              )}
              {hashtags && (
                <div style={{ color: "#7c3aed", fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>
                  {hashtags}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Thumbnails */}
      {slides.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", paddingBottom: 4 }}>
          {slides.map((s, i) => {
            const tUrl = imgErrors[i] ? null : thumbPhotoUrl(s);
            return (
              <button key={i} onClick={() => setCurrent(i)} style={{
                flexShrink: 0, width: 52, height: 52, borderRadius: 8,
                border: `2px solid ${i === current ? "white" : "transparent"}`,
                cursor: "pointer", padding: 0, overflow: "hidden",
                opacity: i === current ? 1 : 0.55, transition: "all 0.2s",
                position: "relative", background: GRADIENTS[i % GRADIENTS.length],
              }}>
                {tUrl && (
                  <img src={tUrl} alt="" style={{
                    width: "100%", height: "100%", objectFit: "cover", display: "block",
                  }} />
                )}
                <div style={{
                  position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
