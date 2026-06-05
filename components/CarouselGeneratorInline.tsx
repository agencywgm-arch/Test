"use client";

import type { CSSProperties } from "react";
import { useState, useRef, useEffect, useCallback } from "react";

// ─── Photo library ─────────────────────────────────────────────────────────────

const PHOTOS = [
  { id: "1414235077428-338989a2e8c0", label: "Brasserie",       cat: "Restaurant" },
  { id: "1517248135467-4c7edcad34c4", label: "Lumières",        cat: "Restaurant" },
  { id: "1551218372-a8789b81b253",    label: "Gastronomie",     cat: "Restaurant" },
  { id: "1484659619872-2cb81cd62a0f", label: "Salle élégante",  cat: "Restaurant" },
  { id: "1466978913421-dad2ebd01d17", label: "Ambiance",        cat: "Restaurant" },
  { id: "1552566626-52f8b828a9d4",    label: "Comptoir",        cat: "Bar" },
  { id: "1492571350019-22de08371d37", label: "Cocktails",       cat: "Bar" },
  { id: "1527361455-5a1f43a7a103",    label: "Bar luxe",        cat: "Bar" },
  { id: "1572116469-44eedcec4c4c",    label: "Bar néon",        cat: "Bar" },
  { id: "1519864600265-abb23847ef5b", label: "Rooftop",         cat: "Paris" },
  { id: "1502602493604-6018e1c46f7a", label: "Paris nuit",      cat: "Paris" },
  { id: "1503917988258-f87a78e3c995", label: "Tour Eiffel",     cat: "Paris" },
  { id: "1508214751196-bcfd4ca60f91", label: "Club VIP",        cat: "Club" },
  { id: "1566073771259-470192a08c2a", label: "Dancefloor",      cat: "Club" },
  { id: "1529636798458-a8ed4d2c15de", label: "Lounge",          cat: "Club" },
  { id: "1473116763249-eb81d4fa6e6e", label: "Terrasse",        cat: "Terrasse" },
  { id: "1510759790077-97bf33b9e8c4", label: "Garden bar",      cat: "Terrasse" },
];
const CATS = ["Tous", "Restaurant", "Bar", "Paris", "Club", "Terrasse"];

function thumbUrl(id: string) {
  return `https://images.unsplash.com/photo-${id}?fit=crop&w=200&h=200&q=70`;
}
function fullUrl(id: string) {
  return `https://images.unsplash.com/photo-${id}?fit=crop&w=1080&h=1080&q=85`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Slide { titre: string; phrase: string; }
type ThemeKey = "violet_nuit" | "luxe_noir" | "rose_parisien" | "or_champagne";

interface Config {
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
}

// ─── Themes ───────────────────────────────────────────────────────────────────

const THEMES: Record<ThemeKey, { name: string; accent: string; title: string; text: string }> = {
  violet_nuit:   { name: "Violet Nuit",   accent: "#a78bfa", title: "#ffffff", text: "#c4b5fd" },
  luxe_noir:     { name: "Luxe Noir",     accent: "#f59e0b", title: "#ffffff", text: "#d4d4d4" },
  rose_parisien: { name: "Rosé Parisien", accent: "#f472b6", title: "#ffffff", text: "#fbcfe8" },
  or_champagne:  { name: "Or Champagne",  accent: "#fcd34d", title: "#fef3c7", text: "#fde68a" },
};

const DEFAULT_CONFIG: Config = {
  restaurant: "Le Perchoir Marais",
  photoId: PHOTOS[0].id,
  theme: "violet_nuit",
  gradientStart: 20,
  gradientIntensity: 90,
  titleFontSize: 68,
  textFontSize: 40,
  showBranding: true,
  brandingText: "nightlife.paris",
  ctaText: "DM pour participer",
  showCounter: true,
  slides: [
    { titre: "Paris vue d'en haut",       phrase: "Là où chaque soirée devient un souvenir" },
    { titre: "Une sélection pointue",     phrase: "Profil Instagram requis · Gratuit · Exclusif" },
    { titre: "L'ambiance qui fait tout",  phrase: "Lumières tamisées, musique curatée, compagnie parfaite" },
    { titre: "Rejoins les prochains",     phrase: "Places limitées — envoie-nous un DM maintenant" },
  ],
  caption: "✨ Soirée exclusive à Paris — profil Instagram requis 🌙\n\nSélection basée sur ton profil. Gratuit. Inoubliable.",
  hashtags: "#nightlifeparis #paris #soiree #restaurant #luxe #parisbynight",
};

const DEFAULT_AUTO: AutoConfig = { enabled: false, intervalDays: 7, lastRun: null, nextRun: null };

// ─── Canvas helpers ────────────────────────────────────────────────────────────

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
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
    const img = await loadImg(fullUrl(cfg.photoId));
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
    const bTxtW = ctx.measureText(cfg.ctaText).width;
    const bW = bTxtW + 80, bH = 78, bX = pad, bY = H - 150;
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

const lbl: CSSProperties = { color: "#a1a1aa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" };
const inp: CSSProperties = { display: "block", width: "100%", padding: "8px 10px", background: "#09090b", border: "1px solid #3f3f46", borderRadius: 8, color: "white", fontSize: 13, boxSizing: "border-box", outline: "none" };

// ─── Main component ────────────────────────────────────────────────────────────

export default function CarouselGeneratorInline() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  const [auto, setAuto] = useState<AutoConfig>(DEFAULT_AUTO);
  const [activeSlide, setActiveSlide] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [catFilter, setCatFilter] = useState("Tous");
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem("cg_config_v2");
      if (s) setCfg(c => ({ ...c, ...JSON.parse(s) }));
      const a = localStorage.getItem("cg_auto_v2");
      if (a) setAuto(x => ({ ...x, ...JSON.parse(a) }));
    } catch {}
  }, []);

  const doRender = useCallback(async () => {
    if (!canvasRef.current || !open) return;
    setRendering(true);
    await renderSlide(canvasRef.current, cfg, cfg.slides[activeSlide] ?? cfg.slides[0], activeSlide);
    setRendering(false);
  }, [cfg, activeSlide, open]);

  useEffect(() => { doRender(); }, [doRender]);

  // Auto-gen check on mount
  useEffect(() => {
    if (!auto.enabled || !auto.nextRun) return;
    if (new Date() >= new Date(auto.nextRun)) {
      submitCarousel(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof Config>(k: K, v: Config[K]) { setCfg(c => ({ ...c, [k]: v })); }

  function setSlide(i: number, k: keyof Slide, v: string) {
    setCfg(c => { const slides = [...c.slides]; slides[i] = { ...slides[i], [k]: v }; return { ...c, slides }; });
  }

  function saveConfig() {
    localStorage.setItem("cg_config_v2", JSON.stringify(cfg));
    localStorage.setItem("cg_auto_v2", JSON.stringify(auto));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  async function submitCarousel(isAuto = false) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/contenu/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant: cfg.restaurant,
          slides: cfg.slides,
          caption: cfg.caption,
          hashtags: cfg.hashtags,
          scoreGlobal: 8.5,
          scoreViral: 8.0,
          scoreLuxe: 8.5,
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
          localStorage.setItem("cg_auto_v2", JSON.stringify(newAuto));
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
      const next = a.lastRun
        ? new Date(new Date(a.lastRun).getTime() + days * 86400000).toISOString()
        : new Date(Date.now() + days * 86400000).toISOString();
      return { ...a, intervalDays: days, nextRun: next };
    });
  }

  const filtered = catFilter === "Tous" ? PHOTOS : PHOTOS.filter(p => p.cat === catFilter);
  const theme = THEMES[cfg.theme];

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
            Crée tes slides 1080×1080 avec vraies photos — soumet directement dans la file de validation
          </div>
        </div>
        <span style={{
          color: "#71717a", fontSize: 18, lineHeight: 1,
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s",
          display: "inline-block",
        }}>▾</span>
      </button>

      {open && (
        <div style={{
          background: "#18181b", border: "1px solid #27272a", borderTop: "none",
          borderRadius: "0 0 14px 14px", padding: 20,
        }}>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

            {/* ─── Config panel ─── */}
            <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>

              <div>
                <div style={lbl}>Restaurant</div>
                <input value={cfg.restaurant} onChange={e => set("restaurant", e.target.value)}
                  style={{ ...inp, marginTop: 6 }} />
              </div>

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

              {/* Photo picker */}
              <div style={{ background: "#09090b", borderRadius: 10, padding: "12px 14px" }}>
                <div style={lbl}>Photo d'ambiance</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", margin: "8px 0 10px" }}>
                  {CATS.map(c => (
                    <button key={c} onClick={() => setCatFilter(c)} style={{
                      padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 500,
                      background: catFilter === c ? "rgba(124,58,237,0.2)" : "transparent",
                      color: catFilter === c ? "#a78bfa" : "#52525b",
                      border: `1px solid ${catFilter === c ? "#7c3aed44" : "#3f3f46"}`,
                      cursor: "pointer",
                    }}>{c}</button>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>
                  {filtered.map(p => (
                    <div key={p.id} onClick={() => set("photoId", p.id)} style={{
                      position: "relative", borderRadius: 7, overflow: "hidden",
                      cursor: "pointer", aspectRatio: "1",
                      outline: cfg.photoId === p.id ? `2px solid ${theme.accent}` : "2px solid transparent",
                      outlineOffset: 1,
                    }}>
                      <img src={thumbUrl(p.id)} alt={p.label} loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      {cfg.photoId === p.id && (
                        <div style={{
                          position: "absolute", inset: 0,
                          background: `${theme.accent}44`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 16, color: "white",
                        }}>✓</div>
                      )}
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        background: "linear-gradient(transparent,rgba(0,0,0,0.75))",
                        padding: "10px 3px 3px", fontSize: 8, color: "white",
                        textAlign: "center", lineHeight: 1.1,
                      }}>{p.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gradient */}
              <div style={{ background: "#09090b", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ ...lbl, marginBottom: 10 }}>Dégradé</div>
                <RangeSlider label="Début (%)" value={cfg.gradientStart} min={0} max={80}
                  onChange={v => set("gradientStart", v)} />
                <RangeSlider label="Intensité (%)" value={cfg.gradientIntensity} min={40} max={100}
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

              {/* Caption + hashtags */}
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

            {/* ─── Right: Preview + Slides ─── */}
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
                        padding: "5px 12px", borderRadius: 7, fontSize: 12, cursor: b.dis ? "default" : "pointer",
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

              {/* Slides list */}
              <div style={{ background: "#09090b", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={lbl}>Slides ({cfg.slides.length})</span>
                  <button onClick={() => {
                    if (cfg.slides.length >= 10) return;
                    setCfg(c => ({ ...c, slides: [...c.slides, { titre: "Nouveau slide", phrase: "Votre texte ici" }] }));
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
              {submitted ? "✅ Soumis dans la file !" : submitting ? "⏳ En cours…" : "🚀 Générer & Soumettre"}
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
                  Soumet automatiquement une nouvelle proposition à chaque ouverture après l'intervalle choisi
                </div>
              </div>
              <button onClick={() => toggleAuto(!auto.enabled)} style={{
                width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                background: auto.enabled ? "#7c3aed" : "#27272a",
                position: "relative", flexShrink: 0, marginLeft: 16, transition: "background 0.2s",
              }}>
                <span style={{
                  position: "absolute", top: 3,
                  left: auto.enabled ? 23 : 3,
                  width: 18, height: 18, borderRadius: "50%",
                  background: "white", transition: "left 0.2s",
                  display: "block",
                }} />
              </button>
            </div>

            {auto.enabled && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
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
