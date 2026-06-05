"use client";

import type { CSSProperties } from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { RESTAURANTS_PARIS, type ParisRestaurant } from "@/lib/restaurants-paris";
import GooglePlacesPicker, { type PickedPhoto } from "@/components/GooglePlacesPicker";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Slide { titre: string; phrase: string; photoId?: string; }
type ThemeKey = "violet_nuit" | "luxe_noir" | "rose_parisien" | "or_champagne";

interface Config {
  restaurantId: string;
  restaurant: string;
  photoId: string;
  theme: ThemeKey;
  gradientStart: number;
  gradientIntensity: number;
  titleFontSize: number;
  textFontSize: number;
  showBranding: boolean;
  brandingText: string;
  ctaText: string;
  showCounter: boolean;
  slides: Slide[];
  caption: string;
  hashtags: string;
}

interface AutoConfig {
  enabled: boolean;
  intervalDays: number;
  lastRun: string | null;
  nextRun: string | null;
  restaurantMode: "fixed" | "random";
  fixedRestaurantId: string;
}

// ─── Themes ───────────────────────────────────────────────────────────────────

const THEMES: Record<ThemeKey, { name: string; accent: string; title: string; text: string }> = {
  violet_nuit:   { name: "Violet Nuit",   accent: "#a78bfa", title: "#ffffff", text: "#c4b5fd" },
  luxe_noir:     { name: "Luxe Noir",     accent: "#f59e0b", title: "#ffffff", text: "#d4d4d4" },
  rose_parisien: { name: "Rosé Parisien", accent: "#f472b6", title: "#ffffff", text: "#fbcfe8" },
  or_champagne:  { name: "Or Champagne",  accent: "#fcd34d", title: "#fef3c7", text: "#fde68a" },
};

function makeConfig(r: ParisRestaurant): Config {
  return {
    restaurantId: r.id,
    restaurant: r.nom,
    photoId: r.photoId,
    theme: "violet_nuit",
    gradientStart: 20,
    gradientIntensity: 70,
    titleFontSize: 68,
    textFontSize: 40,
    showBranding: true,
    brandingText: "nightlife.paris",
    ctaText: "DM pour participer",
    showCounter: true,
    slides: r.slides.map(s => ({ ...s, photoId: r.photoId })),
    caption: r.caption,
    hashtags: r.hashtags,
  };
}

const DEFAULT_CONFIG: Config = makeConfig(RESTAURANTS_PARIS[0]);
const DEFAULT_AUTO: AutoConfig = {
  enabled: false, intervalDays: 7, lastRun: null, nextRun: null,
  restaurantMode: "random", fixedRestaurantId: RESTAURANTS_PARIS[0].id,
};

// ─── Photo helpers ─────────────────────────────────────────────────────────────

function thumbUrl(id: string) {
  if (id.startsWith("google:")) {
    const ref = id.slice(7);
    return `/api/places/photo?ref=${encodeURIComponent(ref)}&maxw=300`;
  }
  return `https://images.unsplash.com/photo-${id}?fit=crop&w=300&h=300&q=70`;
}
function canvasUrl(id: string) {
  if (id.startsWith("google:")) {
    const ref = id.slice(7);
    return `/api/places/photo?ref=${encodeURIComponent(ref)}&maxw=1080`;
  }
  // Direct URL — no crossOrigin needed since we never call toDataURL()
  return `https://images.unsplash.com/photo-${id}?fit=crop&w=1080&h=1080&q=85`;
}

// ─── Canvas helpers ────────────────────────────────────────────────────────────

function loadImg(src: string, timeoutMs = 8000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error("load error")); };
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, curY);
      line = word + " ";
      curY += lh;
    } else { line = test; }
  }
  if (line.trim()) { ctx.fillText(line.trim(), x, curY); curY += lh; }
  return curY;
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function renderSlide(canvas: HTMLCanvasElement, cfg: Config, slide: Slide, idx: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const theme = THEMES[cfg.theme];
  const pad = 64;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, W, H);

  try {
    const img = await loadImg(canvasUrl(cfg.photoId));
    const sc = Math.max(W / img.width, H / img.height);
    const sw = img.width * sc, sh = img.height * sc;
    ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
  } catch {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#1a0533"); bg.addColorStop(1, "#09090b");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  }

  const gY = H * (cfg.gradientStart / 100);
  const grad = ctx.createLinearGradient(0, gY, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${cfg.gradientIntensity / 100})`);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  if (cfg.showBranding) {
    const tg = ctx.createLinearGradient(0, 0, 0, 110);
    tg.addColorStop(0, "rgba(0,0,0,0.65)"); tg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 110);
    ctx.beginPath(); ctx.arc(pad + 18, 58, 18, 0, Math.PI * 2);
    ctx.fillStyle = theme.accent; ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px system-ui,-apple-system,sans-serif";
    ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 8;
    ctx.fillText(cfg.brandingText, pad + 46, 68);
    ctx.shadowBlur = 0;
  }

  if (cfg.showCounter) {
    const cTxt = `${idx + 1} / ${cfg.slides.length}`;
    ctx.font = "bold 28px system-ui,sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(cTxt, W - ctx.measureText(cTxt).width - pad, 66);
  }

  ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 24;
  ctx.fillStyle = theme.title;
  ctx.font = `bold ${cfg.titleFontSize}px system-ui,-apple-system,sans-serif`;
  const afterTitle = wrapText(ctx, slide.titre, pad, H * 0.56, W - pad * 2, cfg.titleFontSize * 1.25);

  ctx.fillStyle = theme.text;
  ctx.font = `${cfg.textFontSize}px system-ui,-apple-system,sans-serif`;
  ctx.shadowBlur = 16;
  wrapText(ctx, slide.phrase, pad, afterTitle + 18, W - pad * 2, cfg.textFontSize * 1.55);
  ctx.shadowBlur = 0;

  const isLast = idx === cfg.slides.length - 1;
  if (isLast && cfg.ctaText) {
    ctx.font = "bold 38px system-ui,sans-serif";
    const bW = ctx.measureText(cfg.ctaText).width + 80, bH = 78, bX = pad, bY = H - 150;
    rrect(ctx, bX, bY, bW, bH, 39); ctx.fillStyle = theme.accent; ctx.fill();
    ctx.fillStyle = "#000000"; ctx.fillText(cfg.ctaText, bX + 40, bY + 50);
  }
  if (!isLast) {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "28px system-ui,sans-serif";
    ctx.fillText("→ suite", W - 170, H - 64);
  }
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "24px system-ui,sans-serif";
  ctx.fillText(`@${cfg.brandingText}`, pad, H - 64);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function RangeSlider({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ color: "#71717a", fontSize: 11 }}>{label}</span>
        <span style={{ color: "#e4e4e7", fontSize: 11, fontWeight: 600 }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#7c3aed", cursor: "pointer" }} />
    </div>
  );
}

const lbl: CSSProperties = {
  color: "#a1a1aa", fontSize: 11, fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.06em",
};
const inp: CSSProperties = {
  display: "block", width: "100%", padding: "8px 10px",
  background: "#09090b", border: "1px solid #3f3f46", borderRadius: 8,
  color: "white", fontSize: 13, boxSizing: "border-box", outline: "none",
};

// ─── TYPE BADGE COLORS ─────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  "Rooftop Bar": "#a78bfa",
  "Gastronomique": "#f59e0b",
  "Club Membres": "#ef4444",
  "Club Légendaire": "#ef4444",
  "Club / Restaurant": "#f472b6",
  "Restaurant Historique": "#fcd34d",
  "Hôtel / Bar": "#06b6d4",
  "Hôtel / Café": "#06b6d4",
  "Terrasse / Jardin": "#10b981",
  "Brasserie Luxe": "#f59e0b",
  "Brasserie Palace": "#f59e0b",
  "Bar / Restaurant Design": "#a78bfa",
  "Bistronomie": "#10b981",
  "Restaurant Italien": "#f472b6",
};

// ─── Main component ────────────────────────────────────────────────────────────

interface SearchPhoto {
  id: string;
  thumb: string;
  regular: string;
  alt: string;
  author: string;
}

export default function CarouselGeneratorInline() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  const [auto, setAuto] = useState<AutoConfig>(DEFAULT_AUTO);
  const [activeSlide, setActiveSlide] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAllRestaurants, setShowAllRestaurants] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Photo search
  const [photoTab, setPhotoTab] = useState<"curated" | "search" | "google">("google");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchPhoto[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchDone, setSearchDone] = useState(false);
  const [googlePhotoUrl, setGooglePhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem("cg_config_v3");
      if (s) setCfg(c => ({ ...c, ...JSON.parse(s) }));
      const a = localStorage.getItem("cg_auto_v3");
      if (a) setAuto(x => ({ ...x, ...JSON.parse(a) }));
    } catch {}
  }, []);

  // Auto-gen check on mount
  useEffect(() => {
    if (!auto.enabled || !auto.nextRun) return;
    if (new Date() >= new Date(auto.nextRun)) {
      submitCarousel(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doRender = useCallback(async () => {
    if (!canvasRef.current || !open) return;
    setRendering(true);
    await renderSlide(canvasRef.current, cfg, cfg.slides[activeSlide] ?? cfg.slides[0], activeSlide);
    setRendering(false);
  }, [cfg, activeSlide, open]);

  useEffect(() => { doRender(); }, [doRender]);

  function set<K extends keyof Config>(k: K, v: Config[K]) { setCfg(c => ({ ...c, [k]: v })); }

  function selectRestaurant(r: ParisRestaurant) {
    setCfg(c => ({
      ...c,
      restaurantId: r.id,
      restaurant: r.nom,
      photoId: r.photoId,
      slides: r.slides.map(s => ({ ...s, photoId: r.photoId })),
      caption: r.caption,
      hashtags: r.hashtags,
    }));
    setActiveSlide(0);
  }

  function pickRandom() {
    const r = RESTAURANTS_PARIS[Math.floor(Math.random() * RESTAURANTS_PARIS.length)];
    selectRestaurant(r);
  }

  async function searchPhotos(q: string) {
    if (!q.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchDone(false);
    try {
      const res = await fetch(`/api/search-photos?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.error === "no_key") {
        setSearchError("Clé API Unsplash manquante. Ajoute UNSPLASH_ACCESS_KEY dans les variables Railway.");
      } else if (data.error) {
        setSearchError("Erreur de recherche. Réessaie.");
      } else {
        setSearchResults(data.photos ?? []);
        setSearchDone(true);
        if ((data.photos ?? []).length === 0) setSearchError("Aucune photo trouvée. Essaie d'autres mots-clés.");
      }
    } catch {
      setSearchError("Erreur réseau.");
    }
    setSearchLoading(false);
  }

  function pickSearchPhoto(photo: SearchPhoto) {
    const photoId = photo.id;
    setCfg(c => ({
      ...c,
      photoId,
      slides: c.slides.map(s => ({ ...s, photoId })),
    }));
  }

  function handleGooglePhotoPick(picked: PickedPhoto) {
    // Store the proxy URL as the photoId sentinel (prefixed with "google:")
    // canvasUrl() will detect this and use the URL directly
    const sentinel = `google:${picked.ref}`;
    setGooglePhotoUrl(picked.url);
    setCfg(c => ({
      ...c,
      photoId: sentinel,
      restaurant: picked.placeName || c.restaurant,
      slides: c.slides.map(s => ({ ...s, photoId: sentinel })),
    }));
  }

  function setSlide(i: number, k: keyof Slide, v: string) {
    setCfg(c => { const slides = [...c.slides]; slides[i] = { ...slides[i], [k]: v }; return { ...c, slides }; });
  }

  function saveConfig() {
    localStorage.setItem("cg_config_v3", JSON.stringify(cfg));
    localStorage.setItem("cg_auto_v3", JSON.stringify(auto));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  async function submitCarousel(isAuto = false) {
    if (submitting) return;
    let submitCfg = cfg;

    if (isAuto && auto.restaurantMode === "random") {
      const r = RESTAURANTS_PARIS[Math.floor(Math.random() * RESTAURANTS_PARIS.length)];
      submitCfg = { ...makeConfig(r), theme: cfg.theme, brandingText: cfg.brandingText, ctaText: cfg.ctaText };
    } else if (isAuto && auto.restaurantMode === "fixed") {
      const r = RESTAURANTS_PARIS.find(x => x.id === auto.fixedRestaurantId) ?? RESTAURANTS_PARIS[0];
      submitCfg = { ...makeConfig(r), theme: cfg.theme, brandingText: cfg.brandingText, ctaText: cfg.ctaText };
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contenu/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant: submitCfg.restaurant,
          slides: submitCfg.slides,
          caption: submitCfg.caption,
          hashtags: submitCfg.hashtags,
          scoreGlobal: (submitCfg.restaurant === cfg.restaurant
            ? RESTAURANTS_PARIS.find(r => r.id === cfg.restaurantId)
            : RESTAURANTS_PARIS.find(r => r.id === submitCfg.restaurantId))?.scoreViral ?? 8.5,
          scoreViral: RESTAURANTS_PARIS.find(r => r.id === submitCfg.restaurantId)?.scoreViral ?? 8.0,
          scoreLuxe: RESTAURANTS_PARIS.find(r => r.id === submitCfg.restaurantId)?.scoreLuxe ?? 8.0,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
        if (isAuto || auto.enabled) {
          const now = new Date();
          const next = new Date(now.getTime() + auto.intervalDays * 86400000);
          const newAuto = { ...auto, lastRun: now.toISOString(), nextRun: next.toISOString() };
          setAuto(newAuto);
          localStorage.setItem("cg_auto_v3", JSON.stringify(newAuto));
        }
      }
    } catch {}
    setSubmitting(false);
  }

  function toggleAuto(enabled: boolean) {
    const next = new Date(Date.now() + auto.intervalDays * 86400000);
    setAuto(a => ({ ...a, enabled, nextRun: enabled ? next.toISOString() : null }));
  }

  function setAutoInterval(days: number) {
    setAuto(a => {
      const base = a.lastRun ? new Date(a.lastRun) : new Date();
      return { ...a, intervalDays: days, nextRun: new Date(base.getTime() + days * 86400000).toISOString() };
    });
  }

  const theme = THEMES[cfg.theme];
  const visibleRestaurants = showAllRestaurants ? RESTAURANTS_PARIS : RESTAURANTS_PARIS.slice(0, 6);

  return (
    <div style={{ marginTop: 48 }}>

      {/* Toggle header */}
      <button onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%",
        background: "#18181b", border: "1px solid #27272a",
        borderRadius: open ? "14px 14px 0 0" : 14,
        padding: "16px 20px", cursor: "pointer", textAlign: "left",
      }}>
        <span style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: "linear-gradient(135deg,#7c3aed,#db2777)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>🎨</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: "white", fontWeight: 700, fontSize: 15 }}>Générateur de carrousels</div>
          <div style={{ color: "#71717a", fontSize: 12, marginTop: 1 }}>
            {cfg.restaurant
              ? `Restaurant sélectionné : ${cfg.restaurant} · Soumet directement dans la file`
              : "Choisis un vrai restaurant parisien → génère les slides → soumet dans la file"}
          </div>
        </div>
        <span style={{
          color: "#71717a", fontSize: 18, lineHeight: 1, display: "inline-block",
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s",
        }}>▾</span>
      </button>

      {open && (
        <div style={{
          background: "#18181b", border: "1px solid #27272a", borderTop: "none",
          borderRadius: "0 0 14px 14px", padding: 20,
        }}>

          {/* ─── Photo Source Tabs ─── */}
          <div style={{ marginBottom: 20 }}>
            {/* Tab bar */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {([
                { key: "google",  label: "🗺️ Google Maps" },
                { key: "curated", label: "🏛️ Liste curatée" },
                { key: "search",  label: "🔍 Unsplash" },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setPhotoTab(t.key)} style={{
                  flex: 1, padding: "9px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: photoTab === t.key ? "rgba(124,58,237,0.18)" : "#09090b",
                  color: photoTab === t.key ? "#a78bfa" : "#52525b",
                  border: `1px solid ${photoTab === t.key ? "rgba(124,58,237,0.5)" : "#27272a"}`,
                  cursor: "pointer", transition: "all 0.15s",
                }}>{t.label}</button>
              ))}
            </div>

            {/* ── Tab: Google Maps ── */}
            {photoTab === "google" && (
              <GooglePlacesPicker onPick={handleGooglePhotoPick} />
            )}

            {/* ── Tab: Curated restaurants ── */}
            {photoTab === "curated" && (
              <>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                  <button onClick={pickRandom} style={{
                    padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: "rgba(124,58,237,0.15)", color: "#a78bfa",
                    border: "1px solid rgba(124,58,237,0.3)", cursor: "pointer",
                  }}>🎲 Au hasard</button>
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: 10,
                }}>
                  {visibleRestaurants.map(r => {
                    const selected = cfg.restaurantId === r.id;
                    const typeColor = TYPE_COLOR[r.type] ?? "#71717a";
                    return (
                      <button key={r.id} onClick={() => selectRestaurant(r)} style={{
                        background: selected ? "rgba(124,58,237,0.1)" : "#09090b",
                        border: `2px solid ${selected ? "#a78bfa" : "#27272a"}`,
                        borderRadius: 12, overflow: "hidden", cursor: "pointer", padding: 0,
                        textAlign: "left", transition: "border-color 0.15s",
                      }}>
                        <div style={{ position: "relative", paddingBottom: "56.25%", overflow: "hidden" }}>
                          <div style={{ position: "absolute", inset: 0 }}>
                            <img src={thumbUrl(r.photoId)} alt={r.nom} loading="lazy"
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            {selected && (
                              <div style={{
                                position: "absolute", inset: 0, background: "rgba(124,58,237,0.35)",
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                              }}>✓</div>
                            )}
                            <div style={{
                              position: "absolute", top: 6, left: 6,
                              background: `${typeColor}22`, color: typeColor,
                              border: `1px solid ${typeColor}55`,
                              padding: "1px 7px", borderRadius: 20, fontSize: 9, fontWeight: 600,
                              backdropFilter: "blur(4px)",
                            }}>{r.type}</div>
                          </div>
                        </div>
                        <div style={{ padding: "8px 10px" }}>
                          <div style={{ color: "white", fontWeight: 700, fontSize: 12, lineHeight: 1.2, marginBottom: 2 }}>{r.nom}</div>
                          <div style={{ color: "#52525b", fontSize: 10 }}>{r.quartier} · {r.arrondissement}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {RESTAURANTS_PARIS.length > 6 && (
                  <button onClick={() => setShowAllRestaurants(v => !v)} style={{
                    marginTop: 10, width: "100%", padding: "8px", borderRadius: 8, fontSize: 12,
                    background: "#09090b", border: "1px solid #27272a", color: "#71717a", cursor: "pointer",
                  }}>
                    {showAllRestaurants ? "▲ Voir moins" : `▼ Voir tous les ${RESTAURANTS_PARIS.length} restaurants`}
                  </button>
                )}
              </>
            )}

            {/* ── Tab: Photo search ── */}
            {photoTab === "search" && (
              <div>
                {/* Search bar */}
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && searchPhotos(searchQuery)}
                    placeholder="Ex : rooftop paris, restaurant luxe, nightclub…"
                    style={{
                      flex: 1, padding: "10px 14px",
                      background: "#09090b", border: "1px solid #3f3f46",
                      borderRadius: 8, color: "white", fontSize: 13, outline: "none",
                    }}
                  />
                  <button
                    onClick={() => searchPhotos(searchQuery)}
                    disabled={searchLoading || !searchQuery.trim()}
                    style={{
                      padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                      background: searchLoading || !searchQuery.trim()
                        ? "#27272a"
                        : "linear-gradient(135deg,#7c3aed,#db2777)",
                      color: searchLoading || !searchQuery.trim() ? "#52525b" : "white",
                      border: "none", cursor: searchLoading || !searchQuery.trim() ? "default" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {searchLoading ? "⏳" : "Rechercher"}
                  </button>
                </div>

                {/* Suggestion chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {["rooftop paris", "restaurant luxe paris", "bar nightclub", "champagne soirée", "terrasse paris", "restaurant étoilé"].map(q => (
                    <button key={q} onClick={() => { setSearchQuery(q); searchPhotos(q); }} style={{
                      padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                      background: "#09090b", border: "1px solid #27272a", color: "#71717a",
                      cursor: "pointer",
                    }}>{q}</button>
                  ))}
                </div>

                {/* Error */}
                {searchError && (
                  <div style={{
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 12, marginBottom: 10,
                  }}>{searchError}</div>
                )}

                {/* Results grid */}
                {searchResults.length > 0 && (
                  <>
                    <div style={{ color: "#52525b", fontSize: 11, marginBottom: 8 }}>
                      {searchResults.length} photos trouvées — clique pour utiliser
                    </div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                      gap: 8,
                    }}>
                      {searchResults.map(photo => {
                        const isSelected = cfg.photoId === photo.id;
                        return (
                          <button key={photo.id} onClick={() => pickSearchPhoto(photo)} style={{
                            padding: 0, border: `2px solid ${isSelected ? "#a78bfa" : "transparent"}`,
                            borderRadius: 10, overflow: "hidden", cursor: "pointer",
                            position: "relative", background: "#09090b",
                            transition: "border-color 0.15s",
                          }}>
                            <div style={{ position: "relative", paddingBottom: "100%", overflow: "hidden" }}>
                              <div style={{ position: "absolute", inset: 0 }}>
                                <img src={photo.thumb} alt={photo.alt} loading="lazy"
                                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                {isSelected && (
                                  <div style={{
                                    position: "absolute", inset: 0, background: "rgba(124,58,237,0.4)",
                                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                                  }}>✓</div>
                                )}
                              </div>
                            </div>
                            <div style={{ padding: "4px 6px", textAlign: "left" }}>
                              <div style={{ color: "#52525b", fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                📷 {photo.author}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {!searchDone && !searchLoading && searchResults.length === 0 && (
                  <div style={{
                    textAlign: "center", padding: "30px 20px",
                    background: "#09090b", borderRadius: 10, border: "1px solid #27272a",
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                    <div style={{ color: "#52525b", fontSize: 13 }}>
                      Recherche une photo par mot-clé
                    </div>
                    <div style={{ color: "#3f3f46", fontSize: 11, marginTop: 4 }}>
                      Propulsé par Unsplash · nécessite UNSPLASH_ACCESS_KEY
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Main layout: config + preview ─── */}
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

            {/* ─── Config panel ─── */}
            <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Selected restaurant info */}
              {cfg.photoId && (
                <div style={{
                  background: "#09090b", borderRadius: 10, padding: "10px 12px",
                  display: "flex", gap: 10, alignItems: "center",
                  border: "1px solid #27272a",
                }}>
                  <img src={thumbUrl(cfg.photoId)} alt="" loading="lazy" style={{
                    width: 52, height: 52, borderRadius: 8, objectFit: "cover", flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ color: "white", fontWeight: 700, fontSize: 13 }}>{cfg.restaurant}</div>
                    <div style={{ color: "#52525b", fontSize: 11, marginTop: 2 }}>
                      {RESTAURANTS_PARIS.find(r => r.id === cfg.restaurantId)?.quartier ?? ""} · {" "}
                      {RESTAURANTS_PARIS.find(r => r.id === cfg.restaurantId)?.type ?? ""}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div style={lbl}>Thème</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginTop: 6 }}>
                  {(Object.keys(THEMES) as ThemeKey[]).map(k => (
                    <button key={k} onClick={() => set("theme", k)} style={{
                      padding: "7px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: cfg.theme === k ? `${THEMES[k].accent}22` : "#09090b",
                      color: cfg.theme === k ? THEMES[k].accent : "#71717a",
                      border: `1px solid ${cfg.theme === k ? THEMES[k].accent + "44" : "#3f3f46"}`,
                      cursor: "pointer",
                    }}>{THEMES[k].name}</button>
                  ))}
                </div>
              </div>

              <div style={{ background: "#09090b", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ ...lbl, marginBottom: 10 }}>Dégradé</div>
                <RangeSlider label="Début (%)" value={cfg.gradientStart} min={0} max={80}
                  onChange={v => set("gradientStart", v)} />
                <RangeSlider label="Intensité (%)" value={cfg.gradientIntensity} min={40} max={100}
                  onChange={v => set("gradientIntensity", v)} />
              </div>

              <div style={{ background: "#09090b", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ ...lbl, marginBottom: 10 }}>Typographie</div>
                <RangeSlider label="Titre (px)" value={cfg.titleFontSize} min={40} max={110}
                  onChange={v => set("titleFontSize", v)} />
                <RangeSlider label="Texte (px)" value={cfg.textFontSize} min={24} max={72}
                  onChange={v => set("textFontSize", v)} />
              </div>

              <div style={{ background: "#09090b", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ ...lbl, marginBottom: 8 }}>Branding</div>
                {[
                  { label: "Afficher logo", key: "showBranding" as const },
                  { label: "Compteur slides", key: "showCounter" as const },
                ].map(({ label, key }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, cursor: "pointer" }}>
                    <input type="checkbox" checked={cfg[key] as boolean}
                      onChange={e => set(key, e.target.checked)}
                      style={{ accentColor: "#7c3aed" }} />
                    <span style={{ color: "#d4d4d8", fontSize: 13 }}>{label}</span>
                  </label>
                ))}
                <input value={cfg.brandingText} onChange={e => set("brandingText", e.target.value)}
                  placeholder="nightlife.paris" style={inp} />
              </div>

              <div>
                <div style={lbl}>CTA (dernier slide)</div>
                <input value={cfg.ctaText} onChange={e => set("ctaText", e.target.value)}
                  placeholder="DM pour participer" style={{ ...inp, marginTop: 6 }} />
              </div>

              <div style={{ background: "#09090b", borderRadius: 10, padding: "12px 14px" }}>
                <div style={lbl}>Caption Instagram</div>
                <textarea value={cfg.caption} onChange={e => set("caption", e.target.value)}
                  rows={3} style={{
                    display: "block", width: "100%", marginTop: 6, padding: "8px 10px",
                    background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8,
                    color: "white", fontSize: 12, resize: "vertical", outline: "none",
                    fontFamily: "inherit", boxSizing: "border-box",
                  }} />
                <div style={{ ...lbl, marginTop: 10, marginBottom: 5 }}>Hashtags</div>
                <input value={cfg.hashtags} onChange={e => set("hashtags", e.target.value)} style={inp} />
              </div>

            </div>

            {/* ─── Preview + Slides ─── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>

              <div style={{ background: "#09090b", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 600 }}>
                    Slide {activeSlide + 1} / {cfg.slides.length}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { label: "← Préc", dis: activeSlide === 0, fn: () => setActiveSlide(s => Math.max(0, s - 1)) },
                      { label: "Suiv →", dis: activeSlide === cfg.slides.length - 1, fn: () => setActiveSlide(s => Math.min(cfg.slides.length - 1, s + 1)) },
                    ].map(b => (
                      <button key={b.label} onClick={b.fn} disabled={b.dis} style={{
                        padding: "5px 12px", borderRadius: 7, fontSize: 12,
                        cursor: b.dis ? "default" : "pointer",
                        background: "#18181b", border: "1px solid #27272a",
                        color: b.dis ? "#3f3f46" : "#a1a1aa",
                      }}>{b.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ position: "relative" }}>
                  <canvas ref={canvasRef} width={1080} height={1080}
                    style={{ width: "100%", borderRadius: 10, display: "block" }} />
                  {rendering && (
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center",
                      justifyContent: "center", background: "rgba(9,9,11,0.6)", borderRadius: 10,
                      color: "#a78bfa", fontSize: 13,
                    }}>⏳ Rendu en cours…</div>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 10 }}>
                  {cfg.slides.map((_, i) => (
                    <button key={i} onClick={() => setActiveSlide(i)} style={{
                      width: i === activeSlide ? 20 : 8, height: 8, borderRadius: 4,
                      background: i === activeSlide ? theme.accent : "#27272a",
                      border: "none", cursor: "pointer", padding: 0, transition: "width 0.2s",
                    }} />
                  ))}
                </div>
              </div>

              <div style={{ background: "#09090b", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={lbl}>Slides ({cfg.slides.length})</span>
                  <button onClick={() => {
                    if (cfg.slides.length >= 10) return;
                    setCfg(c => ({ ...c, slides: [...c.slides, { titre: "Nouveau slide", phrase: "Votre texte ici", photoId: c.photoId }] }));
                  }} style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: "rgba(124,58,237,0.2)", color: "#a78bfa",
                    border: "1px solid rgba(124,58,237,0.3)", cursor: "pointer",
                  }}>+ Ajouter</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {cfg.slides.map((s, i) => (
                    <div key={i} onClick={() => setActiveSlide(i)} style={{
                      background: activeSlide === i ? "rgba(124,58,237,0.1)" : "#18181b",
                      border: `1px solid ${activeSlide === i ? "#7c3aed55" : "#27272a"}`,
                      borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ color: activeSlide === i ? "#a78bfa" : "#52525b", fontSize: 11, fontWeight: 600 }}>
                          Slide {i + 1}
                        </span>
                        {cfg.slides.length > 1 && (
                          <button onClick={e => {
                            e.stopPropagation();
                            const slides = cfg.slides.filter((_, j) => j !== i);
                            setCfg(c => ({ ...c, slides }));
                            setActiveSlide(x => Math.min(x, slides.length - 1));
                          }} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                        )}
                      </div>
                      <input value={s.titre} onChange={e => setSlide(i, "titre", e.target.value)}
                        onClick={e => e.stopPropagation()} placeholder="Titre"
                        style={{ ...inp, marginBottom: 5, fontSize: 12 }} />
                      <input value={s.phrase} onChange={e => setSlide(i, "phrase", e.target.value)}
                        onClick={e => e.stopPropagation()} placeholder="Phrase d'accroche"
                        style={{ ...inp, fontSize: 12, color: "#a1a1aa" }} />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* ─── Actions ─── */}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={saveConfig} style={{
              padding: "11px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: saved ? "rgba(16,185,129,0.15)" : "#09090b",
              color: saved ? "#10b981" : "#71717a",
              border: `1px solid ${saved ? "rgba(16,185,129,0.3)" : "#27272a"}`,
              cursor: "pointer",
            }}>
              {saved ? "✓ Sauvegardé !" : "💾 Sauvegarder"}
            </button>
            <button onClick={() => submitCarousel(false)} disabled={submitting} style={{
              flex: 1, padding: "11px", borderRadius: 8, fontSize: 14, fontWeight: 700,
              background: submitted
                ? "rgba(16,185,129,0.15)"
                : submitting ? "#27272a"
                : "linear-gradient(135deg,#7c3aed,#db2777)",
              color: submitted ? "#10b981" : submitting ? "#71717a" : "white",
              border: submitted ? "1px solid rgba(16,185,129,0.3)" : "none",
              cursor: submitting ? "default" : "pointer",
            }}>
              {submitted ? "✅ Soumis dans la file !" : submitting ? "⏳ En cours…" : `🚀 Générer & Soumettre — ${cfg.restaurant}`}
            </button>
          </div>

          {/* ─── Automation ─── */}
          <div style={{
            marginTop: 14, background: "#09090b", borderRadius: 12,
            padding: "14px 16px", border: "1px solid #27272a",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "white", fontWeight: 600, fontSize: 14 }}>Auto-génération</div>
                <div style={{ color: "#52525b", fontSize: 12, marginTop: 1 }}>
                  Soumet automatiquement un nouveau carrousel à chaque ouverture de la page après l'intervalle
                </div>
              </div>
              <button onClick={() => toggleAuto(!auto.enabled)} style={{
                width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                background: auto.enabled ? "#7c3aed" : "#27272a",
                position: "relative", flexShrink: 0, marginLeft: 16, transition: "background 0.2s",
              }}>
                <span style={{
                  position: "absolute", top: 3, left: auto.enabled ? 23 : 3,
                  width: 18, height: 18, borderRadius: "50%", background: "white",
                  transition: "left 0.2s", display: "block",
                }} />
              </button>
            </div>

            {auto.enabled && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>

                {/* Restaurant mode */}
                <div>
                  <div style={{ ...lbl, marginBottom: 7 }}>Restaurant (auto)</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    {[
                      { v: "random" as const, label: "🎲 Aléatoire (tous les restaurants)" },
                      { v: "fixed" as const, label: "📌 Restaurant fixe" },
                    ].map(opt => (
                      <button key={opt.v} onClick={() => setAuto(a => ({ ...a, restaurantMode: opt.v }))} style={{
                        flex: 1, padding: "7px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                        background: auto.restaurantMode === opt.v ? "rgba(124,58,237,0.2)" : "#18181b",
                        color: auto.restaurantMode === opt.v ? "#a78bfa" : "#52525b",
                        border: `1px solid ${auto.restaurantMode === opt.v ? "#7c3aed44" : "#27272a"}`,
                        cursor: "pointer",
                      }}>{opt.label}</button>
                    ))}
                  </div>
                  {auto.restaurantMode === "fixed" && (
                    <select
                      value={auto.fixedRestaurantId}
                      onChange={e => setAuto(a => ({ ...a, fixedRestaurantId: e.target.value }))}
                      style={{
                        width: "100%", padding: "8px 10px",
                        background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8,
                        color: "white", fontSize: 13, outline: "none", cursor: "pointer",
                      }}
                    >
                      {RESTAURANTS_PARIS.map(r => (
                        <option key={r.id} value={r.id}>{r.nom} — {r.quartier}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Interval */}
                <div>
                  <div style={{ ...lbl, marginBottom: 7 }}>Intervalle</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[1, 3, 7, 30].map(d => (
                      <button key={d} onClick={() => setAutoInterval(d)} style={{
                        flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: auto.intervalDays === d ? "rgba(124,58,237,0.2)" : "#18181b",
                        color: auto.intervalDays === d ? "#a78bfa" : "#52525b",
                        border: `1px solid ${auto.intervalDays === d ? "#7c3aed44" : "#27272a"}`,
                        cursor: "pointer",
                      }}>
                        {d === 1 ? "1j" : d === 30 ? "1 mois" : `${d}j`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schedule status */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {auto.lastRun && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#52525b", fontSize: 12 }}>Dernier envoi</span>
                      <span style={{ color: "#a1a1aa", fontSize: 12 }}>
                        {new Date(auto.lastRun).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  {auto.nextRun && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#52525b", fontSize: 12 }}>Prochain envoi</span>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: new Date() >= new Date(auto.nextRun) ? "#f59e0b" : "#10b981",
                      }}>
                        {new Date() >= new Date(auto.nextRun)
                          ? "⏳ Dès la prochaine ouverture"
                          : new Date(auto.nextRun).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
