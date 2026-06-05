"use client";

import type { CSSProperties } from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import GooglePlacesPicker, { type PlacePick } from "@/components/GooglePlacesPicker";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Slide { titre: string; phrase: string; photoRef: string | null; }
type ThemeKey = "violet_nuit" | "luxe_noir" | "rose_parisien" | "or_champagne";

interface Config {
  restaurant: string;
  theme: ThemeKey;
  gradientIntensity: number;
  titleFontSize: number;
  textFontSize: number;
  showBranding: boolean;
  brandingText: string;
  ctaText: string;
  slides: Slide[];
  caption: string;
  hashtags: string;
}

// ─── Themes ───────────────────────────────────────────────────────────────────

const THEMES: Record<ThemeKey, { name: string; accent: string; title: string; text: string }> = {
  violet_nuit:   { name: "Violet Nuit",   accent: "#a78bfa", title: "#ffffff", text: "#c4b5fd" },
  luxe_noir:     { name: "Luxe Noir",     accent: "#f59e0b", title: "#ffffff", text: "#d4d4d4" },
  rose_parisien: { name: "Rosé Parisien", accent: "#f472b6", title: "#ffffff", text: "#fbcfe8" },
  or_champagne:  { name: "Or Champagne",  accent: "#fcd34d", title: "#fef3c7", text: "#fde68a" },
};

const DEFAULT_SLIDES: Slide[] = [
  { titre: "Soirée exclusive", phrase: "Une expérience à vivre", photoRef: null },
  { titre: "Une ambiance unique", phrase: "Le meilleur de Paris", photoRef: null },
  { titre: "Rejoins-nous", phrase: "Envoie-nous un DM", photoRef: null },
];

const DEFAULT_CFG: Config = {
  restaurant: "",
  theme: "violet_nuit",
  gradientIntensity: 65,
  titleFontSize: 68,
  textFontSize: 40,
  showBranding: true,
  brandingText: "nightlife.paris",
  ctaText: "DM pour participer",
  slides: DEFAULT_SLIDES,
  caption: "",
  hashtags: "#nightlifeparis #paris #soiree",
};

// ─── Canvas helpers ────────────────────────────────────────────────────────────

function slidePhotoUrl(ref: string) {
  return `/api/places/photo?ref=${encodeURIComponent(ref)}&maxw=1080`;
}

function loadImg(src: string, timeoutMs = 8000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const t = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    img.onload = () => { clearTimeout(t); resolve(img); };
    img.onerror = () => { clearTimeout(t); reject(new Error("load")); };
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(" ");
  let line = "", curY = y;
  for (const w of words) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, curY);
      line = w + " "; curY += lh;
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

  // Background: real photo or gradient
  let photoLoaded = false;
  if (slide.photoRef) {
    try {
      const img = await loadImg(slidePhotoUrl(slide.photoRef));
      const sc = Math.max(W / img.width, H / img.height);
      const sw = img.width * sc, sh = img.height * sc;
      ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
      photoLoaded = true;
    } catch {}
  }
  if (!photoLoaded) {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#1a0533"); bg.addColorStop(1, "#09090b");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  }

  // Gradient overlay
  const alpha = cfg.gradientIntensity / 100;
  const grad = ctx.createLinearGradient(0, H * 0.2, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${alpha})`);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  // Top vignette for branding
  if (cfg.showBranding) {
    const tg = ctx.createLinearGradient(0, 0, 0, 110);
    tg.addColorStop(0, "rgba(0,0,0,0.6)"); tg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 110);
    ctx.beginPath(); ctx.arc(pad + 18, 58, 18, 0, Math.PI * 2);
    ctx.fillStyle = theme.accent; ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 32px system-ui,sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 8;
    ctx.fillText(cfg.brandingText, pad + 46, 68);
    ctx.shadowBlur = 0;
  }

  // Slide counter
  const cTxt = `${idx + 1} / ${cfg.slides.length}`;
  ctx.font = "bold 28px system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(cTxt, W - ctx.measureText(cTxt).width - pad, 66);

  // Title
  ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 24;
  ctx.fillStyle = theme.title;
  ctx.font = `bold ${cfg.titleFontSize}px system-ui,sans-serif`;
  const afterTitle = wrapText(ctx, slide.titre, pad, H * 0.56, W - pad * 2, cfg.titleFontSize * 1.25);

  // Phrase
  ctx.fillStyle = theme.text;
  ctx.font = `${cfg.textFontSize}px system-ui,sans-serif`;
  ctx.shadowBlur = 16;
  wrapText(ctx, slide.phrase, pad, afterTitle + 16, W - pad * 2, cfg.textFontSize * 1.55);
  ctx.shadowBlur = 0;

  // CTA button on last slide
  const isLast = idx === cfg.slides.length - 1;
  if (isLast && cfg.ctaText) {
    ctx.font = "bold 38px system-ui,sans-serif";
    const bW = ctx.measureText(cfg.ctaText).width + 80, bH = 78;
    const bX = pad, bY = H - 150;
    rrect(ctx, bX, bY, bW, bH, 39);
    ctx.fillStyle = theme.accent; ctx.fill();
    ctx.fillStyle = "#000"; ctx.fillText(cfg.ctaText, bX + 40, bY + 50);
  }
  if (!isLast) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "28px system-ui,sans-serif";
    ctx.fillText("→ suite", W - 170, H - 64);
  }

  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "22px system-ui,sans-serif";
  ctx.fillText(`@${cfg.brandingText}`, pad, H - 64);
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

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

const lbl: CSSProperties = { color: "#a1a1aa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" };
const inp: CSSProperties = { display: "block", width: "100%", padding: "8px 10px", background: "#09090b", border: "1px solid #3f3f46", borderRadius: 8, color: "white", fontSize: 13, boxSizing: "border-box", outline: "none" };

// ─── Main component ────────────────────────────────────────────────────────────

export default function CarouselGeneratorInline() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<Config>(DEFAULT_CFG);
  const [activeSlide, setActiveSlide] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Restore config from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem("cg_v4");
      if (s) setCfg(c => ({ ...c, ...JSON.parse(s) }));
    } catch {}
  }, []);

  const doRender = useCallback(async () => {
    if (!canvasRef.current || !open) return;
    setRendering(true);
    const slide = cfg.slides[activeSlide] ?? cfg.slides[0];
    if (slide) await renderSlide(canvasRef.current, cfg, slide, activeSlide);
    setRendering(false);
  }, [cfg, activeSlide, open]);

  useEffect(() => { doRender(); }, [doRender]);

  function set<K extends keyof Config>(k: K, v: Config[K]) {
    setCfg(c => ({ ...c, [k]: v }));
  }

  function setSlide(i: number, k: keyof Slide, v: string) {
    setCfg(c => {
      const slides = [...c.slides];
      slides[i] = { ...slides[i], [k]: v };
      return { ...c, slides };
    });
  }

  function handlePlacePick(pick: PlacePick) {
    // Each picked photo becomes one slide
    const slides: Slide[] = pick.photos.map((photo, i) => ({
      titre: i === 0 ? pick.placeName : i === pick.photos.length - 1 ? "Rejoins-nous" : `Une soirée inoubliable`,
      phrase: i === 0
        ? `${pick.rating ? `★ ${pick.rating.toFixed(1)} · ` : ""}${pick.address.split(",")[0]}`
        : i === pick.photos.length - 1
        ? "Envoie-nous un DM pour participer"
        : "Le meilleur de la vie parisienne",
      photoRef: photo.ref,
    }));

    const hashtags = `#nightlifeparis #paris #${pick.placeName.toLowerCase().replace(/[^a-z0-9]/g, "")} #soiree #luxury`;

    setCfg(c => ({
      ...c,
      restaurant: pick.placeName,
      slides,
      caption: `✨ ${pick.placeName} — notre prochaine soirée privée. Places limitées. DM pour candidater.`,
      hashtags,
    }));
    setActiveSlide(0);
  }

  function saveConfig() {
    localStorage.setItem("cg_v4", JSON.stringify(cfg));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  async function submitCarousel() {
    if (submitting || !cfg.restaurant) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/contenu/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant: cfg.restaurant,
          slides: cfg.slides.map(s => ({ titre: s.titre, phrase: s.phrase, photoRef: s.photoRef })),
          caption: cfg.caption,
          hashtags: cfg.hashtags,
          scoreGlobal: 8.0,
          scoreViral: 8.0,
          scoreLuxe: 8.0,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 4000);
      }
    } catch {}
    setSubmitting(false);
  }

  const theme = THEMES[cfg.theme];

  return (
    <div style={{ marginTop: 48 }}>

      {/* Toggle button */}
      <button onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%",
        background: "#18181b", border: "1px solid #27272a",
        borderRadius: open ? "14px 14px 0 0" : 14,
        padding: "16px 20px", cursor: "pointer", textAlign: "left",
      }}>
        <span style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: "linear-gradient(135deg,#10b981,#059669)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>🗺️</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: "white", fontWeight: 700, fontSize: 15 }}>Générateur de carrousels</div>
          <div style={{ color: "#71717a", fontSize: 12, marginTop: 1 }}>
            {cfg.restaurant
              ? `${cfg.restaurant} · ${cfg.slides.length} slide${cfg.slides.length > 1 ? "s" : ""} · prêt à soumettre`
              : "Recherche un restaurant sur Google Maps → sélectionne les photos → génère"}
          </div>
        </div>
        <span style={{
          color: "#52525b", fontSize: 18, lineHeight: 1,
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s",
          display: "inline-block",
        }}>▾</span>
      </button>

      {open && (
        <div style={{
          background: "#18181b", border: "1px solid #27272a", borderTop: "none",
          borderRadius: "0 0 14px 14px", padding: 20,
        }}>

          {/* ── Google Maps picker ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...lbl, marginBottom: 12 }}>
              🗺️ Rechercher un restaurant sur Google Maps
            </div>
            <GooglePlacesPicker onPick={handlePlacePick} />
          </div>

          {/* Only show the rest once a restaurant is selected */}
          {cfg.restaurant && (
            <>
              {/* Restaurant selected banner */}
              <div style={{
                background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: 10, padding: "10px 14px", marginBottom: 20,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 18 }}>✓</span>
                <div>
                  <div style={{ color: "#10b981", fontWeight: 700, fontSize: 13 }}>{cfg.restaurant}</div>
                  <div style={{ color: "#52525b", fontSize: 11 }}>
                    {cfg.slides.length} slide{cfg.slides.length > 1 ? "s" : ""} · {cfg.slides.filter(s => s.photoRef).length} avec photo Google
                  </div>
                </div>
              </div>

              {/* Config + Canvas */}
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

                {/* ── Config panel ── */}
                <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Theme */}
                  <div>
                    <div style={lbl}>Thème</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginTop: 6 }}>
                      {(Object.keys(THEMES) as ThemeKey[]).map(k => (
                        <button key={k} onClick={() => set("theme", k)} style={{
                          padding: "7px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                          background: cfg.theme === k ? `${THEMES[k].accent}22` : "#09090b",
                          color: cfg.theme === k ? THEMES[k].accent : "#71717a",
                          border: `1px solid ${cfg.theme === k ? THEMES[k].accent + "44" : "#3f3f46"}`,
                          cursor: "pointer",
                        }}>{THEMES[k].name}</button>
                      ))}
                    </div>
                  </div>

                  {/* Gradient */}
                  <div style={{ background: "#09090b", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ ...lbl, marginBottom: 10 }}>Overlay</div>
                    <RangeSlider label="Intensité (%)" value={cfg.gradientIntensity} min={30} max={90}
                      onChange={v => set("gradientIntensity", v)} />
                  </div>

                  {/* Typography */}
                  <div style={{ background: "#09090b", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ ...lbl, marginBottom: 10 }}>Typographie</div>
                    <RangeSlider label="Titre (px)" value={cfg.titleFontSize} min={40} max={110}
                      onChange={v => set("titleFontSize", v)} />
                    <RangeSlider label="Texte (px)" value={cfg.textFontSize} min={24} max={72}
                      onChange={v => set("textFontSize", v)} />
                  </div>

                  {/* Branding */}
                  <div style={{ background: "#09090b", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ ...lbl, marginBottom: 8 }}>Branding</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={cfg.showBranding}
                        onChange={e => set("showBranding", e.target.checked)}
                        style={{ accentColor: "#7c3aed" }} />
                      <span style={{ color: "#d4d4d8", fontSize: 13 }}>Afficher logo</span>
                    </label>
                    <input value={cfg.brandingText} onChange={e => set("brandingText", e.target.value)}
                      placeholder="nightlife.paris" style={inp} />
                  </div>

                  {/* CTA */}
                  <div>
                    <div style={lbl}>CTA (dernier slide)</div>
                    <input value={cfg.ctaText} onChange={e => set("ctaText", e.target.value)}
                      placeholder="DM pour participer" style={{ ...inp, marginTop: 6 }} />
                  </div>

                  {/* Caption */}
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

                {/* ── Preview + Slides ── */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Canvas preview */}
                  <div style={{ background: "#09090b", borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 600 }}>
                        Slide {activeSlide + 1} / {cfg.slides.length}
                        {cfg.slides[activeSlide]?.photoRef
                          ? <span style={{ color: "#10b981", fontSize: 11, marginLeft: 8 }}>📷 Google Maps</span>
                          : <span style={{ color: "#52525b", fontSize: 11, marginLeft: 8 }}>• dégradé</span>}
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[
                          { label: "←", dis: activeSlide === 0, fn: () => setActiveSlide(s => Math.max(0, s - 1)) },
                          { label: "→", dis: activeSlide >= cfg.slides.length - 1, fn: () => setActiveSlide(s => Math.min(cfg.slides.length - 1, s + 1)) },
                        ].map(b => (
                          <button key={b.label} onClick={b.fn} disabled={b.dis} style={{
                            width: 32, height: 32, borderRadius: 7, fontSize: 14,
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
                          position: "absolute", inset: 0, display: "flex",
                          alignItems: "center", justifyContent: "center",
                          background: "rgba(9,9,11,0.6)", borderRadius: 10,
                          color: "#a78bfa", fontSize: 13,
                        }}>⏳ Chargement photo…</div>
                      )}
                    </div>

                    {/* Dot navigation */}
                    <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 10 }}>
                      {cfg.slides.map((s, i) => (
                        <button key={i} onClick={() => setActiveSlide(i)} style={{
                          width: i === activeSlide ? 20 : 8, height: 8, borderRadius: 4,
                          background: i === activeSlide
                            ? theme.accent
                            : s.photoRef ? "#10b981" : "#27272a",
                          border: "none", cursor: "pointer", padding: 0, transition: "width 0.2s",
                          opacity: i === activeSlide ? 1 : 0.5,
                        }} />
                      ))}
                    </div>
                  </div>

                  {/* Slide editor */}
                  <div style={{ background: "#09090b", borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={lbl}>Slides ({cfg.slides.length})</span>
                      <button onClick={() => {
                        if (cfg.slides.length >= 10) return;
                        setCfg(c => ({
                          ...c,
                          slides: [...c.slides, { titre: "Nouveau slide", phrase: "Votre texte ici", photoRef: null }],
                        }));
                      }} style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: "rgba(124,58,237,0.2)", color: "#a78bfa",
                        border: "1px solid rgba(124,58,237,0.3)", cursor: "pointer",
                      }}>+ Slide</button>
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
                              {s.photoRef
                                ? <span style={{ color: "#10b981", marginLeft: 6 }}>📷</span>
                                : <span style={{ color: "#3f3f46", marginLeft: 6 }}>◌</span>}
                            </span>
                            {cfg.slides.length > 1 && (
                              <button onClick={e => {
                                e.stopPropagation();
                                const slides = cfg.slides.filter((_, j) => j !== i);
                                setCfg(c => ({ ...c, slides }));
                                setActiveSlide(x => Math.min(x, slides.length - 1));
                              }} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: 16 }}>×</button>
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

              {/* ── Actions ── */}
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
                <button onClick={submitCarousel} disabled={submitting || !cfg.restaurant} style={{
                  flex: 1, padding: "11px", borderRadius: 8, fontSize: 14, fontWeight: 700,
                  background: submitted
                    ? "rgba(16,185,129,0.15)"
                    : submitting || !cfg.restaurant ? "#27272a"
                    : "linear-gradient(135deg,#7c3aed,#db2777)",
                  color: submitted ? "#10b981" : submitting || !cfg.restaurant ? "#71717a" : "white",
                  border: submitted ? "1px solid rgba(16,185,129,0.3)" : "none",
                  cursor: submitting || !cfg.restaurant ? "default" : "pointer",
                }}>
                  {submitted
                    ? "✅ Soumis dans la file !"
                    : submitting ? "⏳ En cours…"
                    : `🚀 Soumettre — ${cfg.restaurant}`}
                </button>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
