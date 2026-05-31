import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { supabase } from "./lib/supabase";
import QRCode from "qrcode";

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STORE — demo orders + real Supabase restaurants
// ─────────────────────────────────────────────────────────────────────────────
const StoreCtx = createContext(null);

function fmtStatus(s) {
  return s === "PENDING" ? "new" : s === "PREPARING" ? "cooking" : s === "READY" ? "ready" : "served";
}

function fmtOrder(o) {
  return {
    id: o.id,
    table: o.tables?.number ?? "?",
    note: o.note || "",
    total: Number(o.total || 0),
    payment_method: o.payment_method || "cash",
    status: fmtStatus(o.status),
    elapsed: Math.max(0, Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000)),
    items: (o.order_items || []).map(oi => ({
      id: oi.id,
      name: oi.menu_items?.name ?? "Plat",
      price: Number(oi.menu_items?.price ?? 0),
      qty: oi.quantity,
      emoji: oi.menu_items?.emoji ?? "🍽",
      cat: oi.menu_items?.category ?? "",
    })),
    createdAt: o.created_at,
  };
}

const ORDER_QUERY = "*, tables(number), order_items(id, quantity, menu_items(name, emoji, price, category))";

function useStore(restaurantId) {
  const [orders, setOrders] = useState([]);
  const [doneOrders, setDoneOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const pushNotif = useCallback((msg, type = "info") => {
    const n = { id: Date.now(), msg, type };
    setNotifications(p => [n, ...p.slice(0, 4)]);
    setTimeout(() => setNotifications(p => p.filter(x => x.id !== n.id)), 5000);
  }, []);

  useEffect(() => {
    if (!restaurantId) { setOrders([]); setDoneOrders([]); return; }

    supabase.from("orders").select(ORDER_QUERY)
      .eq("restaurant_id", restaurantId).neq("status", "DONE")
      .order("created_at", { ascending: true })
      .then(({ data }) => setOrders((data ?? []).map(fmtOrder)));

    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    supabase.from("orders").select(ORDER_QUERY)
      .eq("restaurant_id", restaurantId).eq("status", "DONE")
      .gte("created_at", dayStart.toISOString())
      .order("created_at", { ascending: false })
      .then(({ data }) => setDoneOrders((data ?? []).map(fmtOrder)));

    const ch = supabase.channel(`store-${restaurantId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        async ({ new: row }) => {
          const { data } = await supabase.from("orders").select(ORDER_QUERY).eq("id", row.id).single();
          if (!data) return;
          const o = fmtOrder(data);
          setOrders(prev => [o, ...prev]);
          pushNotif(`Nouvelle commande — Table ${o.table}`, "new");
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        async ({ new: row }) => {
          if (row.status === "DONE") {
            setOrders(prev => prev.filter(o => o.id !== row.id));
            const { data } = await supabase.from("orders").select(ORDER_QUERY).eq("id", row.id).single();
            if (data) setDoneOrders(prev => [fmtOrder(data), ...prev.slice(0, 49)]);
          } else {
            setOrders(prev => prev.map(o => o.id === row.id ? { ...o, status: fmtStatus(row.status) } : o));
          }
        }
      )
      .subscribe();

    const tick = setInterval(() => {
      setOrders(prev => prev.map(o => ({ ...o, elapsed: Math.max(0, Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000)) })));
    }, 60000);

    return () => { supabase.removeChannel(ch); clearInterval(tick); };
  }, [restaurantId]);

  const revenue = doneOrders.reduce((s, o) => s + o.total, 0);
  return { orders, servedOrders: doneOrders, doneOrders, notifications, pushNotif, revenue };
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg: "#F5F5F7", surface: "#FFFFFF", surfaceAlt: "#FAFAFA",
  border: "rgba(0,0,0,0.08)", borderStrong: "rgba(0,0,0,0.14)",
  text: "#1D1D1F", textSecondary: "#6E6E73", textTertiary: "#AEAEB2",
  accent: "#FF375F", accentBlue: "#0071E3", accentGreen: "#34C759",
  accentOrange: "#FF9F0A", accentPurple: "#BF5AF2", dark: "#1D1D1F", white: "#FFFFFF",
};
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  body { font-family: 'Figtree', -apple-system, sans-serif; background: ${C.bg}; }
  ::-webkit-scrollbar { width: 0; height: 0; }
  input, button, textarea { font-family: inherit; }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes ring { 0%,100% { transform:scale(1); } 50% { transform:scale(1.06); } }
  .btn-press:active { transform: scale(0.97); opacity: 0.9; }
  .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
  .fade-in { animation: fadeIn 0.3s ease; }
  .slide-up { animation: slideUp 0.3s ease; }
`;
const FF = { fontFamily: "'Figtree', -apple-system, sans-serif" };

function Surface({ children, style: s = {}, onClick, className = "", id }) {
  return (
    <div id={id} onClick={onClick} className={className}
      style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, ...s }}>
      {children}
    </div>
  );
}

function Tag({ children, color = C.accentBlue }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: color + "15", color, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, letterSpacing: "0.01em" }}>
      {children}
    </span>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md", full, disabled, style: s = {} }) {
  const base = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", border: "none", transition: "all 0.15s ease", ...FF, opacity: disabled ? 0.4 : 1 };
  const sizes = { xs: { padding: "6px 12px", fontSize: 12, borderRadius: 8 }, sm: { padding: "8px 16px", fontSize: 13, borderRadius: 10 }, md: { padding: "11px 20px", fontSize: 15, borderRadius: 12 }, lg: { padding: "14px 28px", fontSize: 16, borderRadius: 14 } };
  const variants = {
    primary: { background: C.dark, color: C.white },
    blue: { background: C.accentBlue, color: C.white },
    red: { background: C.accent, color: C.white },
    green: { background: C.accentGreen, color: C.white },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.borderStrong}` },
    subtle: { background: C.bg, color: C.text },
  };
  return (
    <button onClick={!disabled ? onClick : undefined} className="btn-press"
      style={{ ...base, ...sizes[size], ...variants[variant], width: full ? "100%" : "auto", ...s }}>
      {children}
    </button>
  );
}

function InputField({ label, type = "text", placeholder, value, onChange, autoFocus, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}</label>}
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} autoFocus={autoFocus}
        style={{ width: "100%", background: focused ? C.white : C.bg, border: `1.5px solid ${focused ? C.dark : "transparent"}`, borderRadius: 12, padding: "12px 14px", color: C.text, fontSize: 15, outline: "none", transition: "all 0.15s", ...FF }}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      {hint && <p style={{ color: C.textTertiary, fontSize: 12, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

function Logo({ dark = true, size = 18 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: size + 10, height: size + 10, background: dark ? C.dark : C.white, borderRadius: (size + 10) * 0.28, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.7 }}>🍽</span>
      </div>
      <span style={{ fontSize: size, fontWeight: 800, color: dark ? C.dark : C.white, letterSpacing: "-0.03em", ...FF }}>
        Velvet<span style={{ color: C.accent }}>Guest</span>
      </span>
    </div>
  );
}

function Dot({ color = C.accentGreen, pulse = false }) {
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0, animation: pulse ? "pulse 1.8s ease-in-out infinite" : "none" }} />;
}

function Avatar({ name, size = 32 }) {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: C.dark, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function Toasts({ notifs }) {
  const colors = { info: C.accentBlue, success: C.accentGreen, warning: C.accentOrange, new: C.accent };
  const icons = { info: "↑", success: "✓", warning: "!", new: "+" };
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {notifs.map(n => (
        <div key={n.id} style={{ background: C.dark, color: C.white, padding: "12px 16px", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.24)", animation: "slideDown 0.3s ease", minWidth: 260, maxWidth: 340, ...FF }}>
          <div style={{ width: 24, height: 24, borderRadius: 8, background: colors[n.type] || C.accentBlue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{icons[n.type]}</div>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{n.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QR CODE (pure canvas)
// ─────────────────────────────────────────────────────────────────────────────
function QRCanvas({ text, size = 160, fg = "#000", bg = "#fff" }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !text) return;
    QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 2,
      color: { dark: fg, light: bg },
      errorCorrectionLevel: "M",
    });
  }, [text, size, fg, bg]);
  return <canvas ref={ref} width={size} height={size} style={{ display: "block", borderRadius: 10 }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH PAGE — wired to Supabase
// ─────────────────────────────────────────────────────────────────────────────
function SignupPage({ onDone }) {
  const [mode, setMode] = useState("signup");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const ok = mode === "login" ? form.email && form.password : form.name && form.email && form.password.length >= 8;

  async function submit() {
    setError(""); setLoading(true);
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email: form.email, password: form.password,
          options: { data: { name: form.name } },
        });
        if (err) throw err;
        setSent(true);
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (err) throw err;
        onDone({ name: data.user.user_metadata?.name || form.email.split("@")[0], email: data.user.email, id: data.user.id });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", ...FF }}>
      <style>{css}</style>
      <Surface style={{ padding: 40, maxWidth: 380, width: "100%", margin: "0 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.dark, marginBottom: 8 }}>Vérifiez vos emails</h2>
        <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.6 }}>Un lien de confirmation a été envoyé à <strong>{form.email}</strong>. Cliquez dessus pour activer votre compte.</p>
        <Btn variant="ghost" size="sm" onClick={() => setSent(false)} style={{ marginTop: 20 }}>← Retour</Btn>
      </Surface>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", ...FF }}>
      <style>{css}</style>
      <div style={{ width: "100%", maxWidth: 400, padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Logo size={22} />
          <p style={{ color: C.textSecondary, fontSize: 15, marginTop: 10 }}>Gérez vos restaurants, simplement.</p>
        </div>
        <Surface style={{ padding: 32 }}>
          <div style={{ display: "flex", background: C.bg, borderRadius: 10, padding: 3, marginBottom: 28 }}>
            {[["signup", "Créer un compte"], ["login", "Se connecter"]].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex: 1, border: "none", borderRadius: 8, padding: "9px 0", background: mode === m ? C.white : "transparent", color: mode === m ? C.dark : C.textSecondary, fontWeight: mode === m ? 600 : 400, fontSize: 14, cursor: "pointer", transition: "all 0.2s", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none", ...FF }}>{l}</button>
            ))}
          </div>
          {mode === "signup" && <InputField label="Nom complet" placeholder="Jean Dupont" value={form.name} onChange={f("name")} autoFocus />}
          <InputField label="Adresse email" type="email" placeholder="jean@restaurant.fr" value={form.email} onChange={f("email")} />
          <InputField label="Mot de passe" type="password" placeholder="8 caractères minimum" value={form.password} onChange={f("password")} />
          {error && <p style={{ color: C.accent, fontSize: 13, background: C.accent + "10", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>{error}</p>}
          <Btn variant="primary" size="lg" full disabled={!ok || loading} onClick={submit} style={{ marginTop: 8 }}>
            {loading ? "..." : mode === "signup" ? "Créer mon compte →" : "Se connecter →"}
          </Btn>
        </Surface>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 24 }}>
          {["30 jours gratuits", "Sans carte bancaire", "Support 7j/7"].map(t => (
            <span key={t} style={{ color: C.textTertiary, fontSize: 12 }}>✓ {t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESTAURANTS PAGE — wired to Supabase
// ─────────────────────────────────────────────────────────────────────────────
function RestaurantsPage({ user, onSelect, onLogout }) {
  const first = (user.name || user.email).split(" ")[0];
  const h = new Date().getHours();
  const greet = h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
  const [restaurants, setRestaurants] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", logo_emoji: "🍽️", tables_count: 8 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const fv = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    supabase.from("restaurants").select("*").eq("owner_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setRestaurants(data ?? []); setLoadingList(false); });
  }, [user.id]);

  function slugify(name) {
    return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function createRestaurant(e) {
    e.preventDefault(); setCreating(true); setCreateError("");
    const slug = `${slugify(form.name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error: err } = await supabase.from("restaurants")
      .insert({ ...form, owner_id: user.id, slug, tables_count: Number(form.tables_count) })
      .select().single();
    if (err) { setCreateError(err.message); setCreating(false); return; }
    // Create table records
    const tableRows = Array.from({ length: Number(form.tables_count) }, (_, i) => ({
      restaurant_id: data.id, number: i + 1,
      qr_url: `${window.location.origin}/r/${slug}/t/${i + 1}`,
    }));
    await supabase.from("tables").insert(tableRows);
    setRestaurants(p => [data, ...p]);
    setShowCreate(false);
    setForm({ name: "", address: "", logo_emoji: "🍽️", tables_count: 8 });
    setCreating(false);
  }

  const mapRestaurant = r => ({
    id: r.id, name: r.name, address: r.address, tables: r.tables_count,
    status: "active", emoji: r.logo_emoji, scans: 0, revenue: 3840, rating: null, orders: 0,
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, ...FF }}>
      <style>{css}</style>
      <nav style={{ background: "rgba(245,245,247,0.9)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", position: "sticky", top: 0, zIndex: 100 }}>
        <Logo size={17} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={onLogout}>
          <span style={{ color: C.textSecondary, fontSize: 14 }}>{user.email}</span>
          <Avatar name={user.name || user.email} size={30} />
        </div>
      </nav>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36 }}>
          <div>
            <p style={{ color: C.textSecondary, fontSize: 15, marginBottom: 4 }}>{greet}, <strong style={{ color: C.dark }}>{first}</strong> 👋</p>
            <h1 style={{ fontSize: 34, fontWeight: 800, color: C.dark, letterSpacing: "-0.04em" }}>Mes restaurants</h1>
          </div>
          <Btn variant="primary" onClick={() => setShowCreate(true)}>+ Nouveau restaurant</Btn>
        </div>

        {loadingList ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <div style={{ width: 24, height: 24, border: `2px solid ${C.dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ring 0.8s linear infinite" }} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {restaurants.map(r => {
              const mapped = mapRestaurant(r);
              return (
                <Surface key={r.id} className="hover-lift" onClick={() => onSelect(mapped)} style={{ padding: 24, cursor: "pointer", transition: "all 0.2s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{r.logo_emoji}</div>
                    <Tag color={C.accentGreen}><Dot color={C.accentGreen} />Actif</Tag>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: C.dark, marginBottom: 4, letterSpacing: "-0.02em" }}>{r.name}</h3>
                  <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 20 }}>{r.address || "—"}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                    {[["Tables", r.tables_count], ["Scans", 0], ["Commandes", 0]].map(([l, v]) => (
                      <div key={l} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: C.dark }}>{v}</div>
                        <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </Surface>
              );
            })}
            <div onClick={() => setShowCreate(true)} style={{ border: `2px dashed ${C.border}`, borderRadius: 16, padding: 24, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 8, transition: "all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.dark} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: C.textSecondary }}>+</div>
              <span style={{ color: C.textSecondary, fontSize: 14, fontWeight: 500 }}>Ajouter un restaurant</span>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24 }}>
          <Surface style={{ padding: 32, width: "100%", maxWidth: 440 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: C.dark, marginBottom: 24 }}>Nouveau restaurant</h2>
            <form onSubmit={createRestaurant}>
              <div style={{ display: "flex", gap: 12 }}>
                <div>
                  <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Emoji</label>
                  <input value={form.logo_emoji} onChange={fv("logo_emoji")} style={{ width: 60, textAlign: "center", background: C.bg, border: "none", borderRadius: 12, padding: "12px 8px", fontSize: 24, outline: "none" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <InputField label="Nom du restaurant" placeholder="Le Petit Bistro" value={form.name} onChange={fv("name")} autoFocus />
                </div>
              </div>
              <InputField label="Adresse" placeholder="12 rue de la Paix, Paris" value={form.address} onChange={fv("address")} />
              <InputField label="Nombre de tables" type="number" value={form.tables_count} onChange={fv("tables_count")} />
              {createError && <p style={{ color: C.accent, fontSize: 13, marginBottom: 12 }}>{createError}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <Btn variant="ghost" full onClick={() => setShowCreate(false)}>Annuler</Btn>
                <Btn variant="primary" full disabled={!form.name || creating}>{creating ? "..." : "Créer"}</Btn>
              </div>
            </form>
          </Surface>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function DashboardPage({ user, restaurant, onBack, onCuisine, onClient }) {
  const store = useContext(StoreCtx);
  const [tab, setTab] = useState("overview");
  const first = (user.name || user.email).split(" ")[0];
  const active = store.orders.filter(o => o.status !== "served");
  const ready = store.orders.filter(o => o.status === "ready");
  const TABS = [
    { id: "overview", label: "Résumé" }, { id: "orders", label: "Commandes" },
    { id: "caisse", label: "Caisse" }, { id: "qrcode", label: "QR Codes" },
    { id: "reviews", label: "Avis" }, { id: "menu", label: "Carte" },
  ];
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", ...FF }}>
      <style>{css}</style>
      <Toasts notifs={store.notifications} />
      <aside style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 16px" }}>
          <Logo size={16} />
          <div onClick={onBack} style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: C.bg, cursor: "pointer" }}>
            <div style={{ fontSize: 22 }}>{restaurant.emoji}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, letterSpacing: "-0.01em" }}>{restaurant.name}</div>
              <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }}>← Changer</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "4px 10px" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ width: "100%", display: "flex", alignItems: "center", padding: "9px 12px", borderRadius: 10, border: "none", background: tab === t.id ? C.bg : "transparent", color: tab === t.id ? C.dark : C.textSecondary, fontWeight: tab === t.id ? 600 : 400, fontSize: 14, cursor: "pointer", textAlign: "left", marginBottom: 2, transition: "all 0.15s", ...FF }}>
              {t.label}
              {t.id === "orders" && active.length > 0 && <span style={{ marginLeft: "auto", background: C.dark, color: C.white, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20 }}>{active.length}</span>}
            </button>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <button onClick={onCuisine} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: "none", background: ready.length > 0 ? C.accentGreen + "15" : C.bg, color: ready.length > 0 ? C.accentGreen : C.textSecondary, fontWeight: 600, fontSize: 14, cursor: "pointer", marginBottom: 4, ...FF }}>
              <Dot color={C.accentGreen} pulse={ready.length > 0} />Vue cuisine
              {ready.length > 0 && <span style={{ marginLeft: "auto", background: C.accentGreen, color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20 }}>{ready.length} prête{ready.length > 1 ? "s" : ""}</span>}
            </button>
            <button onClick={onClient} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: "none", background: C.bg, color: C.textSecondary, fontWeight: 500, fontSize: 14, cursor: "pointer", ...FF }}>
              <span style={{ fontSize: 14 }}>📱</span> Vue client
            </button>
          </div>
        </nav>
        <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar name={user.name || user.email} size={30} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{user.name}</div>
              <div style={{ fontSize: 11, color: C.textTertiary }}>{user.email}</div>
            </div>
          </div>
        </div>
      </aside>
      <AgentChat restaurant={restaurant} store={store} />
      <main style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
        <header style={{ background: "rgba(245,245,247,0.9)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`, padding: "0 32px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.dark, letterSpacing: "-0.02em" }}>{TABS.find(t => t.id === tab)?.label}</h2>
            <p style={{ fontSize: 12, color: C.textTertiary }}>Bienvenue, {first} · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" size="sm" onClick={onCuisine}>🍳 Cuisine{ready.length > 0 ? ` (${ready.length})` : ""}</Btn>
            <Btn variant="primary" size="sm" onClick={onClient}>📱 Vue client</Btn>
          </div>
        </header>
        <div style={{ padding: "28px 32px" }}>
          {tab === "overview" && <OverviewTab store={store} restaurant={restaurant} onCuisine={onCuisine} onClient={onClient} />}
          {tab === "orders" && <OrdersTab store={store} />}
          {tab === "caisse" && <CaisseTab store={store} restaurant={restaurant} />}
          {tab === "qrcode" && <QRTab restaurant={restaurant} />}
          {tab === "reviews" && <ReviewsTab />}
          {tab === "menu" && <MenuTabDash restaurant={restaurant} />}
        </div>
      </main>
    </div>
  );
}

function KPICard({ label, value, sub, delta }) {
  return (
    <Surface style={{ padding: "20px 22px" }}>
      <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 10, fontWeight: 500 }}>{label}</p>
      <p style={{ fontSize: 30, fontWeight: 800, color: C.dark, letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: delta > 0 ? C.accentGreen : C.textTertiary, marginTop: 8, fontWeight: 500 }}>{delta > 0 ? `↑ +${delta}%` : ""} {sub}</p>}
    </Surface>
  );
}

function StockAlerts({ restaurantId }) {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    supabase.from("menu_items").select("id, name, emoji, stock, category")
      .eq("restaurant_id", restaurantId).not("stock", "is", null).lte("stock", 5).order("stock")
      .then(({ data }) => setAlerts(data ?? []));
  }, [restaurantId]);
  if (alerts.length === 0) return null;
  return (
    <Surface style={{ padding: "18px 22px", marginBottom: 20, border: `1.5px solid ${C.accentOrange}20` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Alertes stock</p>
        <span style={{ background: C.accentOrange + "20", color: C.accentOrange, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{alerts.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: item.stock === 0 ? C.accent + "08" : C.accentOrange + "08" }}>
            <span style={{ fontSize: 20 }}>{item.emoji}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{item.name}</p>
              <p style={{ fontSize: 11, color: C.textSecondary }}>{item.category}</p>
            </div>
            <Tag color={item.stock === 0 ? C.accent : C.accentOrange}>
              {item.stock === 0 ? "Épuisé" : `${item.stock} restant${item.stock > 1 ? "s" : ""}`}
            </Tag>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function OverviewTab({ store, restaurant, onCuisine, onClient }) {
  const [weeklyRev, setWeeklyRev] = useState(Array(7).fill(0));

  useEffect(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6); weekAgo.setHours(0, 0, 0, 0);
    supabase.from("orders").select("total, created_at")
      .eq("restaurant_id", restaurant.id).eq("status", "DONE")
      .gte("created_at", weekAgo.toISOString())
      .then(({ data }) => {
        const totals = Array(7).fill(0);
        (data ?? []).forEach(o => {
          const idx = Math.floor((new Date(o.created_at) - weekAgo) / 86400000);
          if (idx >= 0 && idx < 7) totals[idx] += Number(o.total);
        });
        setWeeklyRev(totals);
      });
  }, [restaurant.id]);

  const active = store.orders.filter(o => o.status !== "served");
  const ready = store.orders.filter(o => o.status === "ready");
  const rev = store.revenue;
  const avgTicket = store.doneOrders.length > 0 ? rev / store.doneOrders.length : 0;
  const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];
  const WEEKLY = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    return { day: DAY_LABELS[d.getDay()], v: weeklyRev[i] };
  });
  const max = Math.max(...WEEKLY.map(w => w.v), 1);
  const totalWeek = weeklyRev.reduce((s, v) => s + v, 0);

  return (
    <div className="fade-in">
      <StockAlerts restaurantId={restaurant.id} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <KPICard label="Commandes actives" value={active.length} sub="en ce moment" />
        <KPICard label="CA aujourd'hui" value={`${rev.toFixed(2)} €`} sub="commandes clôturées" />
        <KPICard label="Tables servies" value={store.doneOrders.length} sub="aujourd'hui" />
        <KPICard label="Ticket moyen" value={avgTicket > 0 ? `${avgTicket.toFixed(2)} €` : "—"} sub="aujourd'hui" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <Surface onClick={onCuisine} style={{ padding: "18px 22px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }} className="hover-lift">
          <div style={{ width: 48, height: 48, borderRadius: 14, background: C.accentGreen + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🍳</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 3 }}>Vue cuisine</div>
            <div style={{ fontSize: 13, color: C.textSecondary }}>{active.length} en cours · {ready.length} prête{ready.length > 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Dot color={C.accentGreen} pulse /><span style={{ color: C.accentGreen, fontSize: 12, fontWeight: 600 }}>LIVE</span>
          </div>
        </Surface>
        <Surface onClick={onClient} style={{ padding: "18px 22px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }} className="hover-lift">
          <div style={{ width: 48, height: 48, borderRadius: 14, background: C.accentBlue + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📱</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 3 }}>Vue client</div>
            <div style={{ fontSize: 13, color: C.textSecondary }}>Aperçu carte réelle</div>
          </div>
          <Tag color={C.accentBlue}>Preview</Tag>
        </Surface>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12 }}>
        <Surface style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 4, fontWeight: 500 }}>Revenus 7 derniers jours</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: C.dark, letterSpacing: "-0.04em" }}>{totalWeek.toFixed(2)} €</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
            {WEEKLY.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", background: i === 6 ? C.dark : C.bg, borderRadius: "6px 6px 0 0", height: `${(d.v / max) * 100}%`, minHeight: 4 }} />
                <span style={{ fontSize: 10, color: i === 6 ? C.dark : C.textTertiary, fontWeight: i === 6 ? 700 : 400 }}>{d.day}</span>
              </div>
            ))}
          </div>
        </Surface>
        <Surface style={{ padding: "22px 24px" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 4 }}>Commandes en direct</p>
          <p style={{ fontSize: 12, color: C.textSecondary, marginBottom: 16 }}>
            {store.orders.length === 0 ? "Aucune commande active" : `${store.orders.length} en cours`}
          </p>
          {store.orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: C.textTertiary, fontSize: 13 }}>Calme plat 😌</div>
          ) : store.orders.slice(0, 4).map(o => {
            const sc = { new: C.accentBlue, cooking: C.accentOrange, ready: C.accentGreen }[o.status] || C.textTertiary;
            const sl = { new: "Nouvelle", cooking: "En cuisine", ready: "Prête" }[o.status];
            return (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.dark, flexShrink: 0 }}>T{o.table}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>#{o.id.slice(0, 6).toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: C.textTertiary }}>{o.elapsed} min</div>
                </div>
                <Tag color={sc}>{sl}</Tag>
              </div>
            );
          })}
        </Surface>
      </div>
    </div>
  );
}

function OrdersTab({ store }) {
  const byStatus = s => store.orders.filter(o => o.status === s);
  const all = [...store.orders, ...store.servedOrders.slice(0, 4)];
  return (
    <div className="fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[["Nouvelles", "new", C.accentBlue], ["En cuisine", "cooking", C.accentOrange], ["Prêtes", "ready", C.accentGreen], ["Servies", "served", C.textTertiary]].map(([l, s, c]) => (
          <Surface key={s} style={{ padding: "16px 18px" }}>
            <p style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8, fontWeight: 500 }}>{l}</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: c }}>{s === "served" ? store.servedOrders.length : byStatus(s).length}</p>
          </Surface>
        ))}
      </div>
      <Surface style={{ overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Toutes les commandes</p>
        </div>
        {all.map((o, i) => {
          const sc = { new: C.accentBlue, accepted: C.accentOrange, cooking: C.accentOrange, ready: C.accentGreen, served: C.textTertiary }[o.status];
          const sl = { new: "Nouvelle", accepted: "Acceptée", cooking: "En cuisine", ready: "Prête", served: "Servie" }[o.status];
          return (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 22px", borderBottom: i < all.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: C.dark, flexShrink: 0 }}>T{o.table}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>#{o.id.slice ? o.id.slice(0, 6).toUpperCase() : o.id}</p>
                <p style={{ fontSize: 12, color: C.textSecondary }}>{o.items.map(i => i.name).join(", ").slice(0, 50)}</p>
              </div>
              <p style={{ fontSize: 13, color: C.textSecondary }}>{Math.round(o.elapsed)} min</p>
              <Tag color={sc}>{sl}</Tag>
            </div>
          );
        })}
      </Surface>
    </div>
  );
}

function QRTab({ restaurant }) {
  const [sel, setSel] = useState(1);
  const [fg, setFg] = useState("#1D1D1F");
  const [bg, setBg] = useState("#FFFFFF");
  const [customBase, setCustomBase] = useState("");
  const tables = Array.from({ length: restaurant.tables || 8 }, (_, i) => i + 1);
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const baseUrl = customBase || window.location.origin;
  const url = `${baseUrl}/r/${restaurant.slug}/t/${sel}`;
  const download = () => {
    const canvas = document.querySelector("#qr-dl canvas");
    if (!canvas) return;
    const a = document.createElement("a"); a.download = `vg-table-${sel}.png`; a.href = canvas.toDataURL("image/png"); a.click();
  };
  return (
    <div className="fade-in">
      {isLocalhost && (
        <div style={{ background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 14, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, color: "#7A5C00", fontSize: 14, marginBottom: 6 }}>Vous êtes en local — les QR codes ne fonctionneront pas sur un téléphone</p>
            <p style={{ color: "#7A5C00", fontSize: 13, marginBottom: 10 }}>Entrez l'adresse IP de votre PC sur le réseau Wi-Fi pour tester depuis un téléphone. Trouvez-la avec <code style={{ background: "rgba(0,0,0,0.08)", padding: "2px 6px", borderRadius: 4 }}>ipconfig</code> (Windows) ou <code style={{ background: "rgba(0,0,0,0.08)", padding: "2px 6px", borderRadius: 4 }}>ifconfig</code> (Mac).</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={customBase}
                onChange={e => setCustomBase(e.target.value)}
                placeholder="http://192.168.1.42:5173"
                style={{ flex: 1, background: "#fff", border: "1.5px solid #FFE082", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: C.dark, outline: "none", ...FF }}
              />
              {customBase && <button onClick={() => setCustomBase("")} style={{ background: "none", border: "none", color: "#7A5C00", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>✕ Reset</button>}
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          {[["Tables", restaurant.tables || 8], ["QR actifs", restaurant.tables || 8], ["Scans totaux", 0]].map(([l, v]) => (
            <Surface key={l} style={{ padding: "16px 18px" }}>
              <p style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6, fontWeight: 500 }}>{l}</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: C.dark }}>{v}</p>
            </Surface>
          ))}
        </div>
        <Surface style={{ overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}` }}><p style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Tables</p></div>
          <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8 }}>
            {tables.map(t => (
              <div key={t} onClick={() => setSel(t)} style={{ padding: "12px 8px", borderRadius: 12, border: `1.5px solid ${sel === t ? C.dark : C.border}`, background: sel === t ? C.dark : C.surface, textAlign: "center", cursor: "pointer", transition: "all 0.15s" }}>
                <p style={{ fontSize: 10, color: sel === t ? "rgba(255,255,255,0.5)" : C.textTertiary, marginBottom: 4 }}>TABLE</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: sel === t ? C.white : C.dark }}>{t}</p>
              </div>
            ))}
          </div>
        </Surface>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Surface style={{ padding: "18px 20px" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Apparence</p>
          <div style={{ display: "flex", gap: 12 }}>
            {[["Couleur QR", fg, setFg], ["Fond", bg, setBg]].map(([l, v, set]) => (
              <div key={l} style={{ flex: 1 }}>
                <p style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>{l}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="color" value={v} onChange={e => set(e.target.value)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer", padding: 0 }} />
                  <span style={{ fontSize: 11, color: C.textTertiary }}>{v}</span>
                </div>
              </div>
            ))}
          </div>
        </Surface>
        <Surface id="qr-dl" style={{ padding: "18px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 2 }}>Table {sel}</p>
          <p style={{ fontSize: 12, color: C.textSecondary, marginBottom: 14 }}>{restaurant.name}</p>
          <div style={{ display: "inline-block", padding: 14, background: bg, borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>
            <QRCanvas text={url} size={160} fg={fg} bg={bg} />
          </div>
          <p style={{ fontSize: 10, color: C.textTertiary, marginTop: 10, wordBreak: "break-all", padding: "0 4px" }}>{url}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn variant="primary" size="sm" full onClick={download}>📥 Télécharger</Btn>
            <Btn variant="ghost" size="sm" full>🖨</Btn>
          </div>
        </Surface>
      </div>
    </div>
    </div>
  );
}

function ReviewsTab() {
  const reviews = [
    { name: "Marie T.", rating: 5, text: "Super rapide, j'adore commander depuis mon téléphone !", time: "Il y a 2h" },
    { name: "Lucas B.", rating: 4, text: "Très pratique, la carte est bien faite.", time: "Il y a 4h" },
    { name: "Sophie M.", rating: 5, text: "Le paiement en ligne est top, on n'attend plus !", time: "Hier" },
    { name: "Pierre D.", rating: 5, text: "Excellent service, commande reçue rapidement.", time: "Hier" },
  ];
  return (
    <div className="fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
        <KPICard label="Note globale" value="⭐ 4.7" sub="sur 32 avis" />
        <KPICard label="Avis ce mois" value="32" sub="vs mois dernier" delta={8} />
        <KPICard label="Taux de réponse" value="94%" sub="Excellent" delta={0} />
      </div>
      <Surface style={{ overflow: "hidden" }}>
        {reviews.map((r, i) => (
          <div key={i} style={{ padding: "18px 22px", borderBottom: i < reviews.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={r.name} size={30} />
                <div><p style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{r.name}</p><p style={{ fontSize: 11, color: C.textTertiary }}>{r.time}</p></div>
              </div>
              <div style={{ color: "#FF9F0A" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
            </div>
            <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.5 }}>{r.text}</p>
          </div>
        ))}
      </Surface>
    </div>
  );
}

const EMPTY_ITEM = { name: "", description: "", price: "", category: "Plats", emoji: "🍽️", is_popular: false, available: true, stock: "" };
const CATEGORIES = ["Entrées", "Plats", "Poissons", "Burgers", "Pizzas", "Desserts", "Boissons", "Accompagnements"];

function MenuTabDash({ restaurant }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', item }
  const [form, setForm] = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fv = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id).order("category").order("name")
      .then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, [restaurant.id]);

  function openAdd() { setForm(EMPTY_ITEM); setError(""); setModal({ mode: "add" }); }
  function openEdit(item) { setForm({ name: item.name, description: item.description, price: String(item.price), category: item.category, emoji: item.emoji, is_popular: item.is_popular, available: item.available, stock: item.stock == null ? "" : String(item.stock) }); setError(""); setModal({ mode: "edit", item }); }

  async function updateStock(item, delta) {
    const cur = item.stock == null ? null : item.stock;
    if (cur == null) return;
    const next = Math.max(0, cur + delta);
    const available = next > 0;
    await supabase.from("menu_items").update({ stock: next, available }).eq("id", item.id);
    setItems(p => p.map(i => i.id === item.id ? { ...i, stock: next, available } : i));
  }

  async function save() {
    if (!form.name || !form.price) { setError("Nom et prix requis."); return; }
    setSaving(true); setError("");
    const stock = form.stock === "" ? null : parseInt(form.stock, 10);
    const available = stock == null ? form.available : stock > 0;
    const payload = { ...form, price: parseFloat(form.price), stock, available, restaurant_id: restaurant.id };
    if (modal.mode === "add") {
      const { data, error: err } = await supabase.from("menu_items").insert(payload).select().single();
      if (err) { setError(err.message); setSaving(false); return; }
      setItems(p => [...p, data]);
    } else {
      const { data, error: err } = await supabase.from("menu_items").update(payload).eq("id", modal.item.id).select().single();
      if (err) { setError(err.message); setSaving(false); return; }
      setItems(p => p.map(i => i.id === data.id ? data : i));
    }
    setSaving(false); setModal(null);
  }

  async function toggleAvailable(item) {
    await supabase.from("menu_items").update({ available: !item.available }).eq("id", item.id);
    setItems(p => p.map(i => i.id === item.id ? { ...i, available: !i.available } : i));
  }

  async function deleteItem(item) {
    if (!confirm(`Supprimer "${item.name}" ?`)) return;
    await supabase.from("menu_items").delete().eq("id", item.id);
    setItems(p => p.filter(i => i.id !== item.id));
  }

  const byCategory = items.reduce((acc, item) => { (acc[item.category] = acc[item.category] || []).push(item); return acc; }, {});

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ color: C.textSecondary, fontSize: 13 }}>{items.length} plat{items.length !== 1 ? "s" : ""}</p>
        <Btn variant="primary" onClick={openAdd}>+ Ajouter un plat</Btn>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <div style={{ width: 20, height: 20, border: `2px solid ${C.dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ring 0.8s linear infinite" }} />
        </div>
      ) : items.length === 0 ? (
        <Surface style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div>
          <p style={{ fontWeight: 600, color: C.dark, marginBottom: 6 }}>Carte vide</p>
          <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 20 }}>Ajoutez vos premiers plats</p>
          <Btn variant="primary" onClick={openAdd}>+ Premier plat</Btn>
        </Surface>
      ) : (
        Object.entries(byCategory).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, letterSpacing: "0.08em", marginBottom: 8, paddingLeft: 4 }}>{cat.toUpperCase()}</p>
            <Surface style={{ overflow: "hidden" }}>
              {catItems.map((item, i) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px", borderBottom: i < catItems.length - 1 ? `1px solid ${C.border}` : "none", opacity: item.available ? 1 : 0.5 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{item.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{item.name}</p>
                      {item.is_popular && <Tag color={C.accent}>⭐ Populaire</Tag>}
                      {!item.available && <Tag color={C.textTertiary}>Indisponible</Tag>}
                      {item.stock != null && (
                        <Tag color={item.stock === 0 ? C.accent : item.stock <= 3 ? C.accentOrange : C.accentGreen}>
                          {item.stock === 0 ? "Épuisé" : `Stock : ${item.stock}`}
                        </Tag>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{item.description}</p>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: C.dark, minWidth: 56, textAlign: "right" }}>{Number(item.price).toFixed(2)} €</p>
                  {item.stock != null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button onClick={() => updateStock(item, -1)} disabled={item.stock === 0} style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: item.stock === 0 ? 0.3 : 1 }}>−</button>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.dark, minWidth: 24, textAlign: "center" }}>{item.stock}</span>
                      <button onClick={() => updateStock(item, 1)} style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>+</button>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => toggleAvailable(item)} title={item.available ? "Désactiver" : "Activer"} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 13 }}>{item.available ? "👁" : "🚫"}</button>
                    <Btn variant="ghost" size="xs" onClick={() => openEdit(item)}>Modifier</Btn>
                    <button onClick={() => deleteItem(item)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", color: C.accent, fontSize: 13 }}>✕</button>
                  </div>
                </div>
              ))}
            </Surface>
          </div>
        ))
      )}

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 24 }}>
          <Surface style={{ padding: 32, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.dark, marginBottom: 24 }}>{modal.mode === "add" ? "Nouveau plat" : "Modifier le plat"}</h2>
            <div style={{ display: "flex", gap: 12 }}>
              <div>
                <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Emoji</label>
                <input value={form.emoji} onChange={fv("emoji")} style={{ width: 60, textAlign: "center", background: C.bg, border: "none", borderRadius: 12, padding: "12px 8px", fontSize: 24, outline: "none" }} />
              </div>
              <div style={{ flex: 1 }}>
                <InputField label="Nom du plat" placeholder="Entrecôte 300g" value={form.name} onChange={fv("name")} autoFocus />
              </div>
            </div>
            <InputField label="Description" placeholder="Black Angus, sauce au poivre vert" value={form.description} onChange={fv("description")} />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <InputField label="Prix (€)" type="number" placeholder="18.90" value={form.price} onChange={fv("price")} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Catégorie</label>
                <select value={form.category} onChange={fv("category")} style={{ width: "100%", background: C.bg, border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 15, color: C.dark, outline: "none", ...FF, marginBottom: 16 }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Stock <span style={{ color: C.textTertiary, fontWeight: 400 }}>(laisser vide = illimité)</span>
              </label>
              <input type="number" min={0} placeholder="Ex: 12 — vide = illimité" value={form.stock} onChange={fv("stock")}
                style={{ width: "100%", background: C.bg, border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 15, color: C.dark, outline: "none", ...FF }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={form.is_popular} onChange={e => setForm(p => ({ ...p, is_popular: e.target.checked }))} style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 14, color: C.dark }}>⭐ Populaire</span>
              </label>
              {form.stock === "" && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.available} onChange={e => setForm(p => ({ ...p, available: e.target.checked }))} style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: 14, color: C.dark }}>✅ Disponible</span>
                </label>
              )}
            </div>
            {error && <p style={{ color: C.accent, fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" full onClick={() => setModal(null)}>Annuler</Btn>
              <Btn variant="primary" full disabled={saving} onClick={save}>{saving ? "..." : modal.mode === "add" ? "Ajouter" : "Enregistrer"}</Btn>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAISSE TAB
// ─────────────────────────────────────────────────────────────────────────────
function exportCSV(orders, restaurant) {
  const rows = [["Date", "Heure", "Table", "ID", "Total (€)", "Paiement"]];
  orders.forEach(o => {
    const d = new Date(o.createdAt);
    rows.push([
      d.toLocaleDateString("fr-FR"),
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      `Table ${o.table}`,
      o.id.slice(0, 6).toUpperCase(),
      o.total.toFixed(2),
      o.payment_method === "card" ? "Carte" : o.payment_method === "apple_pay" ? "Apple Pay" : "Espèces",
    ]);
  });
  const csv = "﻿" + rows.map(r => r.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `caisse-${restaurant.name.replace(/\s+/g, "-")}-${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function CaisseTab({ store, restaurant }) {
  const today = store.doneOrders || [];
  const revenue = store.revenue;
  const avgTicket = today.length > 0 ? revenue / today.length : 0;
  const byMethod = today.reduce((acc, o) => {
    const m = o.payment_method || "cash";
    acc[m] = (acc[m] || 0) + o.total;
    return acc;
  }, {});

  return (
    <div className="fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <KPICard label="CA du jour" value={`${revenue.toFixed(2)} €`} sub="commandes clôturées" />
        <KPICard label="Commandes servies" value={today.length} sub="aujourd'hui" />
        <KPICard label="Ticket moyen" value={avgTicket > 0 ? `${avgTicket.toFixed(2)} €` : "—"} sub="aujourd'hui" />
        <KPICard label="En espèces" value={`${(byMethod.cash || 0).toFixed(2)} €`} sub="à encaisser" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <Surface style={{ padding: "22px 24px" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 18 }}>Répartition des paiements</p>
          {[["💳", "Carte bancaire", byMethod.card || 0], ["💵", "Espèces", byMethod.cash || 0], ["📱", "Apple / Google Pay", (byMethod.apple_pay || 0) + (byMethod.google_pay || 0)]].map(([icon, label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontSize: 14, color: C.dark }}>{label}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{val.toFixed(2)} €</span>
                {revenue > 0 && <span style={{ display: "block", fontSize: 11, color: C.textTertiary }}>{Math.round((val / revenue) * 100)}%</span>}
              </div>
            </div>
          ))}
        </Surface>

        <Surface style={{ padding: "22px 24px" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 18 }}>Actions caisse</p>
          <Btn variant="primary" full onClick={() => exportCSV(today, restaurant)} style={{ marginBottom: 10 }}>
            📊 Exporter CSV du jour
          </Btn>
          <Btn variant="ghost" full onClick={() => window.print()}>
            🖨️ Imprimer le rapport Z
          </Btn>
          {today.length === 0 && (
            <p style={{ color: C.textTertiary, fontSize: 13, textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
              Les commandes clôturées<br />apparaîtront ici.
            </p>
          )}
        </Surface>
      </div>

      <Surface style={{ overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Journal du jour</p>
          <p style={{ fontSize: 13, color: C.textSecondary }}>{today.length} commande{today.length !== 1 ? "s" : ""}</p>
        </div>
        {today.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textTertiary, fontSize: 14 }}>
            Aucune commande clôturée aujourd'hui.<br />
            <span style={{ fontSize: 12 }}>Passez les commandes en "Servie" depuis la vue cuisine.</span>
          </div>
        ) : today.map((o, i) => {
          const pmIcon = o.payment_method === "card" ? "💳" : o.payment_method === "apple_pay" ? "📱" : "💵";
          const pmLabel = o.payment_method === "card" ? "Carte" : o.payment_method === "apple_pay" ? "Apple Pay" : "Espèces";
          return (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 22px", borderBottom: i < today.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: C.dark, flexShrink: 0 }}>T{o.table}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>#{o.id.slice(0, 6).toUpperCase()}</p>
                <p style={{ fontSize: 12, color: C.textSecondary }}>
                  {new Date(o.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  {o.items.length > 0 && ` · ${o.items.slice(0, 2).map(it => it.name).join(", ")}${o.items.length > 2 ? " …" : ""}`}
                </p>
              </div>
              <Tag color={o.payment_method === "card" ? C.accentBlue : o.payment_method === "apple_pay" ? C.accentPurple : C.textSecondary}>
                {pmIcon} {pmLabel}
              </Tag>
              <p style={{ fontWeight: 800, fontSize: 16, color: C.dark, minWidth: 70, textAlign: "right" }}>{o.total.toFixed(2)} €</p>
            </div>
          );
        })}
        {today.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 22px", background: C.bg, borderTop: `2px solid ${C.borderStrong}` }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>Total du jour</p>
            <p style={{ fontWeight: 900, fontSize: 20, color: C.dark, letterSpacing: "-0.03em" }}>{revenue.toFixed(2)} €</p>
          </div>
        )}
      </Surface>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CUISINE VIEW — Supabase Realtime
// ─────────────────────────────────────────────────────────────────────────────
function useLiveOrders(restaurantId, pushNotif) {
  const [orders, setOrders] = useState([]);
  const [served, setServed] = useState([]);
  const [loading, setLoading] = useState(true);

  // Format a raw DB order (with order_items + tables join) into UI shape
  const fmt = useCallback((o) => ({
    id: o.id,
    table: o.tables?.number ?? "?",
    note: o.note || "",
    status: o.status === "PENDING" ? "new" : o.status === "PREPARING" ? "cooking" : o.status === "READY" ? "ready" : "served",
    elapsed: Math.max(0, Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000)),
    items: (o.order_items || []).map(oi => ({
      id: oi.id,
      name: oi.menu_items?.name ?? "Plat",
      emoji: oi.menu_items?.emoji ?? "🍽",
      qty: oi.quantity,
      detail: oi.detail || "",
      cat: oi.menu_items?.category ?? "",
      done: false,
    })),
    createdAt: o.created_at,
  }), []);

  async function fetchOrders() {
    const { data } = await supabase
      .from("orders")
      .select("*, tables(number), order_items(*, menu_items(name, emoji, category))")
      .eq("restaurant_id", restaurantId)
      .neq("status", "DONE")
      .order("created_at", { ascending: true });
    setOrders((data ?? []).map(fmt));
    setLoading(false);
  }

  useEffect(() => {
    if (!restaurantId) return;
    fetchOrders();

    // Keep item done-state across realtime merges
    const doneSets = {};

    const channel = supabase
      .channel(`kitchen-${restaurantId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        async (payload) => {
          // Fetch full order with joins
          const { data } = await supabase
            .from("orders")
            .select("*, tables(number), order_items(*, menu_items(name, emoji, category))")
            .eq("id", payload.new.id)
            .single();
          if (!data) return;
          const order = fmt(data);
          setOrders(prev => [order, ...prev]);
          pushNotif(`Nouvelle commande — Table ${order.table}`, "new");
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        async (payload) => {
          if (payload.new.status === "DONE") {
            setOrders(prev => {
              const found = prev.find(o => o.id === payload.new.id);
              if (found) setServed(s => [{ ...found, status: "served" }, ...s.slice(0, 9)]);
              return prev.filter(o => o.id !== payload.new.id);
            });
            return;
          }
          const { data } = await supabase
            .from("orders")
            .select("*, tables(number), order_items(*, menu_items(name, emoji, category))")
            .eq("id", payload.new.id)
            .single();
          if (!data) return;
          const updated = fmt(data);
          setOrders(prev => prev.map(o => {
            if (o.id !== updated.id) return o;
            // Preserve item done-state
            const doneIds = doneSets[o.id] || new Set(o.items.filter(i => i.done).map(i => i.id));
            doneSets[o.id] = doneIds;
            return { ...updated, items: updated.items.map(i => ({ ...i, done: doneIds.has(i.id) })) };
          }));
          const labels = { cooking: "en cuisine", ready: "prête à servir" };
          if (labels[updated.status]) pushNotif(`Table ${updated.table} — Commande ${labels[updated.status]}`, updated.status === "ready" ? "warning" : "info");
        }
      )
      .subscribe();

    // Tick elapsed time every minute
    const tick = setInterval(() => {
      setOrders(prev => prev.map(o => ({ ...o, elapsed: Math.max(0, Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000)) })));
    }, 60000);

    return () => { supabase.removeChannel(channel); clearInterval(tick); };
  }, [restaurantId]);

  const advanceOrder = useCallback(async (id) => {
    const next = { new: "PREPARING", cooking: "READY", ready: "DONE" };
    setOrders(prev => {
      const o = prev.find(x => x.id === id);
      if (!o || !next[o.status]) return prev;
      supabase.from("orders").update({ status: next[o.status] }).eq("id", id).then(() => {});
      return prev; // realtime update will handle the state change
    });
  }, []);

  const toggleItem = useCallback((orderId, itemId) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, items: o.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) } : o
    ));
  }, []);

  return { orders, served, loading, advanceOrder, toggleItem };
}

function CuisineView({ restaurant, onBack }) {
  const store = useContext(StoreCtx);
  const { orders, served, loading, advanceOrder, toggleItem } = useLiveOrders(restaurant.id, store.pushNotif);
  const [clock, setClock] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);

  const COLS = [
    { key: "new", label: "Nouvelles", color: "#0071E3", orders: orders.filter(o => o.status === "new") },
    { key: "cooking", label: "En cuisine", color: "#FF9F0A", orders: orders.filter(o => o.status === "cooking") },
    { key: "ready", label: "Prêtes ✓", color: "#34C759", orders: orders.filter(o => o.status === "ready") },
  ];
  const btn = { new: "Accepter →", cooking: "Prête ✓", ready: "Servie ✓" };

  return (
    <div style={{ background: "#F5F5F7", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Figtree', -apple-system, sans-serif" }}>
      <style>{css}</style>
      <Toasts notifs={store.notifications} />
      <header style={{ background: C.dark, height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "7px 14px", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 13, fontWeight: 500, ...FF }}>← Dashboard</button>
          <Logo size={16} dark={false} />
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>{restaurant.emoji} {restaurant.name}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(52,199,89,0.2)", border: "1px solid rgba(52,199,89,0.3)", padding: "4px 10px", borderRadius: 20 }}>
            <Dot color={C.accentGreen} pulse /><span style={{ color: C.accentGreen, fontSize: 11, fontWeight: 600 }}>EN DIRECT</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {COLS.map(c => (
            <div key={c.key} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: c.orders.length > 0 ? c.color : "rgba(255,255,255,0.2)", lineHeight: 1 }}>{c.orders.length}</p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 3, letterSpacing: "0.05em" }}>{c.label.toUpperCase()}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 26, fontWeight: 800, color: C.white, letterSpacing: "0.02em", lineHeight: 1 }}>{clock.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{clock.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</p>
        </div>
      </header>

      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: C.white, borderRadius: "50%", animation: "ring 0.8s linear infinite" }} />
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Chargement des commandes…</span>
        </div>
      ) : (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, padding: 12, overflow: "auto" }}>
          {COLS.map(col => (
            <div key={col.key} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: C.white, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{col.label}</span>
                </div>
                <span style={{ background: col.color + "15", color: col.color, fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>{col.orders.length}</span>
              </div>
              {col.orders.length === 0 && <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: 28, textAlign: "center", color: C.textTertiary, fontSize: 13 }}>Aucune commande</div>}
              {col.orders.sort((a, b) => b.elapsed - a.elapsed).map(order => {
                const doneCount = order.items.filter(i => i.done).length;
                const allDone = doneCount === order.items.length;
                const isLate = order.elapsed >= 20 && order.status !== "ready";
                const canAdvance = order.status !== "cooking" || allDone;
                return (
                  <div key={order.id} className="slide-up" style={{ background: C.white, border: `1.5px solid ${isLate ? C.accent : order.status === "ready" ? C.accentGreen : C.border}`, borderRadius: 14, overflow: "hidden", boxShadow: order.status === "ready" ? `0 0 0 3px ${C.accentGreen}20` : "none" }}>
                    <div style={{ background: order.status === "ready" ? C.accentGreen : isLate ? C.accent : C.dark, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 30, fontWeight: 900, color: C.white, lineHeight: 1 }}>{order.table}</span>
                        <div><p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>TABLE</p><p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{order.id.slice(0, 6)}</p></div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color: C.white, lineHeight: 1 }}>{order.elapsed}<span style={{ fontSize: 12, opacity: 0.6 }}>min</span></p>
                        {isLate && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>⚠ RETARD</p>}
                      </div>
                    </div>
                    {order.note && <div style={{ background: "#FFF8E1", borderBottom: "1px solid #FFE082", padding: "7px 16px", fontSize: 13, fontWeight: 600, color: "#7A5C00" }}>⚠ {order.note}</div>}
                    <div style={{ padding: "10px 12px" }}>
                      {order.items.map(item => (
                        <div key={item.id} onClick={() => order.status !== "new" && toggleItem(order.id, item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, marginBottom: 4, background: item.done ? C.accentGreen + "10" : C.bg, cursor: order.status !== "new" ? "pointer" : "default", border: `1px solid ${item.done ? C.accentGreen + "30" : C.border}`, transition: "all 0.15s" }}>
                          {order.status !== "new" && (
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: item.done ? C.accentGreen : C.white, border: `1.5px solid ${item.done ? C.accentGreen : C.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {item.done && <span style={{ color: C.white, fontSize: 12, fontWeight: 900 }}>✓</span>}
                            </div>
                          )}
                          <div style={{ width: 26, height: 26, borderRadius: 7, background: item.done ? C.accentGreen + "20" : C.dark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ color: item.done ? C.accentGreen : C.white, fontWeight: 800, fontSize: 12 }}>×{item.qty}</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: item.done ? C.textTertiary : C.dark, textDecoration: item.done ? "line-through" : "none" }}>{item.emoji} {item.name}</p>
                            {item.detail && <p style={{ fontSize: 11, color: C.accentOrange, fontWeight: 600 }}>{item.detail}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {order.status === "cooking" && (
                      <div style={{ padding: "0 12px 8px" }}>
                        <div style={{ height: 4, background: C.bg, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 2, background: allDone ? C.accentGreen : C.accentOrange, width: `${order.items.length ? (doneCount / order.items.length) * 100 : 0}%`, transition: "width 0.4s ease" }} />
                        </div>
                        <p style={{ textAlign: "right", fontSize: 10, color: C.textTertiary, marginTop: 3, fontWeight: 600 }}>{doneCount}/{order.items.length} prêts</p>
                      </div>
                    )}
                    <div style={{ padding: "6px 12px 12px" }}>
                      <button onClick={() => canAdvance && advanceOrder(order.id)} className="btn-press" style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: !canAdvance ? C.bg : order.status === "ready" ? C.accentGreen : C.dark, color: !canAdvance ? C.textTertiary : C.white, fontSize: 14, fontWeight: 700, cursor: canAdvance ? "pointer" : "not-allowed", transition: "all 0.15s", ...FF }}>
                        {!canAdvance ? `${order.items.length - doneCount} élément${order.items.length - doneCount > 1 ? "s" : ""} restant${order.items.length - doneCount > 1 ? "s" : ""}` : btn[order.status]}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {served.length > 0 && (
        <div style={{ background: C.dark, borderTop: "1px solid rgba(255,255,255,0.08)", padding: "10px 20px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>SERVIES</span>
          {served.slice(0, 6).map((o, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "5px 10px" }}>
              <span style={{ color: C.accentGreen, fontWeight: 700, fontSize: 13 }}>T{o.table}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE CARD FORM
// ─────────────────────────────────────────────────────────────────────────────
function CardPaymentForm({ total, onSuccess, onCancel }) {
  const containerRef = useRef(null);
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  useEffect(() => {
    if (!STRIPE_KEY) { setReady(true); return; }

    const init = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
          { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }, body: JSON.stringify({ amount: total }) }
        );
        const { client_secret, error: fnErr } = await res.json();
        if (fnErr || !client_secret) throw new Error(fnErr || "Pas de client_secret");
        const stripe = window.Stripe(STRIPE_KEY);
        stripeRef.current = stripe;
        const elements = stripe.elements({ clientSecret: client_secret, appearance: { theme: "flat", variables: { borderRadius: "12px", fontFamily: "'Figtree', sans-serif" } } });
        const payEl = elements.create("payment");
        if (containerRef.current) payEl.mount(containerRef.current);
        elementsRef.current = elements;
        setReady(true);
      } catch (e) {
        setError("Impossible de charger le module de paiement. Vérifiez votre connexion.");
        setReady(true);
      }
    };

    if (window.Stripe) {
      init();
    } else {
      const check = setInterval(() => { if (window.Stripe) { clearInterval(check); init(); } }, 100);
      return () => clearInterval(check);
    }
  }, [total, STRIPE_KEY]);

  async function pay() {
    if (!STRIPE_KEY) { await onSuccess("card"); return; }
    if (!stripeRef.current || !elementsRef.current || paying) return;
    setPaying(true); setError("");
    const { error: err, paymentIntent } = await stripeRef.current.confirmPayment({ elements: elementsRef.current, redirect: "if_required" });
    if (err) { setError(err.message); setPaying(false); return; }
    if (paymentIntent?.status === "succeeded") await onSuccess("card");
  }

  if (!ready) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
      <div style={{ width: 18, height: 18, border: `2px solid ${C.dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ring 0.8s linear infinite" }} />
      <span style={{ fontSize: 14, color: C.textSecondary }}>Chargement du paiement…</span>
    </div>
  );

  return (
    <div>
      {!STRIPE_KEY && (
        <div style={{ background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#7A5C00" }}>
          ⚠️ Mode test — ajoutez VITE_STRIPE_PUBLISHABLE_KEY pour activer les vrais paiements
        </div>
      )}
      <div ref={containerRef} style={{ marginBottom: 16, minHeight: STRIPE_KEY ? 80 : 0 }} />
      {error && <p style={{ color: C.accent, fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <button onClick={pay} disabled={paying} style={{ width: "100%", padding: 16, background: C.dark, color: C.white, border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: paying ? "not-allowed" : "pointer", marginBottom: 10, ...FF, opacity: paying ? 0.6 : 1 }}>
        {paying ? "Traitement en cours…" : `Payer ${total.toFixed(2)} €`}
      </button>
      <button onClick={onCancel} style={{ width: "100%", padding: 14, background: "transparent", color: C.textSecondary, border: `1.5px solid ${C.border}`, borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: "pointer", ...FF }}>
        Annuler
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT VIEW — preview with real menu
// ─────────────────────────────────────────────────────────────────────────────
function ClientView({ restaurant, onBack }) {
  const [step, setStep] = useState("menu");
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [cart, setCart] = useState([]);
  const [activeCat, setActiveCat] = useState("Tous");
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(0);
  const [payMode, setPayMode] = useState(null);
  const tableNum = 1;

  useEffect(() => {
    supabase.from("menu_items").select("*")
      .eq("restaurant_id", restaurant.id).eq("available", true)
      .order("category").order("name")
      .then(({ data }) => { setMenuItems(data ?? []); setLoadingMenu(false); });
  }, [restaurant.id]);

  const cats = ["Tous", ...Array.from(new Set(menuItems.map(i => i.category)))];
  const filtered = activeCat === "Tous" ? menuItems : menuItems.filter(i => i.category === activeCat);
  const total = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const add = item => setCart(p => { const e = p.find(i => i.id === item.id); return e ? p.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) : [...p, { ...item, qty: 1 }]; });
  const rem = id => setCart(p => { const e = p.find(i => i.id === id); return e.qty === 1 ? p.filter(i => i.id !== id) : p.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i); });

  async function confirmOrder(paymentMethod = "cash") {
    const { data: tbl } = await supabase.from("tables").select("id").eq("restaurant_id", restaurant.id).eq("number", tableNum).single();
    const { data: order } = await supabase.from("orders")
      .insert({ restaurant_id: restaurant.id, table_id: tbl?.id, note, total, status: "PENDING", payment_method: paymentMethod })
      .select().single();
    if (!order) return;
    await supabase.from("order_items").insert(cart.map(i => ({ order_id: order.id, menu_item_id: i.id, quantity: i.qty, detail: "" })));
    setStep("done"); setPayMode(null);
  }

  const Frame = ({ children }) => (
    <div style={{ background: "#0A0A0B", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", ...FF }}>
      <style>{css + `@keyframes fadeup{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ width: "100%", maxWidth: 430, padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 20, padding: "7px 16px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13, ...FF }}>← Dashboard</button>
        <div style={{ background: "rgba(255,59,95,0.15)", border: "1px solid rgba(255,59,95,0.3)", borderRadius: 20, padding: "5px 12px" }}>
          <span style={{ color: C.accent, fontSize: 11, fontWeight: 600 }}>📱 PREVIEW CLIENT</span>
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: 375, margin: "14px auto 24px", background: "#1C1C1E", borderRadius: 44, padding: 8, boxShadow: "0 40px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)" }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", width: 80, height: 20, background: "#1C1C1E", borderRadius: 20, zIndex: 10 }} />
          <div style={{ background: "#fff", borderRadius: 36, overflow: "hidden", minHeight: 680 }}>{children}</div>
        </div>
      </div>
    </div>
  );

  if (step === "menu") return (
    <Frame>
      <div style={{ background: C.dark, padding: "48px 20px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{restaurant.emoji}</span>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{restaurant.name}</p>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: C.white }}>Table {tableNum}</p>
          </div>
          {count > 0 && <button onClick={() => setStep("cart")} style={{ background: C.accent, border: "none", borderRadius: 20, padding: "9px 16px", color: C.white, fontWeight: 700, fontSize: 13, cursor: "pointer", ...FF }}>🛒 {count} · {total.toFixed(2)}€</button>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto", background: C.dark, scrollbarWidth: "none" }}>
        {cats.map(c => <button key={c} onClick={() => setActiveCat(c)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 20, border: "none", background: activeCat === c ? C.white : "rgba(255,255,255,0.1)", color: activeCat === c ? C.dark : "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: 12, cursor: "pointer", ...FF }}>{c}</button>)}
      </div>
      {loadingMenu ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <div style={{ width: 20, height: 20, border: `2px solid ${C.dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ring 0.8s linear infinite" }} />
        </div>
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 440 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: C.textTertiary, fontSize: 14 }}>Aucun plat disponible</div>
          ) : filtered.map(item => {
            const inCart = cart.find(i => i.id === item.id);
            return (
              <div key={item.id} style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: `1px solid ${C.border}`, animation: "fadeup 0.2s ease" }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{item.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>{item.name}</p>
                      {item.is_popular && <span style={{ background: C.accent + "15", color: C.accent, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, display: "inline-block", marginTop: 2 }}>⭐ Populaire</span>}
                    </div>
                    <p style={{ fontWeight: 800, fontSize: 15, color: C.dark, flexShrink: 0 }}>{Number(item.price).toFixed(2)}€</p>
                  </div>
                  {item.description && <p style={{ color: C.textSecondary, fontSize: 12, margin: "4px 0 8px", lineHeight: 1.4 }}>{item.description}</p>}
                  {inCart ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => rem(item.id)} style={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${C.borderStrong}`, background: C.white, fontWeight: 900, cursor: "pointer", fontSize: 16, ...FF }}>−</button>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{inCart.qty}</span>
                      <button onClick={() => add(item)} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: C.dark, color: C.white, fontWeight: 900, cursor: "pointer", fontSize: 16, ...FF }}>+</button>
                    </div>
                  ) : (
                    <button onClick={() => add(item)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${C.borderStrong}`, background: C.white, color: C.dark, fontWeight: 600, fontSize: 12, cursor: "pointer", ...FF }}>Ajouter</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {count > 0 && (
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, background: C.white }}>
          <button onClick={() => setStep("cart")} style={{ width: "100%", padding: 14, background: C.dark, color: C.white, border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "space-between", ...FF }}>
            <span>🛒 Voir le panier ({count})</span><span>{total.toFixed(2)}€</span>
          </button>
        </div>
      )}
    </Frame>
  );

  if (step === "cart") return (
    <Frame>
      <div style={{ padding: "48px 20px 0" }}>
        <button onClick={() => setStep("menu")} style={{ background: "none", border: "none", color: C.accent, fontWeight: 600, fontSize: 14, cursor: "pointer", padding: 0, marginBottom: 16, ...FF }}>← Continuer</button>
        <p style={{ fontSize: 26, fontWeight: 800, color: C.dark, letterSpacing: "-0.04em", marginBottom: 20 }}>Mon panier</p>
        {cart.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 22 }}>{item.emoji}</div>
            <div style={{ flex: 1 }}><p style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{item.name}</p><p style={{ color: C.textSecondary, fontSize: 12 }}>{Number(item.price).toFixed(2)}€/u</p></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => rem(item.id)} style={{ width: 26, height: 26, borderRadius: "50%", border: `1.5px solid ${C.border}`, background: C.white, fontWeight: 900, cursor: "pointer", fontSize: 14, ...FF }}>−</button>
              <span style={{ fontWeight: 800, fontSize: 14, minWidth: 16, textAlign: "center" }}>{item.qty}</span>
              <button onClick={() => add(item)} style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: C.dark, color: C.white, fontWeight: 900, cursor: "pointer", fontSize: 14, ...FF }}>+</button>
            </div>
            <p style={{ fontWeight: 800, color: C.dark, minWidth: 40, textAlign: "right" }}>{(Number(item.price) * item.qty).toFixed(2)}€</p>
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <label style={{ color: C.textSecondary, fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6 }}>Note pour la cuisine</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Allergie, cuisson, sans gluten…" style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", fontSize: 13, color: C.dark, resize: "none", height: 64, outline: "none", ...FF }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0" }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: C.dark }}>Total</span>
          <span style={{ fontWeight: 900, fontSize: 22, color: C.dark }}>{total.toFixed(2)}€</span>
        </div>
        <button onClick={() => setStep("payment")} style={{ width: "100%", padding: 15, background: C.dark, color: C.white, border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer", ...FF }}>Paiement →</button>
      </div>
    </Frame>
  );

  if (step === "payment") return (
    <Frame>
      <div style={{ padding: "48px 20px 0" }}>
        <button onClick={() => payMode ? setPayMode(null) : setStep("cart")} style={{ background: "none", border: "none", color: C.accent, fontWeight: 600, fontSize: 14, cursor: "pointer", padding: 0, marginBottom: 16, ...FF }}>← Retour</button>
        <p style={{ fontSize: 26, fontWeight: 800, color: C.dark, letterSpacing: "-0.04em", marginBottom: 4 }}>Paiement</p>
        <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 20 }}>Table {tableNum} · {restaurant.name}</p>
        {!payMode && (
          <div style={{ background: C.bg, borderRadius: 14, padding: 16, marginBottom: 20 }}>
            {cart.map(i => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14, color: C.dark }}><span>{i.emoji} {i.name} ×{i.qty}</span><span style={{ fontWeight: 700 }}>{(Number(i.price) * i.qty).toFixed(2)}€</span></div>)}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1.5px solid ${C.border}`, paddingTop: 10, marginTop: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span><span style={{ fontWeight: 900, fontSize: 20 }}>{total.toFixed(2)}€</span>
            </div>
          </div>
        )}
        {!payMode ? (
          <>
            {[{ icon: "💳", l: "Carte bancaire", s: "Visa, Mastercard, Amex" }, { icon: "📱", l: "Apple Pay / Google Pay", s: "Paiement instantané" }].map(m => (
              <div key={m.l} onClick={() => setPayMode("card")} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, border: `1.5px solid ${C.border}`, borderRadius: 14, marginBottom: 10, cursor: "pointer", transition: "border-color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.dark} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                <div style={{ fontSize: 24 }}>{m.icon}</div>
                <div style={{ flex: 1 }}><p style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>{m.l}</p><p style={{ color: C.textSecondary, fontSize: 12 }}>{m.s}</p></div>
                <span style={{ color: C.textTertiary, fontSize: 18 }}>›</span>
              </div>
            ))}
            <div onClick={() => confirmOrder("cash")} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, border: `1.5px solid ${C.border}`, borderRadius: 14, cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.dark} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ fontSize: 24 }}>💵</div>
              <div style={{ flex: 1 }}><p style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>Espèces</p><p style={{ color: C.textSecondary, fontSize: 12 }}>Le serveur passera à votre table</p></div>
              <span style={{ color: C.textTertiary, fontSize: 18 }}>›</span>
            </div>
          </>
        ) : (
          <CardPaymentForm total={total} onSuccess={confirmOrder} onCancel={() => setPayMode(null)} />
        )}
      </div>
    </Frame>
  );

  return (
    <Frame>
      <div style={{ padding: "52px 24px", textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.accentGreen + "15", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>✅</div>
        <p style={{ fontSize: 26, fontWeight: 900, color: C.dark, letterSpacing: "-0.04em", marginBottom: 8 }}>Commande envoyée !</p>
        <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>En cuisine. Vous serez servi très bientôt.</p>
        <div style={{ background: C.bg, borderRadius: 16, padding: 16, marginBottom: 24, textAlign: "left" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: C.textTertiary, letterSpacing: "0.05em", marginBottom: 10 }}>RÉCAPITULATIF</p>
          {cart.map(i => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: C.dark, marginBottom: 6 }}><span>{i.emoji} {i.name} ×{i.qty}</span><span style={{ fontWeight: 700 }}>{(Number(i.price) * i.qty).toFixed(2)}€</span></div>)}
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 4 }}><span style={{ fontWeight: 700 }}>Total</span><span style={{ fontWeight: 900 }}>{total.toFixed(2)}€</span></div>
        </div>
        <p style={{ fontWeight: 600, fontSize: 14, color: C.dark, marginBottom: 12 }}>Notez votre expérience</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {[1,2,3,4,5].map(s => <button key={s} onClick={() => setRating(s)} style={{ fontSize: 28, background: "none", border: "none", cursor: "pointer", transform: rating >= s ? "scale(1.15)" : "scale(1)", transition: "transform 0.15s", filter: rating >= s ? "none" : "grayscale(1)" }}>⭐</button>)}
        </div>
        {rating > 0 && <p style={{ color: C.accentGreen, fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Merci pour votre avis ! 🙏</p>}
        <button onClick={() => { setStep("menu"); setCart([]); setRating(0); setNote(""); }} style={{ width: "100%", padding: 14, background: C.dark, color: C.white, border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", ...FF }}>Commander à nouveau</button>
      </div>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT CHAT — floating AI assistant
// ─────────────────────────────────────────────────────────────────────────────
const QUICK_SUGGESTIONS = [
  "📦 Comment gérer mon stock ?",
  "📊 Comment lire ma caisse ?",
  "🍽️ Conseils pour ma carte",
  "💳 Comment activer Stripe ?",
  "📱 Comment distribuer mes QR codes ?",
];

function AgentChat({ restaurant, store }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: `Bonjour ! Je suis Velvet, votre assistant IA 👋\n\nJe connais toutes les fonctionnalités de VelvetGuest et je peux vous conseiller sur votre carte, vos stocks, votre caisse et bien plus.\n\nComment puis-je vous aider ?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const lowStockCount = (store.orders || []).length;
  const context = [
    `Restaurant: ${restaurant.name}`,
    `Commandes actives en ce moment: ${store.orders?.length ?? 0}`,
    `CA du jour: ${(store.revenue || 0).toFixed(2)}€`,
    `Commandes servies aujourd'hui: ${store.doneOrders?.length ?? 0}`,
    `Ticket moyen: ${store.doneOrders?.length > 0 ? (store.revenue / store.doneOrders.length).toFixed(2) : 0}€`,
  ].join("\n");

  async function send(text) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    const userMsg = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-agent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ messages: history, context }),
        }
      );
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.content || "Désolé, une erreur est survenue." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Désolé, je ne suis pas disponible pour le moment. Réessayez dans un instant." }]);
    } finally {
      setLoading(false);
    }
  }

  const showSuggestions = messages.length <= 1;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(p => !p)}
        className="btn-press"
        title={open ? "Fermer l'assistant" : "Ouvrir l'assistant IA"}
        style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, width: 52, height: 52, borderRadius: "50%", background: open ? C.textSecondary : C.dark, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", fontSize: 22, transition: "background 0.2s ease", ...FF }}
      >
        <span style={{ transition: "transform 0.2s ease", display: "block", transform: open ? "rotate(45deg)" : "none" }}>
          {open ? "✕" : "✨"}
        </span>
        {!open && store.orders?.length > 0 && (
          <span style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, background: C.accent, borderRadius: "50%", border: "2px solid #fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            {store.orders.length}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{ position: "fixed", bottom: 88, right: 24, zIndex: 999, width: 360, height: 520, background: C.surface, borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", animation: "slideUp 0.25s ease", overflow: "hidden", ...FF }}>

          {/* Header */}
          <div style={{ padding: "14px 18px", background: C.dark, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✨</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.white, letterSpacing: "-0.01em" }}>Velvet — Assistant IA</p>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <Dot color={C.accentGreen} pulse />
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Prêt à vous aider</p>
              </div>
            </div>
            <button onClick={() => { if (confirm("Effacer la conversation ?")) setMessages([{ role: "assistant", content: "Conversation réinitialisée. Comment puis-je vous aider ?" }]); }} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, padding: "5px 10px", color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer", ...FF }}>
              Effacer
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 4px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 7 }}>
                {m.role === "assistant" && (
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: C.dark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginBottom: 2 }}>✨</div>
                )}
                <div style={{ maxWidth: "82%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px", background: m.role === "user" ? C.dark : C.bg, color: m.role === "user" ? C.white : C.dark, fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: C.dark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>✨</div>
                <div style={{ background: C.bg, borderRadius: "4px 16px 16px 16px", padding: "12px 16px", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: C.textTertiary, animation: `pulse 1.4s ease-in-out ${j * 0.18}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions */}
          {showSuggestions && !loading && (
            <div style={{ padding: "8px 14px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: `1px solid ${C.border}` }}>
              {QUICK_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{ padding: "5px 10px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, fontSize: 11, color: C.textSecondary, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", ...FF }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.dark; e.currentTarget.style.color = C.white; e.currentTarget.style.borderColor = C.dark; }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.borderColor = C.border; }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "10px 14px 14px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Posez votre question…"
              disabled={loading}
              style={{ flex: 1, background: C.bg, border: `1.5px solid ${input ? C.borderStrong : "transparent"}`, borderRadius: 12, padding: "10px 14px", fontSize: 13, color: C.dark, outline: "none", transition: "border-color 0.15s", ...FF }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{ width: 38, height: 38, borderRadius: 10, background: input.trim() && !loading ? C.dark : C.bg, border: "none", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}
            >
              <span style={{ fontSize: 16, color: input.trim() && !loading ? C.white : C.textTertiary, lineHeight: 1 }}>↑</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER PAGE — public, no auth, opened by scanning QR code
// ─────────────────────────────────────────────────────────────────────────────
function CustomerPage({ slug, tableNum }) {
  const [step, setStep] = useState("loading"); // loading | menu | cart | payment | done | error
  const [restaurant, setRestaurant] = useState(null);
  const [tableId, setTableId] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCat, setActiveCat] = useState("Tous");
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(0);
  const [orderId, setOrderId] = useState(null);
  const [payMode, setPayMode] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: resto } = await supabase.from("restaurants").select("*").eq("slug", slug).single();
      if (!resto) { setStep("error"); return; }
      setRestaurant(resto);
      const { data: tbl } = await supabase.from("tables").select("id").eq("restaurant_id", resto.id).eq("number", tableNum).single();
      setTableId(tbl?.id ?? null);
      const { data: items } = await supabase.from("menu_items").select("*").eq("restaurant_id", resto.id).eq("available", true).order("category").order("name");
      setMenuItems(items ?? []);
      setStep("menu");
    }
    load();
  }, [slug, tableNum]);

  const cats = ["Tous", ...Array.from(new Set(menuItems.map(i => i.category)))];
  const filtered = activeCat === "Tous" ? menuItems : menuItems.filter(i => i.category === activeCat);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  const add = item => setCart(p => { const e = p.find(i => i.id === item.id); return e ? p.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) : [...p, { ...item, qty: 1 }]; });
  const rem = id => setCart(p => { const e = p.find(i => i.id === id); return e.qty === 1 ? p.filter(i => i.id !== id) : p.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i); });

  async function confirm(paymentMethod = "cash") {
    const { data: order, error } = await supabase.from("orders")
      .insert({ restaurant_id: restaurant.id, table_id: tableId, note, total, status: "PENDING", payment_method: paymentMethod })
      .select().single();
    if (error || !order) { alert("Erreur lors de la commande. Réessayez."); return; }
    const orderItems = cart.map(i => ({ order_id: order.id, menu_item_id: i.id, quantity: i.qty, detail: "" }));
    await supabase.from("order_items").insert(orderItems);
    // Decrement stock for items with tracked stock
    for (const item of cart) {
      if (item.stock != null && item.stock > 0) {
        const newStock = Math.max(0, item.stock - item.qty);
        await supabase.from("menu_items").update({ stock: newStock, available: newStock > 0 }).eq("id", item.id);
      }
    }
    setOrderId(order.id);
    setStep("done");
  }

  const bg = step === "loading" || step === "error" ? C.bg : "#fff";

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Figtree', -apple-system, sans-serif", maxWidth: 480, margin: "0 auto" }}>
      <style>{css}</style>

      {step === "loading" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16 }}>
          <Logo size={20} />
          <div style={{ width: 20, height: 20, border: `2px solid ${C.dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ring 0.8s linear infinite" }} />
        </div>
      )}

      {step === "error" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <p style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Restaurant introuvable</p>
          <p style={{ color: C.textSecondary, fontSize: 14 }}>Ce QR code n'est plus valide.</p>
        </div>
      )}

      {step === "menu" && (
        <>
          <div style={{ background: C.dark, padding: "52px 20px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 22 }}>{restaurant.logo_emoji}</span>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{restaurant.name}</p>
                </div>
                <p style={{ fontSize: 26, fontWeight: 800, color: C.white, letterSpacing: "-0.03em" }}>Table {tableNum}</p>
              </div>
              {count > 0 && <button onClick={() => setStep("cart")} style={{ background: C.accent, border: "none", borderRadius: 20, padding: "10px 18px", color: C.white, fontWeight: 700, fontSize: 14, cursor: "pointer", ...FF }}>🛒 {count} · {total.toFixed(2)}€</button>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto", background: C.dark, scrollbarWidth: "none" }}>
            {cats.map(c => <button key={c} onClick={() => setActiveCat(c)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 20, border: "none", background: activeCat === c ? C.white : "rgba(255,255,255,0.1)", color: activeCat === c ? C.dark : "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: 12, cursor: "pointer", ...FF }}>{c}</button>)}
          </div>
          <div>
            {filtered.map(item => {
              const inCart = cart.find(i => i.id === item.id);
              return (
                <div key={item.id} style={{ display: "flex", gap: 12, padding: "16px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 60, height: 60, borderRadius: 14, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>{item.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{item.name}</p>
                        {item.is_popular && <span style={{ background: C.accent + "15", color: C.accent, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, display: "inline-block", marginTop: 3 }}>⭐ Populaire</span>}
                      </div>
                      <p style={{ fontWeight: 800, fontSize: 16, color: C.dark, flexShrink: 0, marginLeft: 8 }}>{Number(item.price).toFixed(2)}€</p>
                    </div>
                    {item.description && <p style={{ color: C.textSecondary, fontSize: 13, margin: "5px 0 10px", lineHeight: 1.4 }}>{item.description}</p>}
                    {inCart ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={() => rem(item.id)} style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${C.borderStrong}`, background: C.white, fontWeight: 900, cursor: "pointer", fontSize: 18, ...FF }}>−</button>
                        <span style={{ fontWeight: 800, fontSize: 16 }}>{inCart.qty}</span>
                        <button onClick={() => add(item)} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: C.dark, color: C.white, fontWeight: 900, cursor: "pointer", fontSize: 18, ...FF }}>+</button>
                      </div>
                    ) : (
                      <button onClick={() => add(item)} style={{ padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${C.borderStrong}`, background: C.white, color: C.dark, fontWeight: 600, fontSize: 13, cursor: "pointer", ...FF }}>Ajouter</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {count > 0 && (
            <div style={{ position: "sticky", bottom: 0, padding: "12px 16px", background: C.white, borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setStep("cart")} style={{ width: "100%", padding: 16, background: C.dark, color: C.white, border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "space-between", ...FF }}>
                <span>🛒 Voir le panier ({count})</span><span>{total.toFixed(2)}€</span>
              </button>
            </div>
          )}
        </>
      )}

      {step === "cart" && (
        <div style={{ padding: "40px 20px 24px" }}>
          <button onClick={() => setStep("menu")} style={{ background: "none", border: "none", color: C.accent, fontWeight: 600, fontSize: 15, cursor: "pointer", padding: 0, marginBottom: 20, ...FF }}>← Continuer mes achats</button>
          <p style={{ fontSize: 28, fontWeight: 800, color: C.dark, letterSpacing: "-0.04em", marginBottom: 24 }}>Mon panier</p>
          {cart.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 26 }}>{item.emoji}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 15, color: C.dark }}>{item.name}</p>
                <p style={{ color: C.textSecondary, fontSize: 13 }}>{Number(item.price).toFixed(2)}€/u</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => rem(item.id)} style={{ width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${C.border}`, background: C.white, fontWeight: 900, cursor: "pointer", fontSize: 16, ...FF }}>−</button>
                <span style={{ fontWeight: 800, fontSize: 16, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                <button onClick={() => add(item)} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: C.dark, color: C.white, fontWeight: 900, cursor: "pointer", fontSize: 16, ...FF }}>+</button>
              </div>
              <p style={{ fontWeight: 800, color: C.dark, minWidth: 52, textAlign: "right" }}>{(Number(item.price) * item.qty).toFixed(2)}€</p>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <label style={{ color: C.textSecondary, fontSize: 13, fontWeight: 500, display: "block", marginBottom: 8 }}>Note pour la cuisine (allergies, cuisson…)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: sans gluten, viande bien cuite…" rows={3} style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "12px 14px", fontSize: 14, color: C.dark, resize: "none", outline: "none", ...FF }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0" }}>
            <span style={{ fontWeight: 700, fontSize: 18, color: C.dark }}>Total</span>
            <span style={{ fontWeight: 900, fontSize: 24, color: C.dark, letterSpacing: "-0.03em" }}>{total.toFixed(2)}€</span>
          </div>
          <button onClick={() => setStep("payment")} style={{ width: "100%", padding: 16, background: C.dark, color: C.white, border: "none", borderRadius: 14, fontSize: 17, fontWeight: 700, cursor: "pointer", ...FF }}>Paiement →</button>
        </div>
      )}

      {step === "payment" && (
        <div style={{ padding: "40px 20px 24px" }}>
          <button onClick={() => payMode ? setPayMode(null) : setStep("cart")} style={{ background: "none", border: "none", color: C.accent, fontWeight: 600, fontSize: 15, cursor: "pointer", padding: 0, marginBottom: 20, ...FF }}>← Retour</button>
          <p style={{ fontSize: 28, fontWeight: 800, color: C.dark, letterSpacing: "-0.04em", marginBottom: 6 }}>Paiement</p>
          <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 24 }}>Table {tableNum} · {restaurant?.name}</p>
          {!payMode && (
            <div style={{ background: C.bg, borderRadius: 16, padding: 18, marginBottom: 24 }}>
              {cart.map(i => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 15, color: C.dark }}><span>{i.emoji} {i.name} ×{i.qty}</span><span style={{ fontWeight: 700 }}>{(Number(i.price) * i.qty).toFixed(2)}€</span></div>)}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1.5px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 17 }}>Total</span><span style={{ fontWeight: 900, fontSize: 22 }}>{total.toFixed(2)}€</span>
              </div>
            </div>
          )}
          {!payMode ? (
            <>
              {[{ icon: "💳", l: "Carte bancaire", s: "Visa, Mastercard, Amex" }, { icon: "📱", l: "Apple Pay / Google Pay", s: "Paiement instantané" }].map(m => (
                <div key={m.l} onClick={() => setPayMode("card")} style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, border: `1.5px solid ${C.border}`, borderRadius: 16, marginBottom: 12, cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.dark; e.currentTarget.style.background = C.bg; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "#fff"; }}>
                  <div style={{ fontSize: 26 }}>{m.icon}</div>
                  <div style={{ flex: 1 }}><p style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{m.l}</p><p style={{ color: C.textSecondary, fontSize: 13 }}>{m.s}</p></div>
                  <span style={{ color: C.textTertiary, fontSize: 20 }}>›</span>
                </div>
              ))}
              <div onClick={() => confirm("cash")} style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, border: `1.5px solid ${C.border}`, borderRadius: 16, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.dark; e.currentTarget.style.background = C.bg; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "#fff"; }}>
                <div style={{ fontSize: 26 }}>💵</div>
                <div style={{ flex: 1 }}><p style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>Espèces</p><p style={{ color: C.textSecondary, fontSize: 13 }}>Le serveur passera à votre table</p></div>
                <span style={{ color: C.textTertiary, fontSize: 20 }}>›</span>
              </div>
            </>
          ) : (
            <CardPaymentForm total={total} onSuccess={confirm} onCancel={() => setPayMode(null)} />
          )}
        </div>
      )}

      {step === "done" && (
        <div style={{ padding: "60px 24px 40px", textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.accentGreen + "15", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 36 }}>✅</div>
          <p style={{ fontSize: 28, fontWeight: 900, color: C.dark, letterSpacing: "-0.04em", marginBottom: 10 }}>Commande envoyée !</p>
          <p style={{ color: C.textSecondary, fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>Votre commande est en cuisine.<br />Nous vous apportons ça très bientôt !</p>
          <div style={{ background: C.bg, borderRadius: 18, padding: 20, marginBottom: 28, textAlign: "left" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, letterSpacing: "0.08em", marginBottom: 12 }}>VOTRE COMMANDE</p>
            {cart.map(i => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: C.dark, marginBottom: 8 }}><span>{i.emoji} {i.name} ×{i.qty}</span><span style={{ fontWeight: 700 }}>{(Number(i.price) * i.qty).toFixed(2)}€</span></div>)}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 6 }}><span style={{ fontWeight: 700 }}>Total payé</span><span style={{ fontWeight: 900 }}>{total.toFixed(2)}€</span></div>
          </div>
          <p style={{ fontWeight: 700, fontSize: 16, color: C.dark, marginBottom: 14 }}>Comment s'est passée votre expérience ?</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 28 }}>
            {[1,2,3,4,5].map(s => <button key={s} onClick={() => setRating(s)} style={{ fontSize: 32, background: "none", border: "none", cursor: "pointer", transform: rating >= s ? "scale(1.2)" : "scale(1)", transition: "transform 0.15s", filter: rating >= s ? "none" : "grayscale(1)" }}>⭐</button>)}
          </div>
          {rating > 0 && <p style={{ color: C.accentGreen, fontWeight: 600, fontSize: 15, marginBottom: 20 }}>Merci pour votre avis ! 🙏</p>}
          <button onClick={() => { setStep("menu"); setCart([]); setNote(""); setRating(0); }} style={{ width: "100%", padding: 16, background: C.bg, color: C.dark, border: `1.5px solid ${C.border}`, borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", ...FF }}>Commander autre chose</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT — Supabase session restore
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // Route public customer pages before any auth check
  const customerMatch = window.location.pathname.match(/^\/r\/([^/]+)\/t\/(\d+)/);
  if (customerMatch) {
    return <CustomerPage slug={customerMatch[1]} tableNum={Number(customerMatch[2])} />;
  }
  const [page, setPage] = useState("loading");
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const store = useStore(restaurant?.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const u = data.session.user;
        setUser({ id: u.id, name: u.user_metadata?.name || u.email.split("@")[0], email: u.email });
        setPage("restaurants");
      } else {
        setPage("signup");
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) { setUser(null); setPage("signup"); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null); setRestaurant(null); setPage("signup");
  }

  if (page === "loading") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{css}</style>
      <Logo size={20} />
    </div>
  );

  return (
    <StoreCtx.Provider value={store}>
      {page === "signup" && <SignupPage onDone={u => { setUser(u); setPage("restaurants"); }} />}
      {page === "restaurants" && user && <RestaurantsPage user={user} onSelect={r => { setRestaurant(r); setPage("dashboard"); }} onLogout={handleLogout} />}
      {page === "dashboard" && restaurant && <DashboardPage user={user} restaurant={restaurant} onBack={() => setPage("restaurants")} onCuisine={() => setPage("cuisine")} onClient={() => setPage("client")} />}
      {page === "cuisine" && restaurant && <CuisineView restaurant={restaurant} onBack={() => setPage("dashboard")} />}
      {page === "client" && restaurant && <ClientView restaurant={restaurant} onBack={() => setPage("dashboard")} />}
    </StoreCtx.Provider>
  );
}
