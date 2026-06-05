"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlideContent { titre: string; phrase: string; }

interface Config {
  restaurant: string;
  photoStyle: string;
  theme: ThemeKey;
  gradientStart: number;
  gradientIntensity: number;
  titleFontSize: number;
  textFontSize: number;
  showBranding: boolean;
  brandingText: string;
  ctaText: string;
  showCounter: boolean;
  photoSeed: number;
  slides: SlideContent[];
}

type ThemeKey = "violet_nuit" | "luxe_noir" | "rose_parisien" | "or_champagne";

// ─── Themes ───────────────────────────────────────────────────────────────────

const THEMES: Record<ThemeKey, { name: string; accent: string; title: string; text: string }> = {
  violet_nuit:   { name: "Violet Nuit",    accent: "#a78bfa", title: "#ffffff", text: "#c4b5fd" },
  luxe_noir:     { name: "Luxe Noir",      accent: "#f59e0b", title: "#ffffff", text: "#d4d4d4" },
  rose_parisien: { name: "Rosé Parisien",  accent: "#f472b6", title: "#ffffff", text: "#fbcfe8" },
  or_champagne:  { name: "Or Champagne",   accent: "#fcd34d", title: "#fef3c7", text: "#fde68a" },
};

const PHOTO_STYLES = [
  { key: "paris+restaurant+luxury", label: "Restaurant luxe" },
  { key: "paris+rooftop+night",     label: "Rooftop Paris" },
  { key: "cocktail+bar+neon",       label: "Bar cocktails" },
  { key: "paris+nightclub+vip",     label: "Club VIP" },
  { key: "gastronomie+paris",       label: "Gastronomie" },
  { key: "paris+terrace+summer",    label: "Terrasse" },
];

const DEFAULT_CONFIG: Config = {
  restaurant: "Le Perchoir Marais",
  photoStyle: "paris+restaurant+luxury",
  theme: "violet_nuit",
  gradientStart: 20,
  gradientIntensity: 90,
  titleFontSize: 68,
  textFontSize: 40,
  showBranding: true,
  brandingText: "nightlife.paris",
  ctaText: "DM pour participer",
  showCounter: true,
  photoSeed: 1,
  slides: [
    { titre: "Paris vue d'en haut",        phrase: "Là où chaque soirée devient un souvenir" },
    { titre: "Une sélection pointue",      phrase: "Profil Instagram requis · Gratuit · Exclusif" },
    { titre: "L'ambiance qui fait tout",   phrase: "Lumières tamisées, musique curatée, compagnie parfaite" },
    { titre: "Rejoins les prochains",      phrase: "Places limitées — envoie-nous un DM maintenant" },
  ],
};

// ─── Canvas helpers ────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): number {
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

async function renderSlide(
  canvas: HTMLCanvasElement,
  cfg: Config,
  slide: SlideContent,
  idx: number,
  photoUrl: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const theme = THEMES[cfg.theme];
  const pad = 64;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, W, H);

  // Background photo
  try {
    const img = await loadImage(photoUrl);
    const sc = Math.max(W / img.width, H / img.height);
    const sw = img.width * sc, sh = img.height * sc;
    ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
  } catch {
    // fallback gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#1a0533"); bg.addColorStop(1, "#09090b");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  }

  // Gradient overlay
  const gY = H * (cfg.gradientStart / 100);
  const grad = ctx.createLinearGradient(0, gY, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${cfg.gradientIntensity / 100})`);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  // Top scrim for branding
  if (cfg.showBranding) {
    const tg = ctx.createLinearGradient(0, 0, 0, 110);
    tg.addColorStop(0, "rgba(0,0,0,0.65)"); tg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 110);

    // Dot
    ctx.beginPath(); ctx.arc(pad + 18, 58, 18, 0, Math.PI * 2);
    ctx.fillStyle = theme.accent; ctx.fill();

    // Brand text
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 32px system-ui,-apple-system,sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 8;
    ctx.fillText(cfg.brandingText, pad + 46, 68);
    ctx.shadowBlur = 0;
  }

  // Counter top-right
  if (cfg.showCounter) {
    const cTxt = `${idx + 1} / ${cfg.slides.length}`;
    ctx.font = "bold 28px system-ui,sans-serif";
    const cW = ctx.measureText(cTxt).width;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(cTxt, W - cW - pad, 66);
  }

  // Title
  ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 24;
  ctx.fillStyle = theme.title;
  ctx.font = `bold ${cfg.titleFontSize}px system-ui,-apple-system,sans-serif`;
  const titleY = H * 0.56;
  const afterTitle = wrapText(ctx, slide.titre, pad, titleY, W - pad * 2, cfg.titleFontSize * 1.25);

  // Phrase
  ctx.fillStyle = theme.text;
  ctx.font = `${cfg.textFontSize}px system-ui,-apple-system,sans-serif`;
  ctx.shadowBlur = 16;
  wrapText(ctx, slide.phrase, pad, afterTitle + 18, W - pad * 2, cfg.textFontSize * 1.55);
  ctx.shadowBlur = 0;

  // CTA button (last slide)
  const isLast = idx === cfg.slides.length - 1;
  if (isLast && cfg.ctaText) {
    ctx.font = `bold 38px system-ui,sans-serif`;
    const bTxtW = ctx.measureText(cfg.ctaText).width;
    const bW = bTxtW + 80, bH = 78, bX = pad, bY = H - 150;
    rrect(ctx, bX, bY, bW, bH, 39); ctx.fillStyle = theme.accent; ctx.fill();
    ctx.fillStyle = "#000000"; ctx.fillText(cfg.ctaText, bX + 40, bY + 50);
  }

  // Swipe hint (not last)
  if (!isLast) {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `28px system-ui,sans-serif`;
    ctx.fillText("→ suite", W - 170, H - 64);
  }

  // Handle Instagram
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = `24px system-ui,sans-serif`;
  ctx.fillText(`@${cfg.brandingText.replace(/^[^ ]+ /, "")}`, pad, H - 64);
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function CarouselGenerator() {
  const [cfg, setCfg] = useState<Config>(() => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const s = localStorage.getItem("carousel_config");
      return s ? { ...DEFAULT_CONFIG, ...JSON.parse(s) } : DEFAULT_CONFIG;
    } catch { return DEFAULT_CONFIG; }
  });
  const [activeSlide, setActiveSlide] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [exportUrls, setExportUrls] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const photoUrl = `https://source.unsplash.com/1080x1080/?${encodeURIComponent(cfg.photoStyle)}&sig=${cfg.photoSeed + activeSlide}`;

  const doRender = useCallback(async () => {
    if (!canvasRef.current) return;
    setRendering(true);
    await renderSlide(canvasRef.current, cfg, cfg.slides[activeSlide], activeSlide, photoUrl);
    setRendering(false);
  }, [cfg, activeSlide, photoUrl]);

  useEffect(() => { doRender(); }, [doRender]);

  function set<K extends keyof Config>(k: K, v: Config[K]) {
    setCfg(c => ({ ...c, [k]: v }));
  }

  function setSlide(i: number, k: keyof SlideContent, v: string) {
    setCfg(c => {
      const slides = [...c.slides];
      slides[i] = { ...slides[i], [k]: v };
      return { ...c, slides };
    });
  }

  function addSlide() {
    if (cfg.slides.length >= 10) return;
    setCfg(c => ({ ...c, slides: [...c.slides, { titre: "Nouveau slide", phrase: "Votre texte ici" }] }));
  }

  function removeSlide(i: number) {
    if (cfg.slides.length <= 1) return;
    setCfg(c => {
      const slides = c.slides.filter((_, idx) => idx !== i);
      return { ...c, slides };
    });
    setActiveSlide(s => Math.min(s, cfg.slides.length - 2));
  }

  function saveConfig() {
    localStorage.setItem("carousel_config", JSON.stringify(cfg));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function exportAll() {
    setRendering(true);
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1080;
    const urls: string[] = [];
    for (let i = 0; i < cfg.slides.length; i++) {
      const pUrl = `https://source.unsplash.com/1080x1080/?${encodeURIComponent(cfg.photoStyle)}&sig=${cfg.photoSeed + i}`;
      await renderSlide(canvas, cfg, cfg.slides[i], i, pUrl);
      urls.push(canvas.toDataURL("image/jpeg", 0.92));
    }
    setExportUrls(urls);
    setRendering(false);
  }

  async function downloadSlide(url: string, i: number) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cfg.restaurant.replace(/\s+/g, "_")}_slide_${i + 1}.jpg`;
    a.click();
  }

  // Slider component
  function Slider({ label, value, min, max, step = 1, onChange }: {
    label: string; value: number; min: number; max: number; step?: number;
    onChange: (v: number) => void;
  }) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "#a1a1aa", fontSize: 12 }}>{label}</span>
          <span style={{ color: "#e4e4e7", fontSize: 12, fontWeight: 600 }}>{value}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#7c3aed", cursor: "pointer" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

      {/* ─── Config panel ─── */}
      <div style={{
        width: 340, flexShrink: 0,
        background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: 20,
        maxHeight: "calc(100vh - 120px)", overflowY: "auto",
      }}>

        {/* Restaurant + save */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: "#a1a1aa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Restaurant
          </label>
          <input value={cfg.restaurant} onChange={e => set("restaurant", e.target.value)}
            style={{
              display: "block", width: "100%", marginTop: 6, padding: "9px 12px",
              background: "#09090b", border: "1px solid #3f3f46", borderRadius: 8,
              color: "white", fontSize: 14, boxSizing: "border-box", outline: "none",
            }} />
        </div>

        {/* Thème */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "#a1a1aa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Thème</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {(Object.keys(THEMES) as ThemeKey[]).map(k => (
              <button key={k} onClick={() => set("theme", k)} style={{
                padding: "8px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: cfg.theme === k ? `${THEMES[k].accent}22` : "#09090b",
                color: cfg.theme === k ? THEMES[k].accent : "#71717a",
                border: `1px solid ${cfg.theme === k ? THEMES[k].accent + "55" : "#3f3f46"}`,
                cursor: "pointer",
              }}>{THEMES[k].name}</button>
            ))}
          </div>
        </div>

        {/* Style photo */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "#a1a1aa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Style de photo</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {PHOTO_STYLES.map(p => (
              <button key={p.key} onClick={() => set("photoStyle", p.key)} style={{
                padding: "7px 8px", borderRadius: 8, fontSize: 11, fontWeight: 500,
                background: cfg.photoStyle === p.key ? "rgba(124,58,237,0.2)" : "#09090b",
                color: cfg.photoStyle === p.key ? "#a78bfa" : "#71717a",
                border: `1px solid ${cfg.photoStyle === p.key ? "#7c3aed55" : "#3f3f46"}`,
                cursor: "pointer",
              }}>{p.label}</button>
            ))}
          </div>
          <button onClick={() => set("photoSeed", cfg.photoSeed + 10)} style={{
            marginTop: 8, width: "100%", padding: "7px", borderRadius: 8, fontSize: 12,
            background: "#09090b", border: "1px solid #3f3f46", color: "#71717a", cursor: "pointer",
          }}>🔄 Nouvelles photos</button>
        </div>

        {/* Gradient */}
        <div style={{ marginBottom: 16, background: "#09090b", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ color: "#a1a1aa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Dégradé</div>
          <Slider label="Début (%)" value={cfg.gradientStart} min={0} max={80} onChange={v => set("gradientStart", v)} />
          <Slider label="Intensité (%)" value={cfg.gradientIntensity} min={40} max={100} onChange={v => set("gradientIntensity", v)} />
        </div>

        {/* Typographie */}
        <div style={{ marginBottom: 16, background: "#09090b", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ color: "#a1a1aa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Typographie</div>
          <Slider label="Titre (px)" value={cfg.titleFontSize} min={40} max={110} onChange={v => set("titleFontSize", v)} />
          <Slider label="Texte (px)" value={cfg.textFontSize} min={24} max={72} onChange={v => set("textFontSize", v)} />
        </div>

        {/* Branding */}
        <div style={{ marginBottom: 16, background: "#09090b", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ color: "#a1a1aa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Branding</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={cfg.showBranding} onChange={e => set("showBranding", e.target.checked)} style={{ accentColor: "#7c3aed" }} />
            <span style={{ color: "#d4d4d8", fontSize: 13 }}>Afficher le logo</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={cfg.showCounter} onChange={e => set("showCounter", e.target.checked)} style={{ accentColor: "#7c3aed" }} />
            <span style={{ color: "#d4d4d8", fontSize: 13 }}>Compteur slides</span>
          </label>
          <input value={cfg.brandingText} onChange={e => set("brandingText", e.target.value)}
            placeholder="nightlife.paris" style={{
              display: "block", width: "100%", padding: "8px 10px",
              background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8,
              color: "white", fontSize: 13, boxSizing: "border-box", outline: "none",
            }} />
        </div>

        {/* CTA */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: "#a1a1aa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            CTA (dernier slide)
          </label>
          <input value={cfg.ctaText} onChange={e => set("ctaText", e.target.value)}
            placeholder="DM pour participer" style={{
              display: "block", width: "100%", marginTop: 6, padding: "9px 12px",
              background: "#09090b", border: "1px solid #3f3f46", borderRadius: 8,
              color: "white", fontSize: 14, boxSizing: "border-box", outline: "none",
            }} />
        </div>

        {/* Slides */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ color: "#a1a1aa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Slides ({cfg.slides.length})
            </div>
            <button onClick={addSlide} style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: "rgba(124,58,237,0.2)", color: "#a78bfa",
              border: "1px solid rgba(124,58,237,0.3)", cursor: "pointer",
            }}>+ Ajouter</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cfg.slides.map((s, i) => (
              <div key={i} onClick={() => setActiveSlide(i)} style={{
                background: activeSlide === i ? "rgba(124,58,237,0.1)" : "#09090b",
                border: `1px solid ${activeSlide === i ? "#7c3aed55" : "#3f3f46"}`,
                borderRadius: 10, padding: "10px 12px", cursor: "pointer",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: activeSlide === i ? "#a78bfa" : "#71717a", fontSize: 11, fontWeight: 600 }}>
                    Slide {i + 1}
                  </span>
                  {cfg.slides.length > 1 && (
                    <button onClick={e => { e.stopPropagation(); removeSlide(i); }} style={{
                      background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: 14,
                    }}>×</button>
                  )}
                </div>
                <input value={s.titre} onChange={e => setSlide(i, "titre", e.target.value)}
                  onClick={e => e.stopPropagation()}
                  placeholder="Titre du slide" style={{
                    display: "block", width: "100%", marginBottom: 6, padding: "6px 8px",
                    background: "#18181b", border: "1px solid #27272a", borderRadius: 6,
                    color: "white", fontSize: 12, boxSizing: "border-box", outline: "none",
                  }} />
                <input value={s.phrase} onChange={e => setSlide(i, "phrase", e.target.value)}
                  onClick={e => e.stopPropagation()}
                  placeholder="Phrase d'accroche" style={{
                    display: "block", width: "100%", padding: "6px 8px",
                    background: "#18181b", border: "1px solid #27272a", borderRadius: 6,
                    color: "#a1a1aa", fontSize: 12, boxSizing: "border-box", outline: "none",
                  }} />
              </div>
            ))}
          </div>
        </div>

        {/* Save config */}
        <button onClick={saveConfig} style={{
          width: "100%", padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: saved ? "rgba(16,185,129,0.15)" : "rgba(124,58,237,0.15)",
          color: saved ? "#10b981" : "#a78bfa",
          border: `1px solid ${saved ? "rgba(16,185,129,0.3)" : "rgba(124,58,237,0.3)"}`,
          cursor: "pointer",
        }}>
          {saved ? "✓ Sauvegardé !" : "💾 Sauvegarder la config"}
        </button>
      </div>

      {/* ─── Preview + export ─── */}
      <div style={{ flex: 1 }}>

        {/* Canvas preview */}
        <div style={{
          background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: 20, marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ color: "white", fontSize: 15, fontWeight: 700, margin: 0 }}>
              Preview — Slide {activeSlide + 1}/{cfg.slides.length}
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setActiveSlide(s => Math.max(0, s - 1))} disabled={activeSlide === 0} style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 13,
                background: "#09090b", border: "1px solid #3f3f46",
                color: activeSlide === 0 ? "#3f3f46" : "#a1a1aa", cursor: activeSlide === 0 ? "default" : "pointer",
              }}>← Prev</button>
              <button onClick={() => setActiveSlide(s => Math.min(cfg.slides.length - 1, s + 1))} disabled={activeSlide === cfg.slides.length - 1} style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 13,
                background: "#09090b", border: "1px solid #3f3f46",
                color: activeSlide === cfg.slides.length - 1 ? "#3f3f46" : "#a1a1aa",
                cursor: activeSlide === cfg.slides.length - 1 ? "default" : "pointer",
              }}>Next →</button>
            </div>
          </div>

          <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
            <canvas ref={canvasRef} width={1080} height={1080}
              style={{ width: "100%", borderRadius: 12, display: "block" }} />
            {rendering && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(9,9,11,0.6)", borderRadius: 12, color: "#a78bfa", fontSize: 14,
              }}>Rendu en cours...</div>
            )}
          </div>

          {/* Slide dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
            {cfg.slides.map((_, i) => (
              <button key={i} onClick={() => setActiveSlide(i)} style={{
                width: i === activeSlide ? 20 : 8, height: 8, borderRadius: 4,
                background: i === activeSlide ? THEMES[cfg.theme].accent : "#3f3f46",
                border: "none", cursor: "pointer", padding: 0, transition: "all 0.2s",
              }} />
            ))}
          </div>
        </div>

        {/* Export */}
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ color: "white", fontSize: 15, fontWeight: 700, margin: 0 }}>Export PNG — 1080×1080</h2>
            <button onClick={exportAll} disabled={rendering} style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: rendering ? "#27272a" : "linear-gradient(135deg,#7c3aed,#db2777)",
              color: "white", border: "none", cursor: rendering ? "default" : "pointer",
            }}>
              {rendering ? "Génération..." : `⬇️ Générer ${cfg.slides.length} slides`}
            </button>
          </div>

          {exportUrls.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              {exportUrls.map((url, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={url} alt={`Slide ${i + 1}`}
                    style={{ width: "100%", borderRadius: 8, display: "block" }} />
                  <button onClick={() => downloadSlide(url, i)} style={{
                    position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
                    padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: "rgba(0,0,0,0.8)", color: "white",
                    border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", whiteSpace: "nowrap",
                  }}>⬇ Télécharger</button>
                </div>
              ))}
            </div>
          )}

          {exportUrls.length === 0 && (
            <div style={{ color: "#52525b", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
              Clique sur "Générer" pour créer les slides en 1080×1080px téléchargeables
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
