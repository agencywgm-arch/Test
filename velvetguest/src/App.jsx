import { useState, useEffect, useRef, useCallback, createContext, useContext, Component } from "react";
import { supabase } from "./lib/supabase";
import QRCode from "qrcode";

// Base path for QR URL generation — injected at build time, empty on Vercel
const BASE_PATH = (import.meta.env.VITE_BASE_PATH || "").replace(/\/$/, "");
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
// Public VAPID key for Web Push ("order ready" notifications that reach the
// customer even with their screen locked). Safe to keep in client code —
// it's the public half of the keypair, the private half lives only in the
// Supabase Edge Function secrets.
const VAPID_PUBLIC_KEY = "BKMc2k5d8Y6UwsSuX1HqYUCG6f4YVs219OYoXGxeyP4zwRrGhcBKB0dy6wDsvayv8EzmV9vBDR6L2LIdIOLwY3c";
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
// Registers the Service Worker (if not already) and subscribes this browser
// to Web Push, then saves the subscription tied to this order_id so the
// Edge Function knows where to deliver the "order ready" push later.
async function subscribeToOrderReadyPush(orderId) {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !orderId) return;
    const reg = await navigator.serviceWorker.register(`${BASE_PATH}/sw.js`);
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const json = sub.toJSON();
    await supabase.from("push_subscriptions").upsert({
      order_id: orderId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    }, { onConflict: "order_id,endpoint" });
  } catch {
    // Push isn't supported on this browser, or the table/permission isn't
    // set up yet — the rest of the alert system (sound + vibration) still
    // works regardless, so we fail silently here.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNATIONALISATION — admin dashboard UI strings
// ─────────────────────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  fr: {
    // Nav tabs
    tab_setup: "⚡ Setup", tab_overview: "Dashboard", tab_orders: "Commandes",
    tab_caisse: "Caisse", tab_qrcode: "QR Codes", tab_inventory: "Inventaire",
    tab_promos: "Promos", tab_crm: "CRM", tab_menu: "Carte", tab_settings: "Paramètres",
    // Mobile labels
    m_overview: "Dashboard", m_orders: "Cmds", m_caisse: "Caisse",
    m_crm: "CRM", m_promos: "Promos", m_menu: "Carte",
    m_qrcode: "QR", m_inventory: "Stock", m_setup: "Setup",
    // Sidebar / header
    switch_resto: "← Changer", logout: "Déconnexion",
    welcome: "Bienvenue",
    btn_kitchen: "Cuisine", btn_client: "Vue client",
    // Demo banner
    demo_banner: "MODE DÉMO — Tout est interactif, explorez librement !",
    demo_sub: "· Données fictives, aucune modification enregistrée",
    // Language card (Setup)
    lang_label: "Langue de l'interface",
    lang_hint: "Choisissez la langue du tableau de bord administrateur.",
  },
  en: {
    tab_setup: "⚡ Setup", tab_overview: "Overview", tab_orders: "Orders",
    tab_caisse: "Cash Register", tab_qrcode: "QR Codes", tab_inventory: "Inventory",
    tab_promos: "Promos", tab_crm: "CRM", tab_menu: "Menu", tab_settings: "Settings",
    m_overview: "Home", m_orders: "Orders", m_caisse: "Cash",
    m_crm: "CRM", m_promos: "Promos", m_menu: "Menu",
    m_qrcode: "QR", m_inventory: "Stock", m_setup: "Setup",
    switch_resto: "← Switch", logout: "Log out",
    welcome: "Welcome",
    btn_kitchen: "Kitchen", btn_client: "Customer view",
    demo_banner: "DEMO MODE — Everything is interactive, explore freely!",
    demo_sub: "· Dummy data, no changes are saved",
    lang_label: "Interface language",
    lang_hint: "Choose the language of the admin dashboard.",
  },
  es: {
    tab_setup: "⚡ Setup", tab_overview: "Resumen", tab_orders: "Pedidos",
    tab_caisse: "Caja", tab_qrcode: "Códigos QR", tab_inventory: "Inventario",
    tab_promos: "Promos", tab_crm: "CRM", tab_menu: "Carta", tab_settings: "Configuración",
    m_overview: "Inicio", m_orders: "Pedidos", m_caisse: "Caja",
    m_crm: "CRM", m_promos: "Promos", m_menu: "Carta",
    m_qrcode: "QR", m_inventory: "Stock", m_setup: "Ajustes",
    switch_resto: "← Cambiar", logout: "Salir",
    welcome: "Bienvenido",
    btn_kitchen: "Cocina", btn_client: "Vista cliente",
    demo_banner: "MODO DEMO — ¡Todo es interactivo, explora libremente!",
    demo_sub: "· Datos ficticios, ningún cambio se guarda",
    lang_label: "Idioma de la interfaz",
    lang_hint: "Elige el idioma del panel de administración.",
  },
  pt: {
    tab_setup: "⚡ Setup", tab_overview: "Resumo", tab_orders: "Pedidos",
    tab_caisse: "Caixa", tab_qrcode: "QR Codes", tab_inventory: "Inventário",
    tab_promos: "Promos", tab_crm: "CRM", tab_menu: "Cardápio", tab_settings: "Configurações",
    m_overview: "Início", m_orders: "Pedidos", m_caisse: "Caixa",
    m_crm: "CRM", m_promos: "Promos", m_menu: "Cardápio",
    m_qrcode: "QR", m_inventory: "Stock", m_setup: "Config.",
    switch_resto: "← Trocar", logout: "Sair",
    welcome: "Bem-vindo",
    btn_kitchen: "Cozinha", btn_client: "Vista cliente",
    demo_banner: "MODO DEMO — Tudo é interativo, explore à vontade!",
    demo_sub: "· Dados fictícios, nenhuma alteração é salva",
    lang_label: "Idioma da interface",
    lang_hint: "Escolha o idioma do painel de administração.",
  },
};
const LANG_OPTIONS = [
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "pt", flag: "🇵🇹", name: "Português" },
];
const LangCtx = createContext({ lang: "fr", setLang: () => {}, T: TRANSLATIONS.fr });

class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, fontFamily: "sans-serif", background: "#F5F5F7" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", marginBottom: 8 }}>Erreur au démarrage</p>
        <pre style={{ fontSize: 12, color: "#FF375F", background: "#FFF", padding: 16, borderRadius: 10, maxWidth: 480, wordBreak: "break-all", whiteSpace: "pre-wrap", marginBottom: 16 }}>{this.state.err?.message || String(this.state.err)}</pre>
        <button onClick={() => window.location.reload()} style={{ padding: "10px 24px", background: "#1D1D1F", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>🔄 Recharger</button>
      </div>
    );
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STORE — demo orders + real Supabase restaurants
// ─────────────────────────────────────────────────────────────────────────────
const StoreCtx = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
// DEMO MODE — static data, no Supabase required
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_RESTAURANT = {
  id: "demo", name: "Le Bistro Démo", slug: "demo",
  address: "12 rue de la Paix, Paris", emoji: "🍽️", logo_emoji: "🍽️",
};
const DEMO_MENU = [
  { id: "dm1", name: "Soupe du Jour", description: "Velouté de légumes de saison", price: 6.00, category: "Entrées", emoji: "🍲", is_popular: false, available: true, stock: null, photo_url: null },
  { id: "dm2", name: "Salade César", description: "Romaine, croûtons, parmesan, sauce césar maison", price: 9.00, category: "Entrées", emoji: "🥗", is_popular: true, available: true, stock: null, photo_url: null },
  { id: "dm3", name: "Steak Frites", description: "Entrecôte 250g, frites maison, sauce au poivre", price: 19.90, category: "Plats", emoji: "🥩", is_popular: true, available: true, stock: null, photo_url: null },
  { id: "dm4", name: "Poulet Rôti", description: "Demi poulet fermier, jus de rôti, légumes du marché", price: 15.50, category: "Plats", emoji: "🍗", is_popular: false, available: true, stock: null, photo_url: null },
  { id: "dm5", name: "Burger Maison", description: "Bœuf Angus, cheddar, salade, tomate, sauce maison", price: 13.90, category: "Plats", emoji: "🍔", is_popular: true, available: true, stock: null, photo_url: null },
  { id: "dm6", name: "Pasta Carbonara", description: "Pâtes fraîches, lardons, pecorino, œuf", price: 14.50, category: "Plats", emoji: "🍝", is_popular: false, available: true, stock: null, photo_url: null },
  { id: "dm7", name: "Tarte Tatin", description: "Pommes caramélisées, pâte feuilletée, crème fraîche", price: 7.50, category: "Desserts", emoji: "🥧", is_popular: true, available: true, stock: null, photo_url: null },
  { id: "dm8", name: "Mousse au Chocolat", description: "Chocolat noir 70%, tuile croustillante", price: 6.50, category: "Desserts", emoji: "🍫", is_popular: false, available: true, stock: null, photo_url: null },
  { id: "dm9", name: "Eau Minérale", description: "75 cl", price: 3.00, category: "Boissons", emoji: "💧", is_popular: false, available: true, stock: null, photo_url: null },
  { id: "dm10", name: "Vin Rouge", description: "Sélection du sommelier, verre 15 cl", price: 5.50, category: "Boissons", emoji: "🍷", is_popular: false, available: true, stock: null, photo_url: null },
  { id: "dm11", name: "Coca-Cola", description: "33 cl", price: 3.50, category: "Boissons", emoji: "🥤", is_popular: false, available: true, stock: null, photo_url: null },
  { id: "dm12", name: "Frites Maison", description: "Pommes de terre fraîches, fleur de sel", price: 4.00, category: "Accompagnements", emoji: "🍟", is_popular: false, available: true, stock: 3, photo_url: null },
];
function _demoT(minsAgo) { return new Date(Date.now() - minsAgo * 60000).toISOString(); }
const DEMO_ORDERS = [
  { id: "d1", table: 3, customerName: "Sophie", note: "Sans oignons", total: 32.40, payment_method: "card", status: "cooking", elapsed: 8, createdAt: _demoT(8), items: [
    { id: "di1", name: "Steak Frites", price: 19.90, qty: 1, emoji: "🥩", cat: "Plats" },
    { id: "di2", name: "Salade César", price: 9.00, qty: 1, emoji: "🥗", cat: "Entrées" },
    { id: "di3", name: "Coca-Cola", price: 3.50, qty: 1, emoji: "🥤", cat: "Boissons" },
  ]},
  { id: "d2", table: 7, customerName: "Thomas", note: "", total: 20.40, payment_method: "cash", status: "new", elapsed: 2, createdAt: _demoT(2), items: [
    { id: "di4", name: "Burger Maison", price: 13.90, qty: 1, emoji: "🍔", cat: "Plats" },
    { id: "di5", name: "Frites Maison", price: 4.00, qty: 1, emoji: "🍟", cat: "Accompagnements" },
    { id: "di6", name: "Eau Minérale", price: 3.00, qty: 1, emoji: "💧", cat: "Boissons" },
  ]},
  { id: "d3", table: 2, customerName: "Camille", note: "Allergie arachides", total: 46.00, payment_method: "card", status: "ready", elapsed: 19, createdAt: _demoT(19), items: [
    { id: "di7", name: "Pasta Carbonara", price: 14.50, qty: 2, emoji: "🍝", cat: "Plats" },
    { id: "di8", name: "Vin Rouge", price: 5.50, qty: 2, emoji: "🍷", cat: "Boissons" },
    { id: "di9", name: "Soupe du Jour", price: 6.00, qty: 1, emoji: "🍲", cat: "Entrées" },
  ]},
];
const DEMO_DONE_ORDERS = [
  { id: "d4", table: 1, note: "", total: 41.40, payment_method: "cash", status: "served", elapsed: 0, createdAt: _demoT(45), items: [
    { id: "di10", name: "Steak Frites", price: 19.90, qty: 1, emoji: "🥩", cat: "Plats" },
    { id: "di11", name: "Poulet Rôti", price: 15.50, qty: 1, emoji: "🍗", cat: "Plats" },
    { id: "di12", name: "Coca-Cola", price: 3.50, qty: 1, emoji: "🥤", cat: "Boissons" },
  ]},
  { id: "d5", table: 5, note: "", total: 28.50, payment_method: "card", status: "served", elapsed: 0, createdAt: _demoT(70), items: [
    { id: "di13", name: "Burger Maison", price: 13.90, qty: 1, emoji: "🍔", cat: "Plats" },
    { id: "di14", name: "Tarte Tatin", price: 7.50, qty: 1, emoji: "🥧", cat: "Desserts" },
    { id: "di15", name: "Vin Rouge", price: 5.50, qty: 1, emoji: "🍷", cat: "Boissons" },
  ]},
  { id: "d6", table: 4, note: "Sans gluten", total: 35.90, payment_method: "apple_pay", status: "served", elapsed: 0, createdAt: _demoT(100), items: [
    { id: "di16", name: "Salade César", price: 9.00, qty: 2, emoji: "🥗", cat: "Entrées" },
    { id: "di17", name: "Pasta Carbonara", price: 14.50, qty: 1, emoji: "🍝", cat: "Plats" },
    { id: "di18", name: "Mousse au Chocolat", price: 6.50, qty: 1, emoji: "🍫", cat: "Desserts" },
  ]},
];
const DEMO_WEEKLY_REV = [142, 0, 89, 210, 175, 88, 0];

const DEMO_INGREDIENTS = [
  { id: "ing1", restaurant_id: "demo", name: "Bœuf haché", unit: "kg", emoji: "🥩", stock: 4.5, alert_threshold: 2 },
  { id: "ing2", restaurant_id: "demo", name: "Pain brioche", unit: "pcs", emoji: "🍞", stock: 24, alert_threshold: 10 },
  { id: "ing3", restaurant_id: "demo", name: "Cheddar", unit: "kg", emoji: "🧀", stock: 1.2, alert_threshold: 0.5 },
  { id: "ing4", restaurant_id: "demo", name: "Salade verte", unit: "kg", emoji: "🥬", stock: 0.8, alert_threshold: 0.5 },
  { id: "ing5", restaurant_id: "demo", name: "Pommes de terre", unit: "kg", emoji: "🥔", stock: 8.0, alert_threshold: 3 },
  { id: "ing6", restaurant_id: "demo", name: "Poulet fermier", unit: "kg", emoji: "🍗", stock: 3.2, alert_threshold: 2 },
  { id: "ing7", restaurant_id: "demo", name: "Crème fraîche", unit: "L", emoji: "🥛", stock: 2.0, alert_threshold: 1 },
  { id: "ing8", restaurant_id: "demo", name: "Chocolat noir", unit: "kg", emoji: "🍫", stock: 0.4, alert_threshold: 0.3 },
];
// recipes: { menu_item_id → [{ ingredient_id, qty_per_portion }] }
const DEMO_PROMOS = [
  { id: "promo1", restaurant_id: "demo", name: "Happy Hour", description: "Boissons à -30% de 17h à 19h", discount_percent: 30, emoji: "🍹", color: "#FF9F0A", type: "happy_hour", start_date: null, end_date: null, active: true, send_count: 47, created_at: new Date().toISOString() },
  { id: "promo2", restaurant_id: "demo", name: "Menu Saint-Valentin", description: "Menu spécial pour 2 personnes à -20%", discount_percent: 20, emoji: "❤️", color: "#FF375F", type: "seasonal", start_date: "2026-02-14", end_date: "2026-02-14", active: false, send_count: 0, created_at: new Date().toISOString() },
  { id: "promo3", restaurant_id: "demo", name: "Midi Express", description: "Plat + boisson à 12€ le midi", discount_percent: 0, emoji: "⚡", color: "#34C759", type: "event", start_date: null, end_date: null, active: true, send_count: 123, created_at: new Date().toISOString() },
];
const DEMO_CUSTOMERS = [
  { id:"c1", restaurant_id:"demo", first_name:"Sophie", email:"sophie.martin@gmail.com", phone:"06 12 34 56 78", first_visit:"2025-10-15", last_visit:"2026-05-28", order_count:14, total_spent:287.40, created_at:"2025-10-15T12:00:00Z" },
  { id:"c2", restaurant_id:"demo", first_name:"Thomas", email:"thomas.dupont@hotmail.fr", phone:"06 98 76 54 32", first_visit:"2025-11-02", last_visit:"2026-05-30", order_count:9, total_spent:198.50, created_at:"2025-11-02T12:00:00Z" },
  { id:"c3", restaurant_id:"demo", first_name:"Camille", email:"camille.bernard@gmail.com", phone:"07 11 22 33 44", first_visit:"2025-09-20", last_visit:"2026-04-10", order_count:22, total_spent:512.80, created_at:"2025-09-20T12:00:00Z" },
  { id:"c4", restaurant_id:"demo", first_name:"Lucas", email:"lucas.petit@gmail.com", phone:"", first_visit:"2026-01-08", last_visit:"2026-02-15", order_count:3, total_spent:54.90, created_at:"2026-01-08T12:00:00Z" },
  { id:"c5", restaurant_id:"demo", first_name:"Emma", email:"emma.robert@gmail.com", phone:"06 55 66 77 88", first_visit:"2025-12-01", last_visit:"2026-05-25", order_count:11, total_spent:241.60, created_at:"2025-12-01T12:00:00Z" },
  { id:"c6", restaurant_id:"demo", first_name:"Hugo", email:"hugo.moreau@yahoo.fr", phone:"07 44 55 66 77", first_visit:"2025-08-14", last_visit:"2025-12-20", order_count:6, total_spent:128.40, created_at:"2025-08-14T12:00:00Z" },
  { id:"c7", restaurant_id:"demo", first_name:"Léa", email:"lea.simon@gmail.com", phone:"06 33 44 55 66", first_visit:"2026-02-20", last_visit:"2026-05-10", order_count:5, total_spent:97.50, created_at:"2026-02-20T12:00:00Z" },
  { id:"c8", restaurant_id:"demo", first_name:"Antoine", email:"antoine.laurent@gmail.com", phone:"", first_visit:"2025-07-10", last_visit:"2025-10-05", order_count:4, total_spent:79.80, created_at:"2025-07-10T12:00:00Z" },
  { id:"c9", restaurant_id:"demo", first_name:"Chloé", email:"chloe.lefebvre@gmail.com", phone:"06 77 88 99 00", first_visit:"2026-03-05", last_visit:"2026-05-29", order_count:7, total_spent:154.30, created_at:"2026-03-05T12:00:00Z" },
  { id:"c10", restaurant_id:"demo", first_name:"Nathan", email:"nathan.garcia@outlook.fr", phone:"07 22 33 44 55", first_visit:"2025-11-18", last_visit:"2026-04-22", order_count:8, total_spent:176.00, created_at:"2025-11-18T12:00:00Z" },
  { id:"c11", restaurant_id:"demo", first_name:"Manon", email:"manon.david@gmail.com", phone:"06 10 20 30 40", first_visit:"2026-01-30", last_visit:"2026-05-01", order_count:4, total_spent:88.20, created_at:"2026-01-30T12:00:00Z" },
  { id:"c12", restaurant_id:"demo", first_name:"Romain", email:"romain.bertrand@gmail.com", phone:"", first_visit:"2025-06-05", last_visit:"2025-09-18", order_count:3, total_spent:63.70, created_at:"2025-06-05T12:00:00Z" },
  { id:"c13", restaurant_id:"demo", first_name:"Julie", email:"julie.thomas@gmail.com", phone:"06 66 77 88 99", first_visit:"2026-04-01", last_visit:"2026-05-31", order_count:6, total_spent:118.40, created_at:"2026-04-01T12:00:00Z" },
  { id:"c14", restaurant_id:"demo", first_name:"Pierre", email:"pierre.henry@gmail.com", phone:"07 55 44 33 22", first_visit:"2025-10-28", last_visit:"2026-01-14", order_count:5, total_spent:102.50, created_at:"2025-10-28T12:00:00Z" },
  { id:"c15", restaurant_id:"demo", first_name:"Sarah", email:"sarah.blanc@gmail.com", phone:"06 88 99 00 11", first_visit:"2026-02-14", last_visit:"2026-05-20", order_count:9, total_spent:201.60, created_at:"2026-02-14T12:00:00Z" },
];
// Calendrier exhaustif — tous les événements de l'année (mois 1-12, jour)
const SEASONAL_EVENTS = [
  // ── Janvier ──
  { emoji: "🥂", name: "Jour de l'An", month: 1, day: 1, color: "#BF5AF2", msg: "Soirée de l'An passée ? Relancez avec une offre 'Bonne Année' sur vos menus du midi." },
  { emoji: "👑", name: "Épiphanie", month: 1, day: 6, color: "#FF9F0A", msg: "Galette des rois, fève, couronne — proposez une formule épiphanie en janvier." },
  { emoji: "❄️", name: "Veille Bleu Janvier", month: 1, day: 15, color: "#0071E3", msg: "Mi-janvier = creux post-fêtes. Lancez une promo 'rechauffe-toi chez nous'." },
  // ── Février ──
  { emoji: "🥞", name: "Chandeleur", month: 2, day: 2, color: "#FF9F0A", msg: "Crêpes party ! Proposez un menu crêpes ou un dessert spécial Chandeleur." },
  { emoji: "❤️", name: "Saint-Valentin", month: 2, day: 14, color: "#FF375F", msg: "Menu en amoureux, table décorée, offre cocktail pour 2 — soirée incontournable." },
  // ── Mars ──
  { emoji: "👩", name: "Journée de la Femme", month: 3, day: 8, color: "#FF375F", msg: "Offrez un verre offert ou une réduction pour toutes les femmes ce soir-là." },
  { emoji: "☘️", name: "Saint-Patrick", month: 3, day: 17, color: "#34C759", msg: "Soirée irlandaise, bières spéciales, plats à l'ancienne — ambiance garantie." },
  { emoji: "🌱", name: "Printemps", month: 3, day: 20, color: "#34C759", msg: "Carte de printemps : légumes frais, cocktails fruités, terrasse ouverte." },
  // ── Avril ──
  { emoji: "🐣", name: "Pâques", month: 4, day: 20, color: "#FF9F0A", msg: "Brunch pascal, desserts chocolatés, formule famille — week-end prolongé." },
  { emoji: "🐟", name: "Poisson d'Avril", month: 4, day: 1, color: "#0071E3", msg: "Ajoutez un plat surprise ou un dessert rigolo — fun et mémorable." },
  // ── Mai ──
  { emoji: "🌹", name: "Fête du Travail", month: 5, day: 1, color: "#34C759", msg: "Jour férié = tables remplies le midi. Promo 'muguet offert' avec chaque menu." },
  { emoji: "🕊️", name: "8 Mai 1945", month: 5, day: 8, color: "#0071E3", msg: "Pont du 8 mai : familles en sortie, menu spécial déjeuner patrimonial." },
  { emoji: "🌸", name: "Fête des Mères", month: 5, day: 25, color: "#BF5AF2", msg: "Menu brunch, fleur offerte, cocktail 'Maman' — un des meilleurs jours de l'année." },
  // ── Juin ──
  { emoji: "👔", name: "Fête des Pères", month: 6, day: 15, color: "#0071E3", msg: "Menu premium, dessert personnalisé, expérience 'chef pour un soir'." },
  { emoji: "🎵", name: "Fête de la Musique", month: 6, day: 21, color: "#FF9F0A", msg: "Soirée live music, happy hour prolongé, cocktails aux noms de chansons." },
  { emoji: "☀️", name: "Solstice d'Été", month: 6, day: 21, color: "#FF9F0A", msg: "La nuit la plus courte : soirée rooftop, apéro dinatoire, cocktails estivaux." },
  // ── Juillet ──
  { emoji: "🎆", name: "14 Juillet", month: 7, day: 14, color: "#0071E3", msg: "Soirée feux d'artifice : menu patriotique bleu-blanc-rouge, happy hour avant le show." },
  { emoji: "🏖️", name: "Départs Vacances", month: 7, day: 7, color: "#34C759", msg: "Clients en vacances : misez sur les touristes et les terrasses avec offres fraîcheur." },
  // ── Août ──
  { emoji: "⛅", name: "15 Août", month: 8, day: 15, color: "#FF9F0A", msg: "Jour férié estival — pique-nique chic, brunch tardif, menu soleil." },
  { emoji: "🌅", name: "Fin Août — Avant Rentrée", month: 8, day: 25, color: "#FF9F0A", msg: "Derniers jours d'été : soirée 'adieu l'été', cocktail coucher de soleil." },
  // ── Septembre ──
  { emoji: "🍂", name: "Rentrée", month: 9, day: 1, color: "#FF6B35", msg: "Relancez vos clients habituels avec une offre 'de retour chez nous'." },
  { emoji: "🍇", name: "Vendanges & Automne", month: 9, day: 22, color: "#BF5AF2", msg: "Carte d'automne, vins de saison, plats mijotés — le retour du réconfort." },
  // ── Octobre ──
  { emoji: "👨‍🍳", name: "Semaine du Goût", month: 10, day: 14, color: "#FF9F0A", msg: "Ateliers, menus découverte, mise en avant des producteurs locaux." },
  { emoji: "🎃", name: "Halloween", month: 10, day: 31, color: "#FF6B35", msg: "Déco, menu à thème, cocktails 'sang de vampire' — soirée costumée." },
  // ── Novembre ──
  { emoji: "🕯️", name: "Toussaint", month: 11, day: 1, color: "#888", msg: "Week-end Toussaint : familles réunies, grand déjeuner, menus enfants." },
  { emoji: "🥊", name: "Black Friday", month: 11, day: 28, color: "#1D1D1F", msg: "Offre flash 'Black Menu' : réduction sur une formule ce week-end uniquement." },
  { emoji: "🍷", name: "Beaujolais Nouveau", month: 11, day: 20, color: "#FF375F", msg: "Soirée dégustation, verre de Beaujolais offert à l'entrée — tradition française." },
  // ── Décembre ──
  { emoji: "🎅", name: "Saint-Nicolas", month: 12, day: 6, color: "#FF375F", msg: "Tradition Nord/Est : menu familial, dessert spécial, atmosphère chaleureuse." },
  { emoji: "🎄", name: "Noël", month: 12, day: 25, color: "#34C759", msg: "Menu de réveillon, réservations groupes, coffret cadeau — pic de l'année." },
  { emoji: "🥂", name: "Réveillon Nouvel An", month: 12, day: 31, color: "#BF5AF2", msg: "Soirée premium, menu gastronomique, animations, champagne à minuit." },
  // ── Événements sportifs & culturels ──
  { emoji: "🎾", name: "Roland Garros", month: 5, day: 26, color: "#FF9F0A", msg: "2 semaines de tournoi = clients devant les écrans. Menu 'match', snacks à partager." },
  { emoji: "⚽", name: "Euro / Coupe du Monde", month: 6, day: 12, color: "#0071E3", msg: "Retransmission des matchs, formule 'supporter', ambiance festive garantie." },
  { emoji: "🚴", name: "Tour de France", month: 7, day: 5, color: "#FF375F", msg: "Grande boucle = terrasses animées. Menu régions françaises, spécialités locales." },
  { emoji: "🎬", name: "Festival de Cannes", month: 5, day: 14, color: "#BF5AF2", msg: "Soirée cinéma, menu 'Palme d'Or', cocktails glamour — pour les amateurs de culture." },
];

// ─────────────────────────────────────────────────────────────────────────────
// FRANCHISE / GROUP — Demo data
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_GROUP = { id: "demo-group", name: "Groupe Démo", logo_emoji: "🏢", plan: "franchise" };
const DEMO_FRANCHISE_RESTAURANTS = [
  { id: "fr1", name: "Bistrot Paris", region: "Île-de-France", logo_emoji: "🥗", tables_count: 12, manager_email: "paris@demo.fr" },
  { id: "fr2", name: "Brasserie Lyon", region: "Auvergne-Rhône", logo_emoji: "🍷", tables_count: 8, manager_email: "lyon@demo.fr" },
  { id: "fr3", name: "Café Marseille", region: "PACA", logo_emoji: "☕", tables_count: 6, manager_email: "marseille@demo.fr" },
  { id: "fr4", name: "Resto Bordeaux", region: "Nouvelle-Aquitaine", logo_emoji: "🍷", tables_count: 10, manager_email: "bordeaux@demo.fr" },
  { id: "fr5", name: "Bisto Lille", region: "Hauts-de-France", logo_emoji: "🍺", tables_count: 7, manager_email: "lille@demo.fr" },
];
const DEMO_FRANCHISE_STATS = [
  { restaurant_id: "fr1", ca_today: 2340, ca_7j: 16380, orders_today: 187, orders_7j: 1204, avg_basket: 13.6, growth: 12 },
  { restaurant_id: "fr2", ca_today: 1890, ca_7j: 13230, orders_today: 154, orders_7j: 986, avg_basket: 13.4, growth: 8 },
  { restaurant_id: "fr3", ca_today: 1420, ca_7j: 9940, orders_today: 108, orders_7j: 756, avg_basket: 13.1, growth: 1 },
  { restaurant_id: "fr4", ca_today: 920, ca_7j: 6440, orders_today: 74, orders_7j: 520, avg_basket: 12.4, growth: -5 },
  { restaurant_id: "fr5", ca_today: 540, ca_7j: 3780, orders_today: 41, orders_7j: 314, avg_basket: 12.0, growth: -18 },
];

function getUpcomingEvents(daysAhead = 60) {
  const today = new Date();
  const results = [];
  for (const ev of SEASONAL_EVENTS) {
    let evDate = new Date(today.getFullYear(), ev.month - 1, ev.day);
    if (evDate < today) evDate = new Date(today.getFullYear() + 1, ev.month - 1, ev.day);
    const diff = Math.ceil((evDate - today) / 86400000);
    if (diff <= daysAhead && diff >= 0) results.push({ ...ev, daysLeft: diff, date: evDate });
  }
  return results.sort((a, b) => a.daysLeft - b.daysLeft);
}

const DEMO_RECIPES = {
  dm3: [{ ingredient_id: "ing1", qty_per_portion: 0.25 }, { ingredient_id: "ing5", qty_per_portion: 0.30 }],
  dm4: [{ ingredient_id: "ing6", qty_per_portion: 0.40 }],
  dm5: [{ ingredient_id: "ing1", qty_per_portion: 0.18 }, { ingredient_id: "ing2", qty_per_portion: 1 }, { ingredient_id: "ing3", qty_per_portion: 0.05 }, { ingredient_id: "ing4", qty_per_portion: 0.02 }],
  dm6: [{ ingredient_id: "ing7", qty_per_portion: 0.10 }],
  dm8: [{ ingredient_id: "ing8", qty_per_portion: 0.08 }],
  dm2: [{ ingredient_id: "ing4", qty_per_portion: 0.15 }],
};

function fmtStatus(s) {
  return s === "PENDING" ? "new" : s === "PREPARING" ? "cooking" : s === "READY" ? "ready" : "served";
}

function fmtOrder(o) {
  return {
    id: o.id,
    shortId: o.id.slice(0, 6).toUpperCase(),
    table: o.tables?.number ?? "?",
    customerName: o.customer_name || "",
    customerEmail: o.customer_email || "",
    note: o.note || "",
    total: Number(o.total || 0),
    payment_method: o.payment_method || "cash",
    order_type: o.order_type || "dine_in",
    paid: o.paid === true,
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

// ─────────────────────────────────────────────────────────────────────────────
// Shared "new order" audio alarm — used by both the Dashboard and the Kitchen
// view, so every screen open in the restaurant rings the same way regardless
// of payment method (cash or card).
// ─────────────────────────────────────────────────────────────────────────────
// Set of order IDs the user has clicked/acknowledged — they stop the
// repeating alarm even if the order is still in "new" status.
const __silencedOrderIds = new Set();
const __silenceListeners = new Set();
// Any gain node currently routing a scheduled beep is tracked here so
// silenceOrder() can rip the sound to zero mid-siren instead of letting
// the last-scheduled 1.2s siren finish playing after the user has already
// accepted the order.
const __activeAlarmMasters = new Set();
function registerAlarmMaster(master, autoRemoveAfterMs) {
  if (!master) return;
  __activeAlarmMasters.add(master);
  setTimeout(() => __activeAlarmMasters.delete(master), autoRemoveAfterMs);
}
function stopAllOrderAudio() {
  __activeAlarmMasters.forEach(m => {
    try {
      const now = m.context.currentTime;
      m.gain.cancelScheduledValues(now);
      m.gain.setValueAtTime(m.gain.value, now);
      m.gain.linearRampToValueAtTime(0, now + 0.03);
    } catch {}
  });
  __activeAlarmMasters.clear();
}
function silenceOrder(id) {
  if (!id || __silencedOrderIds.has(id)) return;
  __silencedOrderIds.add(id);
  stopAllOrderAudio();
  __silenceListeners.forEach(fn => { try { fn(); } catch {} });
}
function useSilencedOrders() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force(v => v + 1);
    __silenceListeners.add(fn);
    return () => { __silenceListeners.delete(fn); };
  }, []);
  return __silencedOrderIds;
}

// Browsers only allow AudioContext.resume() to actually take effect when it
// runs inside a real user-gesture call stack (click/touch/key). A generic
// "click anywhere" listener can fire too late or be swallowed by an
// onClick higher up that calls stopPropagation, so a tablet left idle on
// the kitchen screen can stay silently suspended forever. We track unlock
// state reactively so the UI can show an explicit "tap to enable sound"
// banner until it's confirmed unlocked.
let __orderAudioUnlocked = false;
const __orderAudioUnlockListeners = new Set();
function markOrderAudioUnlocked() {
  if (__orderAudioUnlocked) return;
  __orderAudioUnlocked = true;
  __orderAudioUnlockListeners.forEach(fn => { try { fn(); } catch {} });
}
function useOrderAudioUnlocked() {
  const [v, setV] = useState(__orderAudioUnlocked);
  useEffect(() => {
    const fn = () => setV(true);
    __orderAudioUnlockListeners.add(fn);
    return () => { __orderAudioUnlockListeners.delete(fn); };
  }, []);
  return v;
}
let __orderAudioCtx = null;
function unlockOrderAudio() {
  const wasUnlocked = __orderAudioUnlocked;
  if (!__orderAudioCtx) {
    try { __orderAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  }
  if (__orderAudioCtx.state === "running") {
    markOrderAudioUnlocked();
    if (!wasUnlocked) playOrderConfirmBeep();
    return;
  }
  if (__orderAudioCtx.state === "suspended") {
    __orderAudioCtx.resume().then(() => {
      if (__orderAudioCtx.state === "running") {
        markOrderAudioUnlocked();
        if (!wasUnlocked) playOrderConfirmBeep();
      }
    }).catch(() => {});
  }
}
// Short, distinct double-beep played once when sound gets unlocked (and on
// demand via the "Tester le son" button) — gives the cashier/cook audible
// proof it's working, instead of having to guess and wait for a real order.
function playOrderConfirmBeep() {
  try {
    const ctx = __orderAudioCtx;
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime;
    [[t, 660], [t + 0.14, 880]].forEach(([start, freq]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.5, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      osc.start(start); osc.stop(start + 0.14);
    });
  } catch {}
}
if (typeof window !== "undefined") {
  ["click", "touchstart", "keydown"].forEach(evt => window.addEventListener(evt, unlockOrderAudio));
}
function playOrderAlarm() {
  try {
    if (!__orderAudioCtx) __orderAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = __orderAudioCtx;
    if (ctx.state === "suspended") ctx.resume();
    // Hard limiter pushed to the max + makeup gain → maximum perceived loudness
    // possible from Web Audio without clipping artifacts.
    const master = ctx.createGain();
    master.gain.value = 3.0; // pre-limiter drive
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -1;   // hard ceiling
    comp.knee.value = 0;          // brick-wall limiter
    comp.ratio.value = 20;
    comp.attack.value = 0.001;
    comp.release.value = 0.05;
    const makeup = ctx.createGain();
    makeup.gain.value = 2.0;      // post-limiter loudness boost
    master.connect(comp); comp.connect(makeup); makeup.connect(ctx.destination);
    registerAlarmMaster(master, 2000);
    const beep = (freq, start, dur) => {
      // 5 stacked oscillators per beep — square + saw + 2 detuned squares
      // (chorus effect = thicker tone) + sine octave above = piercing siren.
      const layers = [
        ["square",   freq,        1.0],
        ["sawtooth", freq,        0.8],
        ["square",   freq * 1.01, 0.6], // slight detune up
        ["square",   freq * 0.99, 0.6], // slight detune down
        ["sine",     freq * 2,    0.5],
      ];
      layers.forEach(([type, f, vol]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(master);
        osc.type = type;
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(vol, start + 0.005);
        gain.gain.setValueAtTime(vol, start + dur - 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.start(start); osc.stop(start + dur + 0.02);
      });
    };
    const t = ctx.currentTime;
    // Rising siren sweep, ~1.2 s, deliberately impossible to ignore.
    beep(880,  t,        0.18);
    beep(1320, t + 0.20, 0.18);
    beep(880,  t + 0.42, 0.18);
    beep(1320, t + 0.62, 0.18);
    beep(1760, t + 0.84, 0.30);
  } catch {}
}

// Gentle "your order is ready" chime for customers — a soft two-note bell,
// nothing like the staff siren above (that one's deliberately aggressive,
// this one should feel pleasant since the customer didn't ask to be alarmed).
function playCustomerReadyChime() {
  try {
    if (!__orderAudioCtx) __orderAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = __orderAudioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    registerAlarmMaster(master, 1500);
    const note = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(master);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(1, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start); osc.stop(start + dur + 0.05);
    };
    const t = ctx.currentTime;
    note(987.77, t,        0.5);  // B5
    note(1318.5, t + 0.18, 0.6);  // E6
  } catch {}
}

function useStore(restaurantId) {
  const [orders, setOrders] = useState([]);
  const [doneOrders, setDoneOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifHistory, setNotifHistory] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [customers, setCustomers] = useState([]);

  const pushNotif = useCallback((msg, type = "info") => {
    const n = { id: Date.now(), msg, type, ts: new Date() };
    setNotifications(p => [n, ...p.slice(0, 4)]);
    setNotifHistory(p => [n, ...p.slice(0, 49)]);
    setTimeout(() => setNotifications(p => p.filter(x => x.id !== n.id)), 5000);
  }, []);

  // Add to bell history only — no toast shown
  const silentNotif = useCallback((msg, type = "info") => {
    const n = { id: Date.now(), msg, type, ts: new Date() };
    setNotifHistory(p => [n, ...p.slice(0, 49)]);
  }, []);

  // Launch a campaign: creates a promo + increments send_count live
  const launchCampaign = useCallback(async (campaignData, isDemo) => {
    const newPromo = {
      id: "camp_" + Date.now(),
      restaurant_id: restaurantId,
      name: campaignData.name,
      description: campaignData.msg || "",
      discount_percent: 0,
      emoji: campaignData.emoji,
      color: campaignData.color,
      type: "event",
      start_date: null, end_date: null,
      active: true,
      send_count: campaignData.clientCount || 0,
      created_at: new Date().toISOString(),
    };
    setPromotions(prev => [newPromo, ...prev]);
    // CRM impact: mark inactive customers as "relancé"
    const now = new Date().toISOString();
    setCustomers(prev => prev.map(c => {
      const daysSinceLast = (Date.now() - new Date(c.last_visit).getTime()) / 86400000;
      if (daysSinceLast > 30) {
        return { ...c, last_contacted: now, campaign_count: (c.campaign_count || 0) + 1, _relanced: true };
      }
      return c;
    }));
    pushNotif(`🚀 Campagne "${campaignData.name}" lancée vers ${campaignData.clientCount} clients !`, "success");
    if (!isDemo) {
      try {
        await supabase.from("promotions").insert({
          restaurant_id: restaurantId,
          name: newPromo.name, description: newPromo.description,
          discount_percent: 0, emoji: newPromo.emoji, color: newPromo.color,
          type: "event", active: true, send_count: newPromo.send_count,
        });
      } catch {}
    }
  }, [restaurantId, pushNotif]);

  useEffect(() => {
    if (!restaurantId) { setOrders([]); setDoneOrders([]); return; }
    if (restaurantId === "demo") {
      setOrders(DEMO_ORDERS);
      setDoneOrders(DEMO_DONE_ORDERS);
      setIngredients(DEMO_INGREDIENTS);
      setPromotions(DEMO_PROMOS);
      setCustomers(DEMO_CUSTOMERS);
      // Demo: seed notification history
      const now = new Date();
      const mk = (msg, type, minAgo) => ({ id: minAgo, msg, type, ts: new Date(now - minAgo * 60000) });
      setNotifHistory([
        mk("🆕 Commande #A3F2 — Table 5 · Sophie M.", "new", 2),
        mk("🆕 Commande #B81C — Table 2 · Lucas D.", "new", 8),
        mk("✅ Commande #9E4A livrée — Table 3", "success", 15),
        mk("⚠️ Stock bas : Tomates cerises (2 kg restants)", "warning", 22),
        mk("🆕 Commande #C70F — Table 7", "new", 35),
        mk("ℹ️ Bienvenue sur Wegemo — dashboard actif", "info", 60),
      ]);
      return;
    }

    supabase.from("ingredients").select("*").eq("restaurant_id", restaurantId)
      .then(({ data }) => setIngredients(data ?? []));

    supabase.from("promotions").select("*").eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPromotions(data ?? []));

    supabase.from("customers").select("*").eq("restaurant_id", restaurantId)
      .order("last_visit", { ascending: false })
      .then(({ data }) => setCustomers(data ?? []));

    supabase.from("orders").select(ORDER_QUERY)
      .eq("restaurant_id", restaurantId).neq("status", "DONE")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const fmtd = (data ?? []).map(fmtOrder);
        setOrders(fmtd);
        // Seed notification history from existing active orders
        if (fmtd.length > 0) {
          setNotifHistory(fmtd.map(o => ({
            id: o.id,
            msg: `🆕 Commande #${o.shortId} — Table ${o.table}${o.customerName ? ` · ${o.customerName}` : ""}`,
            type: "new",
            ts: new Date(o.createdAt),
          })));
        }
      });

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
          pushNotif(`Commande #${o.shortId} — Table ${o.table}${o.customerName ? ` · ${o.customerName}` : ""}`, "new");
          playOrderAlarm();
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        async ({ new: row }) => {
          if (row.status === "DONE") {
            setOrders(prev => prev.filter(o => o.id !== row.id));
            const { data } = await supabase.from("orders").select(ORDER_QUERY).eq("id", row.id).single();
            if (data) setDoneOrders(prev => [fmtOrder(data), ...prev.slice(0, 49)]);
          } else {
            setOrders(prev => prev.map(o => o.id === row.id ? { ...o, status: fmtStatus(row.status), paid: row.paid === true } : o));
          }
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "customers", filter: `restaurant_id=eq.${restaurantId}` },
        async () => {
          const { data } = await supabase.from("customers").select("*").eq("restaurant_id", restaurantId).order("last_visit", { ascending: false });
          setCustomers(data ?? []);
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "promotions", filter: `restaurant_id=eq.${restaurantId}` },
        async () => {
          const { data } = await supabase.from("promotions").select("*").eq("restaurant_id", restaurantId).order("created_at", { ascending: false });
          setPromotions(data ?? []);
        }
      )
      .subscribe();

    const tick = setInterval(() => {
      setOrders(prev => prev.map(o => ({ ...o, elapsed: Math.max(0, Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000)) })));
    }, 60000);

    // Polling fallback (every 8s): Supabase Realtime websockets can drop
    // silently (sleeping tablet, flaky wifi, background tab) — we reconcile
    // by re-fetching active orders and emitting the alarm for any new ones
    // the realtime channel may have missed. This guarantees no order is ever
    // received without the sound.
    const knownIds = new Set();
    let seeded = false;
    const reconcile = async () => {
      const { data } = await supabase.from("orders").select(ORDER_QUERY)
        .eq("restaurant_id", restaurantId).neq("status", "DONE")
        .order("created_at", { ascending: true });
      if (!data) return;
      const fmtd = data.map(fmtOrder);
      if (!seeded) {
        fmtd.forEach(o => knownIds.add(o.id));
        seeded = true;
        return;
      }
      const fresh = fmtd.filter(o => !knownIds.has(o.id));
      fresh.forEach(o => knownIds.add(o.id));
      if (fresh.length === 0) return;
      setOrders(prev => {
        const existing = new Set(prev.map(o => o.id));
        const newcomers = fresh.filter(o => !existing.has(o.id));
        if (newcomers.length === 0) return prev;
        newcomers.forEach(o => {
          pushNotif(`Commande #${o.shortId} — Table ${o.table}${o.customerName ? ` · ${o.customerName}` : ""}`, "new");
        });
        playOrderAlarm();
        return [...newcomers, ...prev];
      });
    };
    reconcile();
    const poll = setInterval(reconcile, 3000);

    return () => { supabase.removeChannel(ch); clearInterval(tick); clearInterval(poll); };
  }, [restaurantId]);

  // Keep ringing in the Dashboard too, every few seconds, as long as at least
  // one order is still waiting to be accepted ("new" / PENDING) AND hasn't
  // been silenced by a user click — same logic as the Kitchen view.
  const silenced = useSilencedOrders();
  const pendingOrderCount = orders.filter(o => o.status === "new" && !silenced.has(o.id)).length;
  useEffect(() => {
    if (!restaurantId || pendingOrderCount === 0) return;
    const id = setInterval(() => playOrderAlarm(), 2500);
    return () => clearInterval(id);
  }, [restaurantId, pendingOrderCount]);

  const revenue = doneOrders.reduce((s, o) => s + o.total, 0);
  const clearNotifHistory = useCallback(() => setNotifHistory([]), []);
  return { orders, setOrders, servedOrders: doneOrders, doneOrders, notifications, notifHistory, pushNotif, silentNotif, clearNotifHistory, revenue, ingredients, promotions, setPromotions, customers, setCustomers, launchCampaign };
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
  @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes ring { 0%,100% { transform:scale(1); } 50% { transform:scale(1.06); } }
  @keyframes typingDot { 0%,80%,100% { transform:scale(0.6); opacity:0.4; } 40% { transform:scale(1); opacity:1; } }
  @keyframes popIn { from { opacity:0; transform:scale(0.7); } to { opacity:1; transform:scale(1); } }
  @keyframes bellShake { 0%,100%{transform:rotate(0)} 20%{transform:rotate(-20deg)} 40%{transform:rotate(20deg)} 60%{transform:rotate(-15deg)} 80%{transform:rotate(15deg)} }
  .btn-press:active { transform: scale(0.97); opacity: 0.9; }
  .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
  .fade-in { animation: fadeIn 0.3s ease; }
  .slide-up { animation: slideUp 0.3s ease; }
`;
const FF = { fontFamily: "'Figtree', -apple-system, sans-serif" };

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

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

function Logo({ dark = true, size = 18, onClick }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 8, cursor: onClick ? "pointer" : "default" }}>
      <div style={{ width: size + 10, height: size + 10, background: dark ? C.dark : C.white, borderRadius: (size + 10) * 0.28, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.7 }}>🍽</span>
      </div>
      <span style={{ fontSize: size, fontWeight: 800, color: dark ? C.dark : C.white, letterSpacing: "-0.03em", ...FF }}>
        We<span style={{ color: C.accent }}>gemo</span>
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
// DEMO — Onboarding steps per persona
// ─────────────────────────────────────────────────────────────────────────────
const ONBOARDING_STEPS = {
  restaurant: [
    { title: "👋 Bienvenue dans votre dashboard !", body: "Voici le tableau de bord de votre restaurant. Tout est interactif !" },
    { title: "📋 Vos commandes en temps réel", body: "Suivez toutes les commandes en cours depuis l'onglet Commandes." },
    { title: "🍽️ Gérez votre carte", body: "Ajoutez, modifiez ou supprimez des plats depuis l'onglet Carte." },
    { title: "💰 Suivez votre caisse", body: "Visualisez les recettes du jour, semaine et mois dans l'onglet Caisse." },
    { title: "👥 Votre CRM clients", body: "Consultez l'historique de vos clients et lancez des campagnes ciblées." },
    { title: "🤖 Gémo, votre assistant IA", body: "Gémo vous aide à gérer votre restaurant au quotidien — posez-lui une question !" },
  ],
  franchise: [
    { title: "🏢 Votre réseau en un coup d'œil", body: "Tous vos établissements consolidés en un seul dashboard." },
    { title: "📊 Comparez vos établissements", body: "Visualisez les performances de chaque restaurant côte à côte." },
    { title: "📧 Lancez une campagne sur tout le réseau", body: "Une seule action pour envoyer une promo à tous vos restaurants." },
    { title: "📈 Analytics consolidés", body: "CA global, panier moyen, croissance — tout en un clin d'œil." },
    { title: "👥 Gérez vos franchisés", body: "Accédez à la liste de vos établissements et gérez les accès." },
  ],
  kitchen: [
    { title: "👨‍🍳 Les commandes arrivent ici", body: "La colonne 'Nouvelles' reçoit chaque commande dès qu'elle est passée par un client." },
    { title: "✅ Faites avancer chaque commande", body: "Cliquez sur 'Accepter' puis 'Prête' pour faire avancer le statut de la commande." },
    { title: "⏱️ Alerte si une commande dépasse 20 min", body: "Les commandes en retard s'affichent en rouge — ne les laissez pas attendre !" },
  ],
  customer: [
    { title: "📱 Vous venez de scanner le QR code de la Table 5", body: "En restaurant, un simple scan suffit pour accéder au menu complet." },
    { title: "🛒 Ajoutez des plats à votre panier", body: "Parcourez la carte et cliquez sur + pour ajouter des plats à votre commande." },
    { title: "💳 Payez en quelques secondes", body: "Validez votre commande directement depuis votre téléphone — sans attendre un serveur." },
  ],
};

function useOnboarding(demoMode) {
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(true);
  const steps = ONBOARDING_STEPS[demoMode] || [];
  return {
    step, total: steps.length,
    current: steps[step],
    next: () => setStep(s => s + 1),
    skip: () => setActive(false),
    active: active && step < steps.length,
  };
}

function OnboardingBar({ demoMode }) {
  const ob = useOnboarding(demoMode);
  if (!ob.active || !ob.current) return null;
  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      background: C.dark, color: C.white, borderRadius: 20, padding: "16px 24px",
      display: "flex", alignItems: "center", gap: 16, zIndex: 9999,
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)", maxWidth: 480, width: "calc(100% - 32px)", ...FF,
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>Étape {ob.step + 1} / {ob.total}</p>
        <p style={{ fontSize: 14, fontWeight: 700 }}>{ob.current.title}</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{ob.current.body}</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={ob.skip} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer", ...FF }}>Passer</button>
        <button onClick={ob.next} style={{ padding: "6px 14px", background: C.white, border: "none", borderRadius: 8, color: C.dark, fontSize: 12, fontWeight: 700, cursor: "pointer", ...FF }}>
          {ob.step === ob.total - 1 ? "Terminer ✓" : "Suivant →"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LANDING PAGE PUBLIQUE
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_PERSONAS = [
  { key: "restaurant", icon: "🍽️", title: "Restaurant", desc: "Gérez commandes, carte, caisse, stocks et CRM en temps réel.", tags: ["Commandes", "Caisse", "CRM"], color: "#007AFF" },
  { key: "franchise",  icon: "🏢", title: "Franchise / Groupe", desc: "Pilotez un réseau de 5 restaurants avec analytics consolidés.", tags: ["Réseau", "Comparatif", "Campagnes"], color: "#34C759" },
];

function LandingPage({ onDemo, onSignup, onLogin }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ minHeight: "100vh", background: C.bg, ...FF }}>
      <style>{css}</style>

      {/* Navbar */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "14px 20px" : "16px 48px", background: C.white, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <Logo size={18} />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={onLogin} style={{ padding: "8px 18px", background: "transparent", border: `1.5px solid ${C.borderStrong}`, borderRadius: 10, fontSize: 14, fontWeight: 600, color: C.text, cursor: "pointer", ...FF }}>Connexion</button>
          <button onClick={onSignup} style={{ padding: "8px 18px", background: C.dark, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, color: C.white, cursor: "pointer", ...FF }}>Créer un compte</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: isMobile ? "48px 20px 32px" : "80px 48px 48px", maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: isMobile ? 56 : 96, fontWeight: 900, color: C.dark, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 24 }}>
          We<span style={{ color: C.accent }}>gemo</span>
        </h1>
        <p style={{ fontSize: isMobile ? 16 : 18, color: C.textSecondary, marginBottom: 36, lineHeight: 1.6 }}>
          Commandes QR, cuisine temps réel, caisse, CRM et campagnes email.<br />Pour les restaurants indépendants et les réseaux franchise.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onSignup} style={{ padding: "14px 32px", background: C.dark, border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, color: C.white, cursor: "pointer", ...FF }}>
            Commencer gratuitement →
          </button>
          <button onClick={() => document.getElementById("demos-section").scrollIntoView({ behavior: "smooth" })} style={{ padding: "14px 28px", background: C.white, border: `1.5px solid ${C.borderStrong}`, borderRadius: 14, fontSize: 16, fontWeight: 700, color: C.dark, cursor: "pointer", ...FF }}>
            🎮 Voir les démos
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 16 : 32, marginTop: 24, flexWrap: "wrap" }}>
          <span style={{ color: C.textTertiary, fontSize: 13 }}>✓ Support 7j/7</span>
        </div>
      </div>

      {/* Section démos */}
      <div id="demos-section" style={{ padding: isMobile ? "32px 16px 48px" : "48px 48px 80px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, color: C.dark, letterSpacing: "-0.02em", marginBottom: 10 }}>Explorez sans créer de compte</h2>
          <p style={{ fontSize: 15, color: C.textSecondary }}>Choisissez votre rôle et découvrez l'interface en temps réel</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          {DEMO_PERSONAS.map(p => (
            <button key={p.key} onClick={() => onDemo(p.key)}
              className="btn-press"
              style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 20, padding: "24px", textAlign: "left", cursor: "pointer", transition: "all 0.2s", ...FF, display: "block" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: p.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{p.icon}</div>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 800, color: C.dark, marginBottom: 4 }}>{p.title}</p>
                  <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>{p.desc}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {p.tags.map(t => (
                  <span key={t} style={{ padding: "3px 10px", background: p.color + "15", borderRadius: 20, fontSize: 11, fontWeight: 600, color: p.color }}>{t}</span>
                ))}
                <span style={{ marginLeft: "auto", fontSize: 13, color: p.color, fontWeight: 700 }}>Explorer →</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO PICKER PAGE
// ─────────────────────────────────────────────────────────────────────────────
function DemoPickerPage({ onSelect, onBack, onSignup }) {
  const isMobile = useIsMobile();
  const personas = [
    {
      key: "restaurant",
      emoji: "🍽️",
      title: "Je gère mon restaurant",
      desc: "Commandes, carte, caisse, stocks, cuisine, CRM",
      tags: ["Commandes temps réel", "Gestion menu", "Caisse & compta"],
      color: C.accentBlue,
    },
    {
      key: "franchise",
      emoji: "🏢",
      title: "Je pilote un réseau",
      desc: "5 restaurants, analytics consolidés, campagnes globales",
      tags: ["Vue réseau", "Comparatif", "Campagnes multi-restos"],
      color: C.accentGreen,
    },
    {
      key: "kitchen",
      emoji: "👨‍🍳",
      title: "Je travaille en cuisine",
      desc: "Vue kanban des commandes, avancement en temps réel",
      tags: ["Kanban", "Temps réel", "Statuts commandes"],
      color: C.accentOrange,
    },
    {
      key: "customer",
      emoji: "📱",
      title: "Je suis un client",
      desc: "Je scanne un QR code et je commande depuis mon téléphone",
      tags: ["Menu QR", "Panier", "Paiement"],
      color: C.accent,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, ...FF }}>
      <style>{css}</style>
      <nav style={{ background: "rgba(245,245,247,0.9)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 13, color: C.textSecondary, cursor: "pointer", ...FF }}>← Retour</button>
          <Logo size={17} />
        </div>
        <button onClick={onSignup} style={{ background: C.dark, border: "none", borderRadius: 10, padding: "8px 18px", color: C.white, fontSize: 13, fontWeight: 700, cursor: "pointer", ...FF }}>🚀 Créer mon compte</button>
      </nav>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: isMobile ? "40px 20px" : "60px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 800, color: C.dark, letterSpacing: "-0.04em", marginBottom: 12 }}>
            Explorez Wegemo sans créer de compte
          </h1>
          <p style={{ color: C.textSecondary, fontSize: 16 }}>Choisissez votre rôle et découvrez l'interface en temps réel</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          {personas.map(p => (
            <button key={p.key} onClick={() => onSelect(p.key)}
              style={{ background: C.white, border: `2px solid ${C.border}`, borderRadius: 20, padding: 28, textAlign: "left", cursor: "pointer", transition: "all 0.2s", ...FF }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.boxShadow = `0 8px 32px ${p.color}22`; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: p.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{p.emoji}</div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: C.dark, marginBottom: 2 }}>{p.title}</h3>
                  <p style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.4 }}>{p.desc}</p>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {p.tags.map(t => (
                  <span key={t} style={{ background: p.color + "12", color: p.color, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>{t}</span>
                ))}
              </div>
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6, color: p.color, fontWeight: 700, fontSize: 13 }}>
                Explorer ce rôle <span>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO KITCHEN PAGE
// ─────────────────────────────────────────────────────────────────────────────
function DemoKitchenPage({ onBack, onSignup }) {
  const [orders, setOrders] = useState(() => DEMO_ORDERS.map(o => ({ ...o })));
  const [clock, setClock] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);

  function advance(orderId) {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const next = o.status === "new" ? "cooking" : o.status === "cooking" ? "ready" : "served";
      return { ...o, status: next };
    }).filter(o => o.status !== "served"));
  }

  const COLS = [
    { key: "new", label: "Nouvelles", color: C.accentBlue, orders: orders.filter(o => o.status === "new") },
    { key: "cooking", label: "En cuisine", color: C.accentOrange, orders: orders.filter(o => o.status === "cooking") },
    { key: "ready", label: "Prêtes ✓", color: C.accentGreen, orders: orders.filter(o => o.status === "ready") },
  ];
  const btnLabel = { new: "Accepter →", cooking: "Prête ✓", ready: "Servie ✓" };
  const isMobile = useIsMobile();

  return (
    <div style={{ background: "#1a1a1a", minHeight: "100vh", display: "flex", flexDirection: "column", ...FF }}>
      <style>{css}</style>
      {/* Floating action buttons */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1000, display: "flex", gap: 8 }}>
        <button onClick={onBack} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, color: "rgba(255,255,255,0.8)", fontSize: 13, cursor: "pointer", ...FF }}>← Autres rôles</button>
        <button onClick={onSignup} style={{ padding: "8px 18px", background: C.accentGreen, border: "none", borderRadius: 10, color: C.white, fontSize: 13, fontWeight: 700, cursor: "pointer", ...FF }}>🚀 Créer mon compte gratuit</button>
      </div>
      {/* Header */}
      <header style={{ background: C.dark, height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Logo size={16} dark={false} />
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Mode Démo — Vue Cuisine 👨‍🍳</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(52,199,89,0.2)", border: "1px solid rgba(52,199,89,0.3)", padding: "4px 10px", borderRadius: 20 }}>
            <Dot color={C.accentGreen} pulse /><span style={{ color: C.accentGreen, fontSize: 11, fontWeight: 600 }}>DÉMO</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 24, fontWeight: 800, color: C.white, lineHeight: 1 }}>{clock.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </header>
      {/* Kanban */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, padding: 12, overflow: "auto" }}>
        {COLS.map(col => (
          <div key={col.key} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: C.white, borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{col.label}</span>
              </div>
              <span style={{ background: col.color + "18", color: col.color, fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>{col.orders.length}</span>
            </div>
            {col.orders.length === 0 && <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: 28, textAlign: "center", color: C.textTertiary, fontSize: 13 }}>Aucune commande</div>}
            {col.orders.map(order => {
              const isLate = order.elapsed >= 20 && order.status !== "ready";
              return (
                <div key={order.id} style={{ background: C.white, border: `1.5px solid ${isLate ? C.accent : order.status === "ready" ? C.accentGreen : C.border}`, borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ background: order.status === "ready" ? C.accentGreen : isLate ? C.accent : C.dark, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 30, fontWeight: 900, color: C.white, lineHeight: 1 }}>{order.table}</span>
                      <div>
                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>TABLE</p>
                        <p style={{ fontSize: 13, color: C.white, fontWeight: 700 }}>{order.customerName || order.id.slice(0,6)}</p>
                        {order.order_type === "takeaway" && <p style={{ fontSize: 10, fontWeight: 700, color: "#FF9F0A", margin: 0 }}>🥡 À emporter</p>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 22, fontWeight: 800, color: C.white, lineHeight: 1 }}>{order.elapsed}<span style={{ fontSize: 12, opacity: 0.6 }}>min</span></p>
                      {isLate && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>⚠ RETARD</p>}
                    </div>
                  </div>
                  <div style={{ padding: "12px 16px" }}>
                    {order.items.map(item => (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 6, marginBottom: 6, borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 16 }}>{item.emoji}</span>
                        <span style={{ flex: 1, fontSize: 13, color: C.dark, fontWeight: 600 }}>{item.name}</span>
                        <span style={{ fontSize: 12, color: C.textSecondary }}>×{item.qty}</span>
                      </div>
                    ))}
                    {order.note && <p style={{ fontSize: 11, color: C.textSecondary, fontStyle: "italic", marginTop: 4 }}>📝 {order.note}</p>}
                    <button onClick={() => advance(order.id)} style={{ width: "100%", marginTop: 12, padding: "9px 0", background: order.status === "ready" ? C.accentGreen : order.status === "cooking" ? C.accentOrange : C.accentBlue, border: "none", borderRadius: 10, color: C.white, fontSize: 13, fontWeight: 700, cursor: "pointer", ...FF }}>
                      {btnLabel[order.status]}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <OnboardingBar demoMode="kitchen" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO CUSTOMER PAGE
// ─────────────────────────────────────────────────────────────────────────────
function DemoCustomerPage({ onBack, onSignup }) {
  const [cart, setCart] = useState({});
  const [ordered, setOrdered] = useState(false);
  const isMobile = useIsMobile();

  const categories = [...new Set(DEMO_MENU.map(i => i.category))];
  const total = Object.entries(cart).reduce((s, [id, qty]) => {
    const item = DEMO_MENU.find(i => i.id === id);
    return s + (item ? item.price * qty : 0);
  }, 0);
  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  function add(id) { setCart(p => ({ ...p, [id]: (p[id] || 0) + 1 })); }
  function remove(id) { setCart(p => { const n = { ...p }; if (n[id] > 1) n[id]--; else delete n[id]; return n; }); }

  if (ordered) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", ...FF, flexDirection: "column", gap: 16, padding: 24 }}>
      <style>{css}</style>
      <div style={{ fontSize: 64 }}>✅</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: C.dark, textAlign: "center" }}>Commande envoyée !</h2>
      <p style={{ color: C.textSecondary, fontSize: 15, textAlign: "center" }}>La cuisine a bien reçu votre commande pour la Table 5.</p>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={() => { setCart({}); setOrdered(false); }} style={{ padding: "10px 20px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 14, cursor: "pointer", ...FF }}>Commander autre chose</button>
        <button onClick={onSignup} style={{ padding: "10px 20px", background: C.accentGreen, border: "none", borderRadius: 12, color: C.white, fontSize: 14, fontWeight: 700, cursor: "pointer", ...FF }}>🚀 Créer mon compte</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, ...FF }}>
      <style>{css}</style>
      {/* Floating buttons */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1000, display: "flex", gap: 8 }}>
        <button onClick={onBack} style={{ padding: "7px 14px", background: "rgba(0,0,0,0.08)", border: "none", borderRadius: 10, color: C.dark, fontSize: 12, cursor: "pointer", ...FF }}>← Autres rôles</button>
        <button onClick={onSignup} style={{ padding: "7px 14px", background: C.accentGreen, border: "none", borderRadius: 10, color: C.white, fontSize: 12, fontWeight: 700, cursor: "pointer", ...FF }}>🚀 Créer mon compte</button>
      </div>
      {/* Header */}
      <div style={{ background: C.dark, padding: "20px 20px 16px", textAlign: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 4 }}>MODE DÉMO · TABLE 5</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white }}>{DEMO_RESTAURANT.emoji} {DEMO_RESTAURANT.name}</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>{DEMO_RESTAURANT.address}</p>
      </div>
      {/* Menu */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 120px" }}>
        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: C.textSecondary, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>{cat}</h2>
            {DEMO_MENU.filter(i => i.category === cat).map(item => (
              <div key={item.id} style={{ background: C.white, borderRadius: 14, padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{item.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: C.dark, fontSize: 14 }}>{item.name}</p>
                  <p style={{ color: C.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 1.3 }}>{item.description}</p>
                  <p style={{ color: C.dark, fontWeight: 700, fontSize: 14, marginTop: 4 }}>{item.price.toFixed(2)} €</p>
                </div>
                {cart[item.id] ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => remove(item.id)} style={{ width: 30, height: 30, borderRadius: "50%", background: C.bg, border: `1px solid ${C.border}`, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", ...FF }}>−</button>
                    <span style={{ fontWeight: 700, fontSize: 15, minWidth: 18, textAlign: "center" }}>{cart[item.id]}</span>
                    <button onClick={() => add(item.id)} style={{ width: 30, height: 30, borderRadius: "50%", background: C.dark, border: "none", cursor: "pointer", fontSize: 16, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", ...FF }}>+</button>
                  </div>
                ) : (
                  <button onClick={() => add(item.id)} style={{ width: 34, height: 34, borderRadius: "50%", background: C.dark, border: "none", cursor: "pointer", fontSize: 18, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...FF }}>+</button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Cart bar */}
      {cartCount > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px 20px", background: C.white, borderTop: `1px solid ${C.border}`, boxShadow: "0 -4px 24px rgba(0,0,0,0.08)" }}>
          <button onClick={() => setOrdered(true)} style={{ width: "100%", maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: C.dark, border: "none", borderRadius: 14, color: C.white, cursor: "pointer", ...FF }}>
            <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "2px 10px", fontSize: 14, fontWeight: 700 }}>{cartCount}</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Commander</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{total.toFixed(2)} €</span>
          </button>
        </div>
      )}
      <OnboardingBar demoMode="customer" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH PAGE — wired to Supabase
// ─────────────────────────────────────────────────────────────────────────────
function SignupPage({ onDone, onDemo, onDemoPicker, initialMode = "signup" }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [accountType, setAccountType] = useState("solo");
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const ok = mode === "login" ? form.email && form.password : form.name && form.email && form.password.length >= 8;

  async function submit() {
    setError(""); setLoading(true);
    try {
      if (mode === "signup") {
        const { data: signUpData, error: err } = await supabase.auth.signUp({
          email: form.email, password: form.password,
          options: { data: { name: form.name } },
        });
        if (err) throw err;
        if (accountType !== "solo" && signUpData?.user) {
          await supabase.from("franchise_groups").insert({
            owner_id: signUpData.user.id,
            name: groupName || form.name + " Groupe",
            plan: accountType,
          });
        }
        setSent(true);
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (err) throw err;
        const u = { name: data.user.user_metadata?.name || form.email.split("@")[0], email: data.user.email, id: data.user.id };
        const { data: grp } = await supabase.from("franchise_groups").select("*").eq("owner_id", data.user.id).single();
        onDone(u, grp || null);
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
          {mode === "signup" && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Type de compte</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: accountType !== "solo" ? 12 : 0 }}>
                {[
                  { val: "solo", emoji: "🍽️", title: "Restaurant", desc: "Un seul établissement" },
                  { val: "franchise", emoji: "🏢", title: "Franchise / Groupe", desc: "Plusieurs établissements" },
                ].map(({ val, emoji, title, desc }) => (
                  <button key={val} type="button" onClick={() => setAccountType(val)}
                    style={{ padding: "14px 12px", borderRadius: 12, border: `2px solid ${accountType === val ? C.dark : C.border}`, background: accountType === val ? C.dark : C.bg, cursor: "pointer", textAlign: "center", transition: "all 0.15s", ...FF }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: accountType === val ? C.white : C.dark, marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize: 11, color: accountType === val ? "rgba(255,255,255,0.6)" : C.textTertiary }}>{desc}</div>
                  </button>
                ))}
              </div>
              {accountType !== "solo" && (
                <InputField label="Nom du réseau / groupe"
                  placeholder="ex: Brasseries du Nord, Groupe Martin..."
                  value={groupName} onChange={e => setGroupName(e.target.value)} autoFocus />
              )}
            </div>
          )}
          {error && <p style={{ color: C.accent, fontSize: 13, background: C.accent + "10", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>{error}</p>}
          <Btn variant="primary" size="lg" full disabled={!ok || loading} onClick={submit} style={{ marginTop: 8 }}>
            {loading ? "..." : mode === "signup" ? "Créer mon compte →" : "Se connecter →"}
          </Btn>
        </Surface>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <span style={{ color: C.textTertiary, fontSize: 12 }}>✓ Support 7j/7</span>
        </div>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={onDemoPicker} style={{ background: C.dark, border: "none", borderRadius: 12, color: C.white, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "10px 24px", display: "inline-flex", alignItems: "center", gap: 6, ...FF }}>
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESTAURANTS PAGE — wired to Supabase
// ─────────────────────────────────────────────────────────────────────────────
function RestaurantsPage({ user, franchiseGroup, onSelect, onLogout, onDemo, onFranchise, onHome, onFranchiseCreated, onFranchiseFound, noAutoRedirect }) {
  const { lang, setLang } = useContext(LangCtx);
  const first = user.name || user.email.split("@")[0];
  const h = new Date().getHours();
  const greet = h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
  const isMobile = useIsMobile();
  const [restaurants, setRestaurants] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [creatingFranchise, setCreatingFranchise] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", logo_emoji: "🍽️", tables_count: 8 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [uploadingRestLogo, setUploadingRestLogo] = useState(false);
  const [newRestLogoUrl, setNewRestLogoUrl] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null); // restaurant to delete
  const [deleteStep, setDeleteStep] = useState(1); // 1 = confirm, 2 = type "supprimer"
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const fv = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  function openDelete(e, r) {
    e.stopPropagation();
    setDeleteTarget(r);
    setDeleteStep(1);
    setDeleteInput("");
  }

  async function confirmDelete() {
    if (deleteStep === 1) { setDeleteStep(2); return; }
    if (deleteInput.trim().toLowerCase() !== "supprimer") return;
    setDeleting(true);
    await supabase.from("restaurants").delete().eq("id", deleteTarget.id);
    setRestaurants(p => p.filter(r => r.id !== deleteTarget.id));
    setDeleteTarget(null); setDeleting(false); setDeleteInput("");
  }

  function mapRestaurant(r) {
    return { id: r.id, name: r.name, address: r.address, tables: r.tables_count, status: "active", emoji: r.logo_emoji, logo_emoji: r.logo_emoji, logo_url: r.logo_url || null, scans: 0, revenue: 3840, rating: null, orders: 0 };
  }

  useEffect(() => {
    supabase.from("restaurants").select("*").eq("owner_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = data ?? [];
        setRestaurants(list);
        setLoadingList(false);
      });

    // Silently refresh franchise group in cache (no redirect — user stays here)
    if (!franchiseGroup) {
      supabase.from("franchise_groups").select("*").eq("owner_id", user.id).maybeSingle()
        .then(({ data }) => {
          if (data) {
            localStorage.setItem(`vg_fg_${user.id}`, JSON.stringify(data));
            if (onFranchiseFound) onFranchiseFound(data);
          }
        });
    }
  }, [user.id]);

  const [franchiseError, setFranchiseError] = useState("");

  async function createFranchiseGroup() {
    setCreatingFranchise(true);
    setFranchiseError("");
    // Check localStorage cache first
    try {
      const cached = localStorage.getItem(`vg_fg_${user.id}`);
      if (cached) {
        const grp = JSON.parse(cached);
        if (grp?.id) { setCreatingFranchise(false); if (onFranchiseCreated) onFranchiseCreated(grp); return; }
      }
    } catch {}
    // Check if group already exists in Supabase
    const { data: existing } = await supabase.from("franchise_groups").select("*").eq("owner_id", user.id).maybeSingle();
    if (existing) {
      setCreatingFranchise(false);
      if (onFranchiseCreated) onFranchiseCreated(existing);
      return;
    }
    const { data, error } = await supabase.from("franchise_groups")
      .insert({ owner_id: user.id, name: "Mon Groupe", logo_emoji: "🏢", plan: "franchise" })
      .select().single();
    if (error) {
      setFranchiseError(`Erreur : ${error.message}`);
      setCreatingFranchise(false);
      return;
    }
    if (data) {
      // Link existing restaurants to the new group
      if (restaurants.length > 0) {
        await supabase.from("restaurants").update({ group_id: data.id }).eq("owner_id", user.id);
      }
      setCreatingFranchise(false);
      if (onFranchiseCreated) onFranchiseCreated(data);
    }
  }

  function slugify(name) {
    return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function uploadRestaurantLogo(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingRestLogo(true);
    if (user.id === "demo") { setNewRestLogoUrl(URL.createObjectURL(file)); setUploadingRestLogo(false); return; }
    const ext = file.name.split(".").pop();
    const path = `restaurant-logos/new-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("assets").upload(path, file, { upsert: true });
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from("assets").getPublicUrl(path);
      setNewRestLogoUrl(publicUrl);
    }
    setUploadingRestLogo(false);
  }

  async function uploadExistingRestaurantLogo(restaurantId, file) {
    const ext = file.name.split(".").pop();
    const path = `restaurant-logos/${restaurantId}.${ext}`;
    const { error: upErr } = await supabase.storage.from("assets").upload(path, file, { upsert: true });
    if (upErr) return null;
    const { data: { publicUrl } } = supabase.storage.from("assets").getPublicUrl(path);
    await supabase.from("restaurants").update({ logo_url: publicUrl }).eq("id", restaurantId);
    return publicUrl;
  }

  async function createRestaurant(e) {
    e.preventDefault(); setCreating(true); setCreateError("");
    const slug = `${slugify(form.name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error: err } = await supabase.from("restaurants")
      .insert({ ...form, owner_id: user.id, slug, tables_count: Number(form.tables_count), logo_url: newRestLogoUrl || null })
      .select().single();
    if (err) { setCreateError(err.message); setCreating(false); return; }
    // Create table records
    const tableRows = Array.from({ length: Number(form.tables_count) }, (_, i) => ({
      restaurant_id: data.id, number: i + 1,
      qr_url: `${window.location.origin}${BASE_PATH}/r/${data.id}/t/${i + 1}`,
    }));
    await supabase.from("tables").insert(tableRows);
    setRestaurants(p => [data, ...p]);
    setShowCreate(false);
    setForm({ name: "", address: "", logo_emoji: "🍽️", tables_count: 8 });
    setNewRestLogoUrl("");
    setCreating(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, ...FF }}>
      <style>{css}</style>
      <nav style={{ background: "rgba(245,245,247,0.9)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", position: "sticky", top: 0, zIndex: 100 }}>
        <Logo size={17} onClick={onHome} />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Language switcher */}
          <div style={{ display: "flex", gap: 4 }}>
            {LANG_OPTIONS.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)} title={l.name}
                style={{ width: 32, height: 28, borderRadius: 8, border: `1.5px solid ${lang === l.code ? C.dark : C.border}`, background: lang === l.code ? C.dark : "transparent", fontSize: 15, cursor: "pointer", lineHeight: 1, transition: "all 0.15s" }}>
                {l.flag}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={onLogout}>
            <span style={{ color: C.textSecondary, fontSize: 14 }}>{user.email}</span>
            <Avatar name={user.name || user.email} size={30} />
          </div>
        </div>
      </nav>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
        {franchiseGroup && (
          <div style={{ marginBottom: 28, background: "linear-gradient(135deg, #1C1C1E, #2C2C2E)", borderRadius: 18, padding: "24px 28px", cursor: "pointer" }} onClick={onFranchise}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{franchiseGroup.logo_emoji}</div>
                <div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Ma Franchise</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{franchiseGroup.name}</div>
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 18px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>Accéder →</span>
              </div>
            </div>
          </div>
        )}
        {!franchiseGroup && !loadingList && (
          <div style={{ marginBottom: 24 }}>
            {(() => {
              try {
                const cached = localStorage.getItem(`vg_fg_${user.id}`);
                const cachedGroup = cached ? JSON.parse(cached) : null;
                if (cachedGroup?.id) {
                  return (
                    <div style={{ marginBottom: 4, background: "linear-gradient(135deg, #1C1C1E, #2C2C2E)", borderRadius: 18, padding: "20px 24px", cursor: "pointer" }} onClick={onFranchise}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{cachedGroup.logo_emoji || "🏢"}</div>
                          <div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Ma Franchise</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{cachedGroup.name}</div>
                          </div>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 18px" }}>
                          <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>Accéder →</span>
                        </div>
                      </div>
                    </div>
                  );
                }
              } catch {}
              return (
                <>
                  <div style={{ padding: "16px 20px", borderRadius: 14, border: `1.5px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 2 }}>🏢 Gérer plusieurs restaurants ?</div>
                      <div style={{ fontSize: 12, color: C.textSecondary }}>Créez un groupe franchise pour piloter tout votre réseau depuis un seul dashboard.</div>
                    </div>
                    <Btn variant="primary" size="sm" onClick={createFranchiseGroup} disabled={creatingFranchise} style={{ flexShrink: 0 }}>
                      {creatingFranchise ? "Création..." : "Créer un groupe →"}
                    </Btn>
                  </div>
                  {franchiseError && (
                    <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 10, background: "#FFF0F0", border: `1px solid ${C.accent}40`, fontSize: 13, color: C.accent }}>
                      ⚠️ {franchiseError}
                      <div style={{ marginTop: 4, fontSize: 11, color: C.textSecondary }}>
                        Vérifiez les politiques RLS dans Supabase (franchise_groups : INSERT + SELECT pour authenticated).
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36 }}>
          <div>
            <p style={{ color: C.textSecondary, fontSize: 15, marginBottom: 4 }}>{greet}, <strong style={{ color: C.dark }}>{first}</strong> 👋</p>
            <h1 style={{ fontSize: 34, fontWeight: 800, color: C.dark, letterSpacing: "-0.04em" }}>
              {restaurants.length <= 1 ? "Mon restaurant" : "Mes restaurants"}
            </h1>
          </div>
          {restaurants.length === 0 && <Btn variant="primary" onClick={() => setShowCreate(true)}>+ Créer mon restaurant</Btn>}
        </div>

        {loadingList ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <div style={{ width: 24, height: 24, border: `2px solid ${C.dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ring 0.8s linear infinite" }} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: isMobile ? 10 : 16 }}>
            {restaurants.map(r => {
              const mapped = mapRestaurant(r);
              return (
                <Surface key={r.id} className="hover-lift" onClick={() => onSelect(mapped)} style={{ padding: 24, cursor: "pointer", transition: "all 0.2s", position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, overflow: "hidden", position: "relative" }}>
                      {r.logo_url
                        ? <img src={r.logo_url} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : r.logo_emoji}
                      <label title="Changer le logo" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0)", cursor: "pointer", borderRadius: 14, transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.4)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0)"}>
                        <span style={{ color: C.white, fontSize: 14, opacity: 0 }} className="logo-edit-icon">📷</span>
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={async ev => {
                          const file = ev.target.files?.[0]; if (!file) return;
                          const url = await uploadExistingRestaurantLogo(r.id, file);
                          if (url) setRestaurants(p => p.map(x => x.id === r.id ? { ...x, logo_url: url } : x));
                        }} onClick={e => e.stopPropagation()} />
                      </label>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Tag color={C.accentGreen}><Dot color={C.accentGreen} />Actif</Tag>
                      <button onClick={e => openDelete(e, r)} title="Supprimer ce restaurant"
                        style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textTertiary, fontSize: 14, flexShrink: 0, transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textTertiary; }}>
                        🗑
                      </button>
                    </div>
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
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) { setDeleteTarget(null); setDeleteStep(1); setDeleteInput(""); } }}>
          <Surface style={{ padding: 32, width: "100%", maxWidth: 420 }}>
            {deleteStep === 1 ? (
              <>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: C.dark, marginBottom: 8 }}>Supprimer ce restaurant ?</h2>
                  <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.6 }}>
                    Vous êtes sur le point de supprimer <strong style={{ color: C.dark }}>{deleteTarget.name}</strong>.<br />
                    Toutes les données (menu, commandes, tables) seront <strong style={{ color: C.accent }}>définitivement perdues</strong>.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn variant="ghost" full onClick={() => { setDeleteTarget(null); setDeleteStep(1); }}>Annuler</Btn>
                  <Btn variant="primary" full onClick={confirmDelete} style={{ background: C.accent }}>Oui, continuer →</Btn>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: C.dark, marginBottom: 8 }}>Confirmation finale</h2>
                  <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                    Pour confirmer, tapez <strong style={{ color: C.accent, fontFamily: "monospace" }}>supprimer</strong> ci-dessous :
                  </p>
                  <input
                    autoFocus
                    value={deleteInput}
                    onChange={e => setDeleteInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && deleteInput.trim().toLowerCase() === "supprimer" && confirmDelete()}
                    placeholder="supprimer"
                    style={{ width: "100%", textAlign: "center", background: C.bg, border: `2px solid ${deleteInput.trim().toLowerCase() === "supprimer" ? C.accentGreen : C.border}`, borderRadius: 12, padding: "14px 16px", fontSize: 16, color: C.dark, outline: "none", letterSpacing: "0.05em", ...FF, transition: "border-color 0.2s" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn variant="ghost" full onClick={() => { setDeleteTarget(null); setDeleteStep(1); setDeleteInput(""); }}>Annuler</Btn>
                  <Btn variant="primary" full disabled={deleteInput.trim().toLowerCase() !== "supprimer" || deleting}
                    onClick={confirmDelete}
                    style={{ background: deleteInput.trim().toLowerCase() === "supprimer" ? C.accent : C.border, transition: "background 0.2s" }}>
                    {deleting ? "Suppression..." : "🗑 Supprimer définitivement"}
                  </Btn>
                </div>
              </>
            )}
          </Surface>
        </div>
      )}

      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24 }}>
          <Surface style={{ padding: 32, width: "100%", maxWidth: 440 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: C.dark, marginBottom: 24 }}>Nouveau restaurant</h2>
            <form onSubmit={createRestaurant}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Logo</label>
                  <label style={{ width: 60, height: 60, borderRadius: 14, background: C.bg, border: `2px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", flexShrink: 0, position: "relative" }}>
                    {newRestLogoUrl
                      ? <img src={newRestLogoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 24 }}>{form.logo_emoji}</span>}
                    {uploadingRestLogo && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: C.white, fontSize: 12 }}>...</span></div>}
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={uploadRestaurantLogo} />
                  </label>
                  <p style={{ fontSize: 10, color: C.textTertiary, textAlign: "center", marginTop: 4 }}>Photo</p>
                </div>
                <div style={{ width: 52 }}>
                  <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Emoji</label>
                  <input value={form.logo_emoji} onChange={fv("logo_emoji")} style={{ width: 52, textAlign: "center", background: C.bg, border: "none", borderRadius: 12, padding: "12px 8px", fontSize: 24, outline: "none" }} />
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
// ALERT BUBBLES — floating alert cards fixed to top-right
// ─────────────────────────────────────────────────────────────────────────────
function CampaignModal({ campaign, restaurant, store, onClose }) {
  const [sent, setSent] = useState(false);
  const [subject, setSubject] = useState(`${campaign.emoji} ${campaign.name} — Offre exclusive pour vous !`);
  const [msgText, setMsgText] = useState(campaign.msg || "");
  const isDemo = restaurant?.id === "demo";
  const orders = store?.orders ?? [];
  const avgTicket = orders.length ? (orders.reduce((s, o) => s + o.total, 0) / orders.length) : 18;
  const clientCount = campaign.clientCount ?? 0;
  const estRevenue = (clientCount * avgTicket).toFixed(0);

  async function send() {
    setSent(true);
    await store.launchCampaign({ ...campaign, msg: msgText }, isDemo);
    setTimeout(onClose, 1800);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: C.white, borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", ...FF }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ background: campaign.color + "15", borderBottom: `1px solid ${campaign.color}25`, padding: "18px 22px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0 }}>
          <span style={{ fontSize: 28 }}>{campaign.emoji}</span>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{campaign.name}</p>
            <p style={{ fontSize: 12, color: C.textSecondary }}>{campaign.subtitle}</p>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textTertiary }}>×</button>
        </div>
        <div style={{ padding: "20px 22px" }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ background: C.bg, borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: campaign.color }}>{clientCount}</p>
              <p style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>clients ciblés</p>
            </div>
            <div style={{ background: C.bg, borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: C.accentGreen }}>{estRevenue}€</p>
              <p style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>CA estimé récupéré</p>
            </div>
          </div>

          {/* Editable email composer */}
          <p style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 10 }}>✏️ Personnalisez votre message</p>
          <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ background: C.bg, padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>De : {restaurant?.name ?? "Votre restaurant"} &lt;contact@wegemo.fr&gt;</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <p style={{ fontSize: 11, color: C.textTertiary, flexShrink: 0 }}>Objet :</p>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  style={{ flex: 1, border: "none", background: "transparent", fontSize: 12, color: C.dark, fontWeight: 600, outline: "none", ...FF }} />
              </div>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Bonjour {"{prénom}"} 👋</p>
              <textarea value={msgText} onChange={e => setMsgText(e.target.value)}
                rows={4}
                style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: C.textSecondary, lineHeight: 1.6, resize: "vertical", outline: "none", ...FF }} />
              <div style={{ background: campaign.color, borderRadius: 8, padding: "8px 14px", textAlign: "center", display: "inline-block", marginTop: 10 }}>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>Voir la carte →</span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 11, color: C.textTertiary, marginBottom: 16 }}>📧 Envoi réel via Resend API (clé RESEND_API_KEY dans les secrets Supabase)</p>
          {sent
            ? <div style={{ background: C.accentGreen + "15", border: `1px solid ${C.accentGreen}30`, borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.accentGreen }}>✓ Campagne lancée vers {clientCount} clients !</p>
              </div>
            : <button onClick={send} style={{ width: "100%", background: campaign.color, color: "#fff", border: "none", borderRadius: 12, padding: "13px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", ...FF }}>
                🚀 Lancer la campagne ({clientCount} clients)
              </button>
          }
        </div>
      </div>
    </div>
  );
}

function AlertBubbles({ store, restaurant }) {
  const [dismissed, setDismissed] = useState(new Set());
  const [campaign, setCampaign] = useState(null);
  const [visibleIdx, setVisibleIdx] = useState(0);
  const isMobile = useIsMobile();
  const shownRef = useRef(new Set());

  const ingredients = store.ingredients ?? [];
  const orders = store.orders ?? [];
  const isDemo = restaurant?.id === "demo";

  // Inactive clients: customer_email seen, last order > 30 days ago
  const inactiveClients = (() => {
    if (isDemo) return 34;
    const now = Date.now();
    const byEmail = {};
    for (const o of orders) {
      if (!o.customer_email) continue;
      const t = new Date(o.created_at || 0).getTime();
      if (!byEmail[o.customer_email] || t > byEmail[o.customer_email]) byEmail[o.customer_email] = t;
    }
    return Object.values(byEmail).filter(t => now - t > 30 * 86400000).length;
  })();

  const avgTicket = orders.length ? (orders.reduce((s, o) => s + o.total, 0) / orders.length) : 18;
  const upcomingEvents = getUpcomingEvents(45);

  const allAlerts = [
    ...orders.filter(o => o.status !== "served" && o.elapsed >= 20).map(o => ({
      id: `urgent-${o.id}`, icon: "🔴", label: "Commande urgente",
      text: `Table ${o.table} — ${o.elapsed} min`, color: C.accent, type: "ops",
    })),
    ...orders.filter(o => o.status === "new").map(o => ({
      id: `new-${o.id}`, icon: "🟡", label: "Nouvelle commande",
      text: `Table ${o.table} · ${o.total.toFixed(2)}€`, color: C.accentBlue, type: "ops",
    })),
    ...ingredients.filter(i => i.stock > 0 && i.alert_threshold != null && i.stock <= i.alert_threshold).map(i => ({
      id: `low-${i.id}`, icon: "🟠", label: "Stock bas",
      text: `${i.emoji} ${i.name} (${+i.stock.toFixed(2)} ${i.unit})`, color: C.accentOrange, type: "ops",
    })),
    ...ingredients.filter(i => i.stock === 0).map(i => ({
      id: `out-${i.id}`, icon: "🔴", label: "Rupture de stock",
      text: `${i.emoji} ${i.name}`, color: C.accent, type: "ops",
    })),
    ...(inactiveClients > 0 ? [{
      id: "inactive-clients", icon: "💤", label: `${inactiveClients} clients inactifs ce mois`,
      text: `Potentiel : ~${Math.round(inactiveClients * avgTicket)}€ récupérables`,
      color: C.accentPurple, type: "campaign",
      campaignData: {
        emoji: "💤", name: "Clients inactifs — Reviens nous voir !",
        subtitle: `${inactiveClients} clients sans commande depuis 30+ jours`,
        color: C.accentPurple, clientCount: inactiveClients,
        msg: `Ça fait un moment qu'on ne vous a pas vu ! Revenez découvrir nos nouveautés — on a une petite surprise pour vous. Réservez votre table dès maintenant et profitez d'une offre de bienvenue exclusive.`,
      },
    }] : []),
    ...upcomingEvents.map(ev => ({
      id: `event-${ev.name}`, icon: ev.emoji,
      label: `${ev.name} dans ${ev.daysLeft} jour${ev.daysLeft > 1 ? "s" : ""}`,
      text: ev.msg, color: ev.color, type: "campaign",
      campaignData: {
        emoji: ev.emoji, name: `Campagne ${ev.name}`,
        subtitle: `J-${ev.daysLeft} · ${ev.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`,
        color: ev.color, clientCount: isDemo ? 67 : Math.max(20, Math.floor(orders.length * 0.6)),
        msg: ev.msg,
      },
    })),
  ].filter(a => !dismissed.has(a.id));

  function dismissAlert(id) {
    setDismissed(prev => new Set([...prev, id]));
  }

  // Auto-dismiss each new alert after 5s (once shown, never repeat in session)
  useEffect(() => {
    for (const a of allAlerts) {
      if (!shownRef.current.has(a.id)) {
        shownRef.current.add(a.id);
        setTimeout(() => dismissAlert(a.id), 5000);
      }
    }
  });
  // Reset index if it's out of bounds after dismiss
  const safeIdx = allAlerts.length > 0 ? visibleIdx % allAlerts.length : 0;
  const visibleAlerts = allAlerts.length > 0 ? [allAlerts[safeIdx]] : [];

  if (allAlerts.length === 0 && !campaign) return null;

  return (
    <>
      {campaign && <CampaignModal campaign={campaign} restaurant={restaurant} store={store} onClose={() => setCampaign(null)} />}
      <div style={{ position: "fixed", ...(isMobile ? { bottom: 72, left: 8, right: 8 } : { top: 72, right: 80 }), zIndex: 500, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        {allAlerts.length > 1 && (
          <div style={{ pointerEvents: "all", display: "flex", justifyContent: isMobile ? "center" : "flex-end", marginBottom: 2 }}>
            <span style={{ fontSize: 10, color: C.textTertiary, background: C.white, borderRadius: 20, padding: "2px 8px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>{safeIdx + 1} / {allAlerts.length}</span>
          </div>
        )}
        {visibleAlerts.map(alert => (
          <div key={alert.id} style={{
            minWidth: 260, maxWidth: 320, background: C.white, borderRadius: 14,
            padding: "10px 14px", boxShadow: "0 4px 24px rgba(0,0,0,0.13)",
            borderLeft: `3px solid ${alert.color}`,
            animation: "slideDown 0.2s ease", pointerEvents: "all", ...FF,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{alert.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: alert.color, marginBottom: 2 }}>{alert.label}</p>
                <p style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.4 }}>{alert.text}</p>
                {alert.type === "campaign" && (
                  <button onClick={() => setCampaign(alert.campaignData)}
                    style={{ marginTop: 8, background: alert.color, color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", ...FF }}>
                    🚀 Lancer la campagne
                  </button>
                )}
              </div>
              <button onClick={() => dismissAlert(alert.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.textTertiary, fontSize: 14, padding: "0 2px", lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS TAB
// ─────────────────────────────────────────────────────────────────────────────
const settingsInputStyle = (focused) => ({ width: "100%", background: focused ? "#fff" : "#F5F5F7", border: `1.5px solid ${focused ? "#1D1D1F" : "transparent"}`, borderRadius: 12, padding: "12px 44px 12px 14px", color: "#1D1D1F", fontSize: 15, outline: "none", transition: "all 0.15s", boxSizing: "border-box", fontFamily: "'Figtree', -apple-system, sans-serif" });
const settingsEyeBtn = { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.textTertiary, padding: 4 };

function SettingsPwField({ label, placeholder, value, onChange, shown, onToggle }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input type={shown ? "text" : "password"} placeholder={placeholder} value={value}
          onChange={onChange} style={settingsInputStyle(focused)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        <button style={settingsEyeBtn} onClick={onToggle} type="button">{shown ? "🙈" : "👁"}</button>
      </div>
    </div>
  );
}

function SettingsTxtField({ label, placeholder, value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}</label>
      <input type="text" placeholder={placeholder} value={value} onChange={onChange}
        style={settingsInputStyle(focused)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
    </div>
  );
}

function SettingsTab({ restaurant, onRestaurantUpdate }) {
  const store = useContext(StoreCtx);
  const emptySettings = { resend_api_key: "", resend_from: "", stripe_publishable_key: "", stripe_secret_key: "", google_review_url: "", google_review_enabled: false };
  const [settings, setSettings] = useState(emptySettings);
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState({ resend_api_key: false, stripe_secret_key: false });
  const [logoUrl, setLogoUrl] = useState(restaurant.logo_url || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [menuWelcomeBg, setMenuWelcomeBg] = useState("");
  const [menuHeaderBg, setMenuHeaderBg] = useState("");
  const [menuBodyBg, setMenuBodyBg] = useState("");
  const [uploadingBg, setUploadingBg] = useState(null); // "welcome"|"header"|"body"|null

  async function uploadLogo(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingLogo(true);
    if (restaurant.id === "demo") {
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
      if (onRestaurantUpdate) onRestaurantUpdate({ logo_url: url });
      setUploadingLogo(false);
      return;
    }
    const ext = file.name.split(".").pop();
    const path = `restaurant-logos/${restaurant.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from("assets").upload(path, file, { upsert: true });
    if (upErr) { store.pushNotif("Erreur upload : " + upErr.message, "warning"); setUploadingLogo(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("assets").getPublicUrl(path);
    await supabase.from("restaurants").update({ logo_url: publicUrl }).eq("id", restaurant.id);
    setLogoUrl(publicUrl);
    if (onRestaurantUpdate) onRestaurantUpdate({ logo_url: publicUrl });
    store.pushNotif("✅ Logo mis à jour", "success");
    setUploadingLogo(false);
  }

  async function removeLogo() {
    if (restaurant.id === "demo") { setLogoUrl(""); if (onRestaurantUpdate) onRestaurantUpdate({ logo_url: null }); return; }
    await supabase.from("restaurants").update({ logo_url: null }).eq("id", restaurant.id);
    setLogoUrl("");
    if (onRestaurantUpdate) onRestaurantUpdate({ logo_url: null });
    store.pushNotif("Logo supprimé", "success");
  }

  const MENU_BG_ZONES = [
    { key: "welcome", label: "Écran d'accueil", hint: "Fond de l'écran Sur place / À emporter", col: "menu_background_url", state: menuWelcomeBg, set: setMenuWelcomeBg, icon: "🏠" },
    { key: "header",  label: "Bandeau supérieur", hint: "La barre sombre avec le nom du restaurant et le numéro de table", col: "menu_header_bg_url", state: menuHeaderBg, set: setMenuHeaderBg, icon: "🔝" },
    { key: "body",    label: "Zone du menu", hint: "Le fond blanc où s'affichent les plats", col: "menu_body_bg_url", state: menuBodyBg, set: setMenuBodyBg, icon: "📋" },
  ];

  async function uploadMenuZoneBg(zone, e) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingBg(zone.key);
    if (restaurant.id === "demo") {
      zone.set(URL.createObjectURL(file));
      setUploadingBg(null);
      return;
    }
    const ext = file.name.split(".").pop();
    const path = `menu-backgrounds/${restaurant.id}-${zone.key}.${ext}`;
    const { error: upErr } = await supabase.storage.from("assets").upload(path, file, { upsert: true });
    if (upErr) { store.pushNotif("Erreur upload : " + upErr.message, "warning"); setUploadingBg(null); return; }
    const { data: { publicUrl } } = supabase.storage.from("assets").getPublicUrl(path);
    await supabase.from("restaurant_settings").upsert({ restaurant_id: restaurant.id, [zone.col]: publicUrl, updated_at: new Date().toISOString() }, { onConflict: "restaurant_id" });
    zone.set(publicUrl);
    store.pushNotif("✅ Image mise à jour", "success");
    setUploadingBg(null);
  }

  async function removeMenuZoneBg(zone) {
    if (restaurant.id === "demo") { zone.set(""); return; }
    await supabase.from("restaurant_settings").upsert({ restaurant_id: restaurant.id, [zone.col]: null, updated_at: new Date().toISOString() }, { onConflict: "restaurant_id" });
    zone.set("");
    store.pushNotif("Image supprimée", "success");
  }

  useEffect(() => {
    if (restaurant.id === "demo") return;
    supabase.from("restaurant_settings").select("*").eq("restaurant_id", restaurant.id).single()
      .then(({ data, error }) => {
        if (data) {
          setSettings({ resend_api_key: data.resend_api_key || "", resend_from: data.resend_from || "", stripe_publishable_key: data.stripe_publishable_key || "", stripe_secret_key: data.stripe_secret_key || "", google_review_url: data.google_review_url || "", google_review_enabled: !!data.google_review_enabled });
          setMenuWelcomeBg(data.menu_background_url || "");
          setMenuHeaderBg(data.menu_header_bg_url || "");
          setMenuBodyBg(data.menu_body_bg_url || "");
        } else if (error?.code !== "PGRST116") console.warn("Settings load error:", error?.message);
      });
  }, [restaurant.id]);

  function toggleShow(field) { setShow(p => ({ ...p, [field]: !p[field] })); }
  function set(field) { return e => setSettings(p => ({ ...p, [field]: e.target.value })); }

  async function save() {
    if (restaurant.id === "demo") {
      store.pushNotif("Indisponible en mode démo", "warning");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("restaurant_settings").upsert({ restaurant_id: restaurant.id, ...settings, updated_at: new Date().toISOString() }, { onConflict: "restaurant_id" });
    setSaving(false);
    if (error) store.pushNotif("Erreur : " + error.message, "warning");
    else store.pushNotif("✅ Configuration enregistrée", "success");
  }

  function ExtLink({ href, children }) {
    return (
      <a href="#" onClick={e => { e.preventDefault(); window.open(href, "_blank", "noopener"); }}
        style={{ fontSize: 13, color: C.accentBlue, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}>
        {children} →
      </a>
    );
  }

  function StatusBadge({ label, ok, hint }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: ok ? C.accentGreen + "18" : C.accent + "18", color: ok ? C.accentGreen : C.accent, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20, alignSelf: "flex-start" }}>
          <span>{ok ? "✓" : "✗"}</span> {label}
        </span>
        <span style={{ fontSize: 11, color: C.textTertiary }}>{hint}</span>
      </div>
    );
  }

  const emailOk = !!settings.resend_api_key;
  const stripeOk = !!(settings.stripe_publishable_key && settings.stripe_secret_key);
  const googleOk = !!(settings.google_review_url && settings.google_review_enabled);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Logo */}
      <Surface style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 4 }}>🖼️ Logo du restaurant</h3>
        <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>Visible sur la page menu client, les cartes du tableau de bord et la franchise.</p>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: 18, background: C.bg, border: `2px dashed ${C.border}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, flexShrink: 0 }}>
            {logoUrl ? <img src={logoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (restaurant.logo_emoji || "🍽️")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.dark, color: C.white, borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {uploadingLogo ? "Envoi…" : "📷 Choisir une photo"}
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={uploadLogo} disabled={uploadingLogo} />
            </label>
            {logoUrl && (
              <button onClick={removeLogo} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px", fontSize: 13, color: C.textSecondary, cursor: "pointer", ...FF }}>
                🗑 Supprimer le logo
              </button>
            )}
          </div>
        </div>
      </Surface>

      {/* Menu customization */}
      <Surface style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 4 }}>🎨 Personnalisation du menu client</h3>
        <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>Personnalisez chaque zone de la page menu de vos clients. Laissez vide pour garder l'apparence par défaut.</p>
        {/* Phone mockup preview */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div style={{ width: 160, borderRadius: 24, border: "3px solid #1D1D1F", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", background: C.white }}>
            {/* welcome zone preview */}
            <div style={{ height: 48, background: menuWelcomeBg ? `url(${menuWelcomeBg}) center/cover` : "#f0f0f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: menuWelcomeBg ? "#fff" : C.textTertiary, fontWeight: 600, textShadow: menuWelcomeBg ? "0 1px 3px rgba(0,0,0,0.6)" : "none", position: "relative" }}>
              {!menuWelcomeBg && "🏠 Accueil"}
              {menuWelcomeBg && <span style={{ background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 4 }}>🏠 Accueil</span>}
            </div>
            {/* header zone preview */}
            <div style={{ height: 44, background: menuHeaderBg ? `url(${menuHeaderBg}) center/cover` : "#1D1D1F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: menuHeaderBg ? "#fff" : "rgba(255,255,255,0.5)", fontWeight: 600, textShadow: menuHeaderBg ? "0 1px 3px rgba(0,0,0,0.6)" : "none" }}>
              {menuHeaderBg ? <span style={{ background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 4 }}>🔝 Bandeau</span> : "🔝 Bandeau"}
            </div>
            {/* body zone preview */}
            <div style={{ height: 72, background: menuBodyBg ? `url(${menuBodyBg}) center/cover` : C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: menuBodyBg ? "#fff" : C.textTertiary, fontWeight: 600, textShadow: menuBodyBg ? "0 1px 3px rgba(0,0,0,0.6)" : "none", borderTop: `1px solid ${C.border}` }}>
              {menuBodyBg ? <span style={{ background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 4 }}>📋 Menu</span> : "📋 Zone menu"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {MENU_BG_ZONES.map(zone => (
            <div key={zone.key} style={{ background: C.bg, borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: 14, overflow: "hidden", flexShrink: 0, border: `2px dashed ${zone.state ? "transparent" : C.border}`, background: zone.state ? `url(${zone.state}) center/cover` : C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                {!zone.state && zone.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: C.dark, marginBottom: 2 }}>{zone.label}</p>
                <p style={{ fontSize: 12, color: C.textSecondary, marginBottom: 10 }}>{zone.hint}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.dark, color: C.white, borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {uploadingBg === zone.key ? "Envoi…" : "📷 Photo"}
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => uploadMenuZoneBg(zone, e)} disabled={!!uploadingBg} />
                  </label>
                  {zone.state && (
                    <button onClick={() => removeMenuZoneBg(zone)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: C.textSecondary, cursor: "pointer", ...FF }}>
                      🗑 Supprimer
                    </button>
                  )}
                  {zone.state && <span style={{ alignSelf: "center", fontSize: 11, color: C.accentGreen, fontWeight: 600 }}>✓ Photo active</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Surface>

      {/* Email */}
      <Surface style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 4 }}>📧 Email — Resend</h3>
        <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>Utilisé pour envoyer vos campagnes email à vos clients.</p>
        <SettingsPwField label="Clé API Resend" placeholder="re_xxxx..." value={settings.resend_api_key} onChange={set("resend_api_key")} shown={!!show.resend_api_key} onToggle={() => toggleShow("resend_api_key")} />
        <SettingsTxtField label="Email expéditeur" placeholder="contact@monresto.fr" value={settings.resend_from} onChange={set("resend_from")} />
        <ExtLink href="https://resend.com">Obtenir une clé API Resend</ExtLink>
      </Surface>

      {/* Stripe */}
      <Surface style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 4 }}>💳 Paiement en ligne — Stripe</h3>
        <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>Permet à vos clients de payer en ligne par carte bancaire.</p>
        <SettingsTxtField label="Clé publique Stripe" placeholder="pk_live_..." value={settings.stripe_publishable_key} onChange={set("stripe_publishable_key")} />
        <SettingsPwField label="Clé secrète Stripe" placeholder="sk_live_..." value={settings.stripe_secret_key} onChange={set("stripe_secret_key")} shown={!!show.stripe_secret_key} onToggle={() => toggleShow("stripe_secret_key")} />
        <ExtLink href="https://dashboard.stripe.com/apikeys">Obtenir vos clés Stripe</ExtLink>
      </Surface>

      {/* Google Reviews */}
      <Surface style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 4 }}>⭐ Avis Google</h3>
        <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>Après chaque commande QR, proposez à vos clients de laisser un avis Google sur votre établissement.</p>
        <SettingsTxtField label="URL de votre page avis Google" placeholder="https://g.page/r/xxxxx/review" value={settings.google_review_url} onChange={set("google_review_url")} />
        <p style={{ fontSize: 11, color: C.textTertiary, marginBottom: 16, marginTop: -10 }}>
          Trouvez votre lien sur <a href="https://business.google.com" target="_blank" rel="noreferrer" style={{ color: C.accentBlue }}>Google Business Profile</a> → Demander des avis
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: C.bg, borderRadius: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Activer le bouton "Laisser un avis Google"</div>
            <div style={{ fontSize: 12, color: C.textSecondary }}>S'affiche après chaque commande si l'URL est renseignée</div>
          </div>
          <div onClick={() => setSettings(p => ({ ...p, google_review_enabled: !p.google_review_enabled }))}
            style={{ width: 44, height: 26, borderRadius: 13, background: settings.google_review_enabled ? C.accentGreen : C.border, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: settings.google_review_enabled ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
          </div>
        </div>
      </Surface>

      {/* Status */}
      <Surface style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 16 }}>📊 Statut de configuration</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <StatusBadge label="Email" ok={emailOk} hint={emailOk ? "Clé Resend configurée — campagnes actives." : "Renseignez votre clé Resend pour activer les campagnes email."} />
          <StatusBadge label="Stripe" ok={stripeOk} hint={stripeOk ? "Clés Stripe configurées — paiement en ligne actif." : "Renseignez les deux clés Stripe pour activer le paiement en ligne."} />
          <StatusBadge label="Avis Google" ok={googleOk} hint={googleOk ? "Bouton Google activé — affiché après chaque commande QR." : "Renseignez l'URL Google et activez le toggle pour afficher le bouton."} />
        </div>
      </Surface>

      <Btn variant="primary" full onClick={save} disabled={saving}>
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Btn>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function DashboardPage({ user, restaurant, franchiseGroup, onBack, onLogout, onCuisine, onClient, onFranchise, onHome, onRestaurantUpdate }) {
  const store = useContext(StoreCtx);
  const [tab, setTab] = useState("overview");
  const isMobile = useIsMobile();
  const first = user.name || user.email.split("@")[0];
  const active = store.orders.filter(o => o.status !== "served");
  const ready = store.orders.filter(o => o.status === "ready");
  const [moreOpen, setMoreOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { lang, setLang, T } = useContext(LangCtx);

  const TABS = [
    { id: "setup", label: T.tab_setup, icon: "⚡" },
    { id: "overview", label: T.tab_overview, icon: "🏠" },
    { id: "orders", label: T.tab_orders, icon: "📋" },
    { id: "caisse", label: T.tab_caisse, icon: "💰" },
    { id: "qrcode", label: T.tab_qrcode, icon: "📷" },
    { id: "inventory", label: T.tab_inventory, icon: "📦" },
    { id: "promos", label: "Promos", icon: "🎁" },
    { id: "crm", label: "CRM", icon: "👥" },
    { id: "menu", label: "Carte", icon: "🍽️" },
    { id: "settings", label: T.tab_settings, icon: "⚙️" },
  ];
  // Main 5 bottom nav tabs + "more" drawer for rest
  const MOBILE_TABS = [
    { id: "overview", icon: "🏠", label: T.m_overview },
    { id: "orders", icon: "📋", label: T.m_orders },
    { id: "caisse", icon: "💰", label: T.m_caisse },
    { id: "crm", icon: "👥", label: T.m_crm },
    { id: "promos", icon: "🎁", label: T.m_promos },
  ];
  const MORE_TABS = [
    { id: "menu", icon: "🍽️", label: T.m_menu },
    { id: "qrcode", icon: "📷", label: T.m_qrcode },
    { id: "inventory", icon: "📦", label: T.m_inventory },
    { id: "setup", icon: "⚡", label: T.m_setup },
    { id: "settings", icon: "⚙️", label: T.tab_settings },
  ];
  const demoBanner = restaurant.id === "demo";
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", ...FF }}>
      <style>{css}</style>
      <Toasts notifs={store.notifications} />
      {demoBanner && <OnboardingBar demoMode="restaurant" />}
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
          <div style={{ padding: "20px 16px 16px" }}>
            <Logo size={16} onClick={onHome} />
            <div onClick={onBack} style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: C.bg, cursor: "pointer" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, background: C.border }}>
                {restaurant.logo_url ? <img src={restaurant.logo_url} alt={restaurant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : restaurant.emoji}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, letterSpacing: "-0.01em" }}>{restaurant.name}</div>
                <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }}>← Changer</div>
              </div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: "4px 10px" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ width: "100%", display: "flex", alignItems: "center", padding: "9px 12px", borderRadius: 10, border: "none", background: t.id === "setup" ? (tab === "setup" ? C.accentOrange + "20" : C.accentOrange + "10") : tab === t.id ? C.bg : "transparent", color: t.id === "setup" ? C.accentOrange : tab === t.id ? C.dark : C.textSecondary, fontWeight: tab === t.id || t.id === "setup" ? 600 : 400, fontSize: 14, cursor: "pointer", textAlign: "left", marginBottom: 2, transition: "all 0.15s", ...FF }}>
                {t.icon} <span style={{ marginLeft: 8 }}>{t.label}</span>
                {t.id === "orders" && active.length > 0 && <span style={{ marginLeft: "auto", background: C.dark, color: C.white, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20 }}>{active.length}</span>}
              </button>
            ))}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <button onClick={onCuisine} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: "none", background: ready.length > 0 ? C.accentGreen + "15" : C.bg, color: ready.length > 0 ? C.accentGreen : C.textSecondary, fontWeight: 600, fontSize: 14, cursor: "pointer", marginBottom: 4, ...FF }}>
                <Dot color={C.accentGreen} pulse={ready.length > 0} />Vue cuisine
                {ready.length > 0 && <span style={{ marginLeft: "auto", background: C.accentGreen, color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20 }}>{ready.length} prête{ready.length > 1 ? "s" : ""}</span>}
              </button>
              <button onClick={onClient} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: "none", background: C.bg, color: C.textSecondary, fontWeight: 500, fontSize: 14, cursor: "pointer", ...FF }}>
                <span style={{ fontSize: 14 }}>📱</span> {T.btn_client}
              </button>
              {franchiseGroup && (
                <button onClick={onFranchise} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: "none", background: C.dark + "10", color: C.dark, fontWeight: 600, fontSize: 14, cursor: "pointer", marginTop: 4, ...FF }}>
                  <span style={{ fontSize: 14 }}>🏢</span> Réseau
                </button>
              )}
            </div>
          </nav>
          <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}` }}>
            {/* Language switcher */}
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {LANG_OPTIONS.map(l => (
                <button key={l.code} onClick={() => setLang(l.code)} title={l.name}
                  style={{ flex: 1, padding: "5px 0", borderRadius: 8, border: `1.5px solid ${lang === l.code ? C.dark : C.border}`, background: lang === l.code ? C.dark : "transparent", fontSize: 14, cursor: "pointer", transition: "all 0.15s" }}>
                  {l.flag}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Avatar name={user.name || user.email} size={30} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{user.name}</div>
                <div style={{ fontSize: 11, color: C.textTertiary }}>{user.email}</div>
              </div>
            </div>
            {user.id !== "demo" && onLogout && (
              <button onClick={onLogout} style={{ width: "100%", padding: "7px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "transparent", color: C.textSecondary, fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", ...FF }}>
                ⏻ Déconnexion
              </button>
            )}
          </div>
        </aside>
      )}
      <AgentChat restaurant={restaurant} store={store} />
      <AlertBubbles store={store} restaurant={restaurant} />
      <main style={{ flex: 1, minWidth: 0, overflow: "auto", paddingBottom: isMobile ? 72 : 0 }}>
        {isMobile ? (
          /* Mobile header */
          <header style={{ background: "rgba(245,245,247,0.95)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`, padding: "0 16px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
            <div onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, background: C.border }}>
                {restaurant.logo_url ? <img src={restaurant.logo_url} alt={restaurant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : restaurant.emoji}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{restaurant.name}</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {active.length > 0 && <button onClick={() => setTab("orders")} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", ...FF }}>{active.length} cmd</button>}
              <button onClick={onCuisine} style={{ background: ready.length > 0 ? C.accentGreen : C.bg, color: ready.length > 0 ? "#fff" : C.textSecondary, border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", ...FF }}>🍳</button>
              <button onClick={() => setNotifOpen(o => !o)} style={{ position: "relative", width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${C.border}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, cursor: "pointer" }}>
                🔔
                {store.notifHistory.length > 0 && (
                  <span style={{ position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, background: C.accent, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", border: "2px solid #fff" }}>
                    {store.notifHistory.length > 99 ? "99+" : store.notifHistory.length}
                  </span>
                )}
              </button>
            </div>
          </header>
        ) : (
          /* Desktop header */
          <header style={{ background: "rgba(245,245,247,0.9)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`, padding: "0 32px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.dark, letterSpacing: "-0.02em" }}>{TABS.find(t => t.id === tab)?.label}</h2>
              <p style={{ fontSize: 12, color: C.textTertiary }}>{T.welcome}, {first} · {new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : lang === "pt" ? "pt-PT" : "en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Btn variant="ghost" size="sm" onClick={onCuisine}>🍳 {T.btn_kitchen}{ready.length > 0 ? ` (${ready.length})` : ""}</Btn>
              <Btn variant="primary" size="sm" onClick={onClient}>📱 {T.btn_client}</Btn>
              <button onClick={() => setNotifOpen(o => !o)} style={{ position: "relative", width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${notifOpen ? C.dark : C.border}`, background: notifOpen ? C.bg : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, cursor: "pointer" }}>
                🔔
                {store.notifHistory.length > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, background: C.accent, color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid #fff" }}>
                    {store.notifHistory.length > 99 ? "99+" : store.notifHistory.length}
                  </span>
                )}
              </button>
            </div>
          </header>
        )}
        {notifOpen && (
          <>
            <div onClick={() => setNotifOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 198 }} />
            <div style={{ position: "fixed", top: isMobile ? 52 : 56, right: isMobile ? 8 : 16, left: isMobile ? 8 : "auto", width: isMobile ? "auto" : 360, maxHeight: 520, background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: "0 16px 48px rgba(0,0,0,0.18)", zIndex: 199, display: "flex", flexDirection: "column", overflow: "hidden", ...FF }}>
              {/* Header */}
              <div style={{ padding: "14px 16px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.white }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: C.dark }}>🔔 Boîte de réception</span>
                  {store.notifHistory.length > 0 && (
                    <span style={{ background: C.accent + "18", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700, color: C.accent }}>{store.notifHistory.length}</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {store.notifHistory.length > 0 && (
                    <button onClick={() => { store.clearNotifHistory?.(); }} style={{ border: "none", background: C.bg, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>Tout effacer</button>
                  )}
                  <button onClick={() => setNotifOpen(false)} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: C.textSecondary, lineHeight: 1, padding: "0 2px" }}>×</button>
                </div>
              </div>
              {/* List */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                {store.notifHistory.length === 0 ? (
                  <div style={{ padding: "40px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🔕</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.dark, marginBottom: 6 }}>Aucune notification</div>
                    <div style={{ fontSize: 12, color: C.textTertiary }}>Les nouvelles commandes et alertes apparaîtront ici</div>
                  </div>
                ) : store.notifHistory.map(n => {
                  const colors = { info: C.accentBlue, success: C.accentGreen, warning: C.accentOrange, new: C.accent };
                  const icons = { info: "ℹ️", success: "✅", warning: "⚠️", new: "🆕" };
                  const now = new Date();
                  const diff = Math.floor((now - new Date(n.ts)) / 60000);
                  const timeLabel = diff < 1 ? "à l'instant" : diff < 60 ? `il y a ${diff} min` : diff < 1440 ? `il y a ${Math.floor(diff/60)}h` : new Date(n.ts).toLocaleDateString("fr-FR");
                  return (
                    <div key={n.id} style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "flex-start", transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bg}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: (colors[n.type] || C.accentBlue) + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{icons[n.type] || "🔔"}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.4, fontWeight: 500 }}>{n.msg}</div>
                        <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 3 }}>{timeLabel}</div>
                      </div>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: colors[n.type] || C.accentBlue, marginTop: 8, flexShrink: 0 }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
        <div style={{ padding: isMobile ? "12px 12px" : "28px 32px" }}>
          {tab === "overview" && <OverviewTab store={store} restaurant={restaurant} onCuisine={onCuisine} onClient={onClient} />}
          {tab === "orders" && <OrdersTab store={store} restaurant={restaurant} />}
          {tab === "caisse" && <CaisseTab store={store} restaurant={restaurant} />}
          {tab === "qrcode" && <QRTab restaurant={restaurant} />}
          {tab === "setup" && <SetupTab restaurant={restaurant} onDone={() => setTab("overview")} />}
          {tab === "inventory" && <InventoryTab restaurant={restaurant} />}
          {tab === "promos" && <PromosTab restaurant={restaurant} store={store} />}
          {tab === "crm" && <CRMTab restaurant={restaurant} store={store} />}
          {tab === "menu" && <MenuTabDash restaurant={restaurant} />}
          {tab === "settings" && <SettingsTab restaurant={restaurant} onRestaurantUpdate={onRestaurantUpdate} />}
        </div>
      </main>
      {/* Mobile bottom nav */}
      {isMobile && (
        <>
          {/* More drawer backdrop */}
          {moreOpen && <div style={{ position: "fixed", inset: 0, zIndex: 590 }} onClick={() => setMoreOpen(false)} />}
          {/* More drawer */}
          {moreOpen && (
            <div style={{ position: "fixed", bottom: 64, left: 0, right: 0, zIndex: 595, background: C.surface, borderTop: `1px solid ${C.border}`, borderRadius: "16px 16px 0 0", padding: "12px 8px 4px", boxShadow: "0 -8px 32px rgba(0,0,0,0.12)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
                {MORE_TABS.map(t => (
                  <button key={t.id} onClick={() => { setTab(t.id); setMoreOpen(false); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "12px 4px", border: "none", background: tab === t.id ? C.bg : "none", borderRadius: 12, cursor: "pointer", ...FF }}>
                    <span style={{ fontSize: 22 }}>{t.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? C.dark : C.textSecondary }}>{t.label}</span>
                  </button>
                ))}
                {user.id !== "demo" && onLogout && (
                  <button onClick={onLogout} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "12px 4px", border: "none", background: "none", borderRadius: 12, cursor: "pointer", ...FF }}>
                    <span style={{ fontSize: 22 }}>⏻</span>
                    <span style={{ fontSize: 11, fontWeight: 400, color: C.textSecondary }}>Déco.</span>
                  </button>
                )}
              </div>
            </div>
          )}
          <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 600, background: "rgba(250,250,252,0.97)", backdropFilter: "blur(20px)", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "stretch", height: 64 }}>
            {MOBILE_TABS.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setMoreOpen(false); }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, border: "none", background: "none", cursor: "pointer", position: "relative", ...FF }}>
                <span style={{ fontSize: 22 }}>{t.icon}</span>
                <span style={{ fontSize: 9, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? C.dark : C.textTertiary }}>{t.label}</span>
                {tab === t.id && <div style={{ position: "absolute", top: 0, left: "25%", right: "25%", height: 2, background: C.dark, borderRadius: 2 }} />}
                {t.id === "orders" && active.length > 0 && <div style={{ position: "absolute", top: 5, right: "18%", width: 16, height: 16, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>{active.length}</span></div>}
              </button>
            ))}
            {/* More button */}
            <button onClick={() => setMoreOpen(p => !p)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, border: "none", background: "none", cursor: "pointer", position: "relative", ...FF }}>
              <span style={{ fontSize: 22 }}>{moreOpen ? "✕" : "···"}</span>
              <span style={{ fontSize: 9, fontWeight: 400, color: MORE_TABS.some(t => t.id === tab) ? C.dark : C.textTertiary }}>Plus</span>
              {MORE_TABS.some(t => t.id === tab) && <div style={{ position: "absolute", top: 0, left: "25%", right: "25%", height: 2, background: C.dark, borderRadius: 2 }} />}
            </button>
          </nav>
        </>
      )}
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
    if (restaurantId === "demo") {
      setAlerts([{ id: "dm12", name: "Frites Maison", emoji: "🍟", stock: 3, category: "Accompagnements" }]);
      return;
    }
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
  const isMobile = useIsMobile();

  useEffect(() => {
    if (restaurant.id === "demo") {
      if (restaurant._demoStats) {
        const s = restaurant._demoStats;
        const ratios = [0.12, 0.10, 0.16, 0.18, 0.15, 0.17, 0.12];
        setWeeklyRev(ratios.map((r, i) => Math.round(s.ca_7j * r + (i === 6 ? s.ca_today * 0.1 : 0))));
      } else {
        setWeeklyRev(DEMO_WEEKLY_REV);
      }
      return;
    }
    // For real franchise restaurants, build weekly from _realStats if available while Supabase loads
    if (restaurant._realStats) {
      const s = restaurant._realStats;
      const ratios = [0.12, 0.10, 0.16, 0.18, 0.15, 0.17, 0.12];
      setWeeklyRev(ratios.map((r, i) => Math.round(s.ca_7j * r + (i === 6 ? s.ca_today * 0.1 : 0))));
    }
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
        // Only update if we got real data, else keep the _realStats estimate
        if ((data ?? []).length > 0 || !restaurant._realStats) setWeeklyRev(totals);
      });
  }, [restaurant.id]);

  const ds = restaurant._demoStats || restaurant._realStats;
  const active = store.orders.filter(o => o.status !== "served");
  const ready = store.orders.filter(o => o.status === "ready");
  const rev = ds ? ds.ca_today : store.revenue;
  const avgTicket = ds ? ds.avg_basket : (store.doneOrders.length > 0 ? store.revenue / store.doneOrders.length : 0);
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
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 20 }}>
        <KPICard label="Actives" value={ds ? ds.orders_today : active.length} sub="en cours" />
        <KPICard label="CA today" value={`${rev.toFixed(2)}€`} sub="clôturées" />
        <KPICard label="Servies" value={ds ? ds.orders_today : store.doneOrders.length} sub="aujourd'hui" />
        <KPICard label="Ticket moy." value={avgTicket > 0 ? `${avgTicket.toFixed(2)}€` : "—"} sub="moy." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 20 }}>
        <Surface onClick={onCuisine} style={{ padding: isMobile ? "12px 14px" : "18px 22px", cursor: "pointer", display: "flex", alignItems: "center", gap: isMobile ? 10 : 16 }} className="hover-lift">
          <div style={{ width: isMobile ? 36 : 48, height: isMobile ? 36 : 48, borderRadius: 12, background: C.accentGreen + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 18 : 22, flexShrink: 0 }}>🍳</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, color: C.dark, marginBottom: 2 }}>Cuisine</div>
            <div style={{ fontSize: isMobile ? 11 : 13, color: C.textSecondary }}>{active.length} en cours</div>
          </div>
          {!isMobile && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Dot color={C.accentGreen} pulse /><span style={{ color: C.accentGreen, fontSize: 12, fontWeight: 600 }}>LIVE</span></div>}
        </Surface>
        <Surface onClick={onClient} style={{ padding: isMobile ? "12px 14px" : "18px 22px", cursor: "pointer", display: "flex", alignItems: "center", gap: isMobile ? 10 : 16 }} className="hover-lift">
          <div style={{ width: isMobile ? 36 : 48, height: isMobile ? 36 : 48, borderRadius: 12, background: C.accentBlue + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 18 : 22, flexShrink: 0 }}>📱</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, color: C.dark, marginBottom: 2 }}>Vue client</div>
            <div style={{ fontSize: isMobile ? 11 : 13, color: C.textSecondary }}>Aperçu carte</div>
          </div>
        </Surface>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr", gap: isMobile ? 8 : 12 }}>
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

function EditOrderModal({ order, restaurant, onClose, onSaved }) {
  const isDemo = restaurant.id === "demo";
  const [items, setItems] = useState(order.items.map(it => ({ ...it })));
  const [menuItems, setMenuItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isDemo) { setMenuItems(DEMO_MENU); return; }
    supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id).eq("available", true).order("category").order("name")
      .then(({ data }) => setMenuItems(data ?? []));
  }, []);

  function setQty(id, delta) {
    setItems(prev => {
      const next = prev.map(it => it.id === id ? { ...it, qty: Math.max(0, it.qty + delta) } : it).filter(it => it.qty > 0);
      return next;
    });
  }

  function addMenuItem(mi) {
    setItems(prev => {
      const ex = prev.find(it => it.id === mi.id);
      if (ex) return prev.map(it => it.id === mi.id ? { ...it, qty: it.qty + 1 } : it);
      return [...prev, { id: mi.id, name: mi.name, price: Number(mi.price), qty: 1, emoji: mi.emoji || "🍽", cat: mi.category || "" }];
    });
  }

  const newTotal = items.reduce((s, it) => s + it.price * it.qty, 0);

  async function save() {
    setSaving(true);
    if (isDemo) {
      onSaved({ ...order, items, total: newTotal });
      return;
    }
    try {
      await supabase.from("order_items").delete().eq("order_id", order.id);
      const menuMap = {};
      menuItems.forEach(mi => { menuMap[mi.id] = mi; });
      const rows = items.map(it => ({ order_id: order.id, menu_item_id: it.id, quantity: it.qty, detail: "" }));
      await supabase.from("order_items").insert(rows);
      await supabase.from("orders").update({ total: newTotal }).eq("id", order.id);
      onSaved({ ...order, items, total: newTotal });
    } catch { setSaving(false); }
  }

  const menuCats = Array.from(new Set(menuItems.map(m => m.category)));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: C.surface, borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", ...FF }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>Modifier — Table {order.table}</p>
          <button onClick={onClose} style={{ background: C.bg, border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, color: C.textSecondary, ...FF }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 10 }}>Articles en cours</p>
            {items.length === 0 && <p style={{ fontSize: 13, color: C.textTertiary }}>Aucun article</p>}
            {items.map(it => (
              <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 20, width: 28, textAlign: "center", flexShrink: 0 }}>{it.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{it.name}</p>
                  <p style={{ fontSize: 11, color: C.textTertiary }}>{it.price.toFixed(2)}€/u</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => setQty(it.id, -1)} style={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${C.borderStrong}`, background: C.white, fontWeight: 900, cursor: "pointer", fontSize: 15, ...FF }}>−</button>
                  <span style={{ fontWeight: 700, fontSize: 14, minWidth: 18, textAlign: "center" }}>{it.qty}</span>
                  <button onClick={() => setQty(it.id, 1)} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: C.dark, color: C.white, fontWeight: 900, cursor: "pointer", fontSize: 15, ...FF }}>+</button>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.dark, minWidth: 44, textAlign: "right" }}>{(it.price * it.qty).toFixed(2)}€</p>
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 10 }}>Ajouter un plat</p>
            {menuCats.map(cat => (
              <div key={cat} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{cat}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {menuItems.filter(m => m.category === cat).map(m => (
                    <button key={m.id} onClick={() => addMenuItem(m)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer", fontSize: 12, color: C.dark, fontWeight: 500, ...FF }}>
                      <span>{m.emoji}</span><span>{m.name}</span><span style={{ color: C.textTertiary }}>+{Number(m.price).toFixed(2)}€</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <p style={{ flex: 1, fontSize: 15, fontWeight: 700, color: C.dark }}>Total : {newTotal.toFixed(2)}€</p>
          <Btn variant="ghost" size="sm" onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" size="sm" onClick={save} disabled={saving}>
            {saving ? <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: C.white, borderRadius: "50%", display: "inline-block", animation: "ring 0.8s linear infinite" }} /> : "Enregistrer"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function OrdersTab({ store, restaurant: restaurantProp }) {
  const byStatus = s => store.orders.filter(o => o.status === s);
  const all = [...store.orders, ...store.servedOrders.slice(0, 4)];
  const isMobile = useIsMobile();
  const [editOrder, setEditOrder] = useState(null);
  const [payingIds, setPayingIds] = useState({});
  const storeCtx = useContext(StoreCtx);
  const resolvedRestaurant = restaurantProp || { id: "demo" };

  function handleSaved(updated) {
    if (storeCtx?.setOrders) {
      storeCtx.setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    }
    setEditOrder(null);
  }

  // Cashier accepts a new order from the dashboard — this is the only action
  // (besides accepting in the kitchen view) that stops the repeating alarm.
  async function acceptOrder(o) {
    silenceOrder(o.id);
    if (storeCtx?.setOrders) storeCtx.setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status: "cooking" } : x));
    if (resolvedRestaurant.id !== "demo") {
      await supabase.from("orders").update({ status: "PREPARING" }).eq("id", o.id);
    }
  }

  // Cashier validates a cash payment → mark paid + send PAYÉ receipt email
  async function markPaid(o) {
    if (payingIds[o.id]) return;
    setPayingIds(p => ({ ...p, [o.id]: true }));
    try {
      if (resolvedRestaurant.id !== "demo") {
        const { error } = await supabase.from("orders").update({ paid: true }).eq("id", o.id);
        if (error) {
          storeCtx?.pushNotif?.(error.message?.includes("paid") ? "⚠️ Exécutez la migration SQL (colonne paid)" : "Erreur : " + error.message, "warning");
          setPayingIds(p => ({ ...p, [o.id]: false }));
          return;
        }
      }
      if (storeCtx?.setOrders) storeCtx.setOrders(prev => prev.map(x => x.id === o.id ? { ...x, paid: true } : x));
      storeCtx?.pushNotif?.(`💶 Table ${o.table} encaissée — ${o.total.toFixed(2)} €`, "success");

      // Send the PAYÉ receipt by email if the customer left one
      if (resolvedRestaurant.id !== "demo" && o.customerEmail) {
        let tk = null;
        try {
          const { data } = await supabase.from("restaurant_settings").select("ticket_address,ticket_phone,ticket_tax_id,ticket_footer").eq("restaurant_id", resolvedRestaurant.id).maybeSingle();
          tk = data;
        } catch {}
        const headerInfo = [tk?.ticket_address, tk?.ticket_phone ? `Tél : ${tk.ticket_phone}` : "", tk?.ticket_tax_id]
          .filter(Boolean).map(l => `<p style="color:rgba(255,255,255,0.55);margin:2px 0 0;font-size:11px;">${l}</p>`).join("");
        const itemsHtml = o.items.map(i => `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;">${i.emoji} ${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;font-size:14px;">${(i.price * i.qty).toFixed(2)} €</td></tr>`).join("");
        const receiptHtml = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;color:#1d1d1f;"><div style="text-align:center;background:#1d1d1f;padding:24px;border-radius:16px 16px 0 0;"><h2 style="color:#fff;margin:0;font-size:22px;">${resolvedRestaurant.name || ""}</h2>${headerInfo}<p style="color:rgba(255,255,255,0.6);margin:8px 0 0;font-size:13px;">Table ${o.table} · ${new Date(o.createdAt).toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}</p></div><div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:24px;border-radius:0 0 16px 16px;"><p style="font-size:11px;color:#888;letter-spacing:.06em;margin:0 0 4px;">N° COMMANDE</p><p style="font-family:monospace;font-size:15px;font-weight:700;margin:0 0 20px;">#${o.shortId || o.id.slice(0,8).toUpperCase()}</p>${o.customerName ? `<p style="font-size:11px;color:#888;letter-spacing:.06em;margin:0 0 4px;">CLIENT</p><p style="font-size:15px;font-weight:600;margin:0 0 20px;">${o.customerName}</p>` : ""}<p style="font-size:11px;color:#888;letter-spacing:.06em;margin:0 0 8px;">ARTICLES</p><table style="width:100%;border-collapse:collapse;">${itemsHtml}</table><div style="display:flex;justify-content:space-between;align-items:center;background:#f5f5f7;border-radius:10px;padding:14px 16px;margin-top:16px;"><span style="font-size:16px;font-weight:700;">Total</span><span style="font-size:20px;font-weight:900;">${o.total.toFixed(2)} €</span></div><p style="font-size:12px;color:#888;margin:8px 0 0;">Paiement : Espèces</p><div style="border:2px solid #34C759;border-radius:10px;padding:10px;text-align:center;margin-top:12px;"><span style="color:#34C759;font-weight:900;font-size:16px;letter-spacing:.04em;">✓ PAYÉ</span></div><p style="text-align:center;font-size:13px;color:#888;margin-top:24px;font-style:italic;">${tk?.ticket_footer || "Merci de votre visite ! 🙏"}</p></div></body></html>`;
        supabase.functions.invoke("send-receipt-email", {
          body: { restaurant_id: resolvedRestaurant.id, to_email: o.customerEmail, subject: `Votre reçu — ${resolvedRestaurant.name || "Wegemo"}`, html_body: receiptHtml }
        }).catch(() => {});
      }
    } finally {
      setPayingIds(p => ({ ...p, [o.id]: false }));
    }
  }

  const audioUnlocked = useOrderAudioUnlocked();

  return (
    <div className="fade-in">
      {!audioUnlocked && (
        <div onClick={unlockOrderAudio} style={{ position: "sticky", top: 0, zIndex: 10000, background: "#FF3B30", color: "#fff", textAlign: "center", padding: "12px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer", borderRadius: 12, marginBottom: 14 }}>
          🔔 Cliquez ici pour activer la sonnerie des nouvelles commandes — vous entendrez un petit bip de confirmation
        </div>
      )}
      {audioUnlocked && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button onClick={playOrderAlarm} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.textSecondary, ...FF }}>
            🔊 Tester la sonnerie
          </button>
        </div>
      )}
      {editOrder && (
        <EditOrderModal
          order={editOrder}
          restaurant={resolvedRestaurant}
          onClose={() => setEditOrder(null)}
          onSaved={handleSaved}
        />
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: isMobile ? 6 : 12, marginBottom: isMobile ? 12 : 20 }}>
        {[["Nouvelles", "new", C.accentBlue], ["Cuisine", "cooking", C.accentOrange], ["Prêtes", "ready", C.accentGreen], ["Servies", "served", C.textTertiary]].map(([l, s, c]) => (
          <Surface key={s} style={{ padding: isMobile ? "10px 10px" : "16px 18px" }}>
            <p style={{ fontSize: isMobile ? 10 : 12, color: C.textSecondary, marginBottom: 4, fontWeight: 500 }}>{l}</p>
            <p style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: c }}>{s === "served" ? store.servedOrders.length : byStatus(s).length}</p>
          </Surface>
        ))}
      </div>
      <Surface style={{ overflow: "hidden" }}>
        <div style={{ padding: isMobile ? "12px 14px" : "18px 22px", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Toutes les commandes</p>
        </div>
        {all.map((o, i) => {
          const sc = { new: C.accentBlue, accepted: C.accentOrange, cooking: C.accentOrange, ready: C.accentGreen, served: C.textTertiary }[o.status];
          const sl = { new: "Nouvelle", accepted: "Acceptée", cooking: "Cuisine", ready: "Prête", served: "Servie" }[o.status];
          return (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16, padding: isMobile ? "10px 14px" : "14px 22px", borderBottom: i < all.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: C.dark, flexShrink: 0 }}>T{o.table}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.dark, margin: 0 }}>#{o.id.slice ? o.id.slice(0, 6).toUpperCase() : o.id} · {o.total.toFixed(2)}€</p>
                  {o.order_type === "takeaway" && <span style={{ fontSize: 10, fontWeight: 700, background: "#FF9F0A22", color: "#FF9F0A", borderRadius: 6, padding: "2px 6px" }}>🥡 À emporter</span>}
                </div>
                <p style={{ fontSize: 11, color: C.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{o.items.map(i => i.name).join(", ")}</p>
              </div>
              {!isMobile && <p style={{ fontSize: 13, color: C.textSecondary, flexShrink: 0 }}>{Math.round(o.elapsed)} min</p>}
              {/* Cash payment status */}
              {o.payment_method === "cash" && !o.paid ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <Tag color="#FF9F0A">💵 {isMobile ? "Attente" : "En attente de paiement"}</Tag>
                  <button onClick={() => markPaid(o)} disabled={!!payingIds[o.id]}
                    style={{ background: C.accentGreen, border: "none", borderRadius: 8, padding: isMobile ? "6px 10px" : "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, opacity: payingIds[o.id] ? 0.5 : 1, ...FF }}
                    title="Valider le paiement en espèces">
                    {payingIds[o.id] ? "..." : "✓ Encaissé"}
                  </button>
                </div>
              ) : o.paid ? (
                <Tag color={C.accentGreen}>✓ Payé</Tag>
              ) : null}
              <Tag color={sc}>{sl}</Tag>
              {o.status === "new" && (
                <button onClick={() => acceptOrder(o)} style={{ background: C.dark, border: "none", borderRadius: 8, padding: isMobile ? "6px 10px" : "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, ...FF }} title="Accepter la commande — arrête la sonnerie">
                  ✓ Accepter
                </button>
              )}
              {o.status !== "served" && (
                <button onClick={() => setEditOrder(o)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 13, color: C.textSecondary, flexShrink: 0, ...FF }} title="Modifier la commande">✏️</button>
              )}
            </div>
          );
        })}
      </Surface>
    </div>
  );
}

function QRTab({ restaurant }) {
  const isDemo = restaurant.id === "demo";
  const [tables, setTables] = useState([]);
  const [sel, setSel] = useState(null);
  const [fg, setFg] = useState("#1D1D1F");
  const [bg, setBg] = useState("#FFFFFF");
  const [customBase, setCustomBase] = useState("");
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  const [embedColor, setEmbedColor] = useState("#1D1D1F");
  const [embedLabel, setEmbedLabel] = useState("🛒 Commander");
  const [embedTable, setEmbedTable] = useState("0");
  const [embedCopied, setEmbedCopied] = useState(false);
  const isMobile = useIsMobile();
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const origin = customBase || window.location.origin;

  useEffect(() => {
    if (isDemo) {
      const dt = Array.from({ length: 8 }, (_, i) => ({ id: `demo-t${i + 1}`, number: i + 1, qr_url: "" }));
      setTables(dt);
      setSel(dt[0]);
      return;
    }
    supabase.from("tables").select("*").eq("restaurant_id", restaurant.id).order("number")
      .then(({ data }) => {
        const rows = data ?? [];
        setTables(rows);
        if (rows.length > 0) setSel(rows[0]);
      });
  }, [restaurant.id]);

  const selNum = sel?.number ?? 1;
  const url = sel?.qr_url || `${origin}${BASE_PATH}/r/${restaurant.id}/t/${selNum}`;

  async function addTable() {
    if (adding) return;
    setAdding(true);
    const maxNum = tables.reduce((m, t) => Math.max(m, t.number), 0);
    const number = maxNum + 1;
    const qr_url = `${origin}${BASE_PATH}/r/${restaurant.id}/t/${number}`;
    if (isDemo) {
      const newT = { id: `demo-t${number}`, number, qr_url };
      setTables(prev => [...prev, newT]);
      setSel(newT);
      setAdding(false);
      return;
    }
    const { data, error } = await supabase.from("tables").insert({ restaurant_id: restaurant.id, number, qr_url }).select().single();
    if (!error && data) {
      setTables(prev => [...prev, data]);
      setSel(data);
      await supabase.from("restaurants").update({ tables_count: tables.length + 1 }).eq("id", restaurant.id);
    }
    setAdding(false);
  }

  async function deleteTable(t) {
    if (!confirm(`Supprimer la table ${t.number} ?`)) return;
    if (isDemo) {
      setTables(prev => prev.filter(x => x.id !== t.id));
      setSel(prev => prev?.id === t.id ? null : prev);
      return;
    }
    await supabase.from("tables").delete().eq("id", t.id);
    setTables(prev => {
      const next = prev.filter(x => x.id !== t.id);
      if (sel?.id === t.id) setSel(next[0] ?? null);
      return next;
    });
    await supabase.from("restaurants").update({ tables_count: Math.max(0, tables.length - 1) }).eq("id", restaurant.id);
  }

  async function saveRename(t) {
    const label = renameVal.trim() || null;
    setRenaming(null);
    setRenameVal("");
    if (isDemo) {
      setTables(prev => prev.map(x => x.id === t.id ? { ...x, label } : x));
      if (sel?.id === t.id) setSel(prev => ({ ...prev, label }));
      return;
    }
    await supabase.from("tables").update({ label }).eq("id", t.id);
    setTables(prev => prev.map(x => x.id === t.id ? { ...x, label } : x));
    if (sel?.id === t.id) setSel(prev => ({ ...prev, label }));
  }

  const download = () => {
    const canvas = document.querySelector("#qr-dl canvas");
    if (!canvas) return;
    const a = document.createElement("a"); a.download = `vg-table-${selNum}.png`; a.href = canvas.toDataURL("image/png"); a.click();
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
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: 16 }}>
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          {[["Tables", tables.length], ["QR actifs", tables.length], ["Scans totaux", 0]].map(([l, v]) => (
            <Surface key={l} style={{ padding: "16px 18px" }}>
              <p style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6, fontWeight: 500 }}>{l}</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: C.dark }}>{v}</p>
            </Surface>
          ))}
        </div>
        <Surface style={{ overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Tables</p>
            <button onClick={addTable} disabled={adding} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer", ...FF, opacity: adding ? 0.5 : 1 }}>
              + Ajouter une table
            </button>
          </div>
          <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 8 }}>
            {tables.map(t => (
              <div key={t.id} style={{ position: "relative" }}>
                {renaming === t.id ? (
                  <div style={{ padding: "8px", borderRadius: 12, border: `1.5px solid ${C.dark}`, background: C.surface, textAlign: "center" }}>
                    <p style={{ fontSize: 9, color: C.textTertiary, marginBottom: 4 }}>RENOMMER</p>
                    <input
                      autoFocus
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveRename(t); if (e.key === "Escape") { setRenaming(null); setRenameVal(""); } }}
                      placeholder={`Table ${t.number}`}
                      style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 6px", fontSize: 11, textAlign: "center", outline: "none", ...FF }}
                    />
                    <button onClick={() => saveRename(t)} style={{ marginTop: 4, width: "100%", background: C.dark, color: C.white, border: "none", borderRadius: 6, padding: "4px", fontSize: 10, cursor: "pointer", ...FF }}>OK</button>
                  </div>
                ) : (
                  <div onClick={() => setSel(t)} style={{ padding: "10px 8px", borderRadius: 12, border: `1.5px solid ${sel?.id === t.id ? C.dark : C.border}`, background: sel?.id === t.id ? C.dark : C.surface, textAlign: "center", cursor: "pointer", transition: "all 0.15s" }}>
                    <p style={{ fontSize: 9, color: sel?.id === t.id ? "rgba(255,255,255,0.5)" : C.textTertiary, marginBottom: 2 }}>TABLE</p>
                    <p style={{ fontSize: t.label ? 11 : 20, fontWeight: 800, color: sel?.id === t.id ? C.white : C.dark, wordBreak: "break-word", lineHeight: 1.2 }}>{t.label || t.number}</p>
                    {t.label && <p style={{ fontSize: 9, color: sel?.id === t.id ? "rgba(255,255,255,0.4)" : C.textTertiary }}>#{t.number}</p>}
                    <button onClick={e => { e.stopPropagation(); setRenaming(t.id); setRenameVal(t.label || ""); }}
                      style={{ marginTop: 4, background: "none", border: "none", fontSize: 9, color: sel?.id === t.id ? "rgba(255,255,255,0.6)" : C.textTertiary, cursor: "pointer", ...FF }}>✏️ Renommer</button>
                  </div>
                )}
                <button onClick={e => { e.stopPropagation(); deleteTable(t); }} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: C.accent, border: "2px solid #fff", color: "#fff", fontSize: 10, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, ...FF }}>×</button>
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
        {sel && (
          <Surface id="qr-dl" style={{ padding: "18px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 2 }}>{sel?.label || `Table ${selNum}`}</p>
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
        )}
      </div>
    </div>

    {/* Embed integration panel */}
    {(() => {
      const embedOrigin = customBase || window.location.origin;
      const basePath = (typeof BASE_PATH !== "undefined" ? BASE_PATH : "");
      const scriptUrl = `${embedOrigin}${basePath}/embed.js`;
      const rid = isDemo ? "RESTAURANT_ID" : restaurant.id;
      const snippet = `<script src="${scriptUrl}"><\/script>\n<div data-wegemo="${rid}" data-table="${embedTable}" data-label="${embedLabel}" data-color="${embedColor}" data-name="${restaurant.name}"></div>`;

      function copySnippet() {
        navigator.clipboard.writeText(snippet).then(() => {
          setEmbedCopied(true);
          setTimeout(() => setEmbedCopied(false), 2000);
        });
      }

      return (
        <Surface style={{ marginTop: 20, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>🔗</span>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Intégration site web</p>
          </div>
          <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>
            Ajoutez un bouton "Commander" sur n'importe quel site vitrine. Collez 2 lignes de code, c'est tout.
          </p>

          {/* Options */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Texte du bouton</p>
              <input value={embedLabel} onChange={e => setEmbedLabel(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", ...FF }} />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Couleur du bouton</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" value={embedColor} onChange={e => setEmbedColor(e.target.value)}
                  style={{ width: 38, height: 38, borderRadius: 8, border: "none", cursor: "pointer", padding: 2 }} />
                <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: "monospace" }}>{embedColor}</span>
              </div>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Table par défaut <span style={{ fontWeight: 400 }}>(0 = sans table)</span></p>
              <select value={embedTable} onChange={e => setEmbedTable(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", background: C.white, ...FF }}>
                <option value="0">0 — Sans table (commande générale)</option>
                {tables.map(t => <option key={t.id} value={t.number}>{t.label || `Table ${t.number}`}</option>)}
              </select>
            </div>
          </div>

          {/* Preview */}
          <div style={{ background: C.bg, borderRadius: 14, padding: "18px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 12, color: C.textTertiary, fontWeight: 600, whiteSpace: "nowrap" }}>Aperçu :</span>
            <button style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", border: "none", borderRadius: 50, fontSize: 15, fontWeight: 700, background: embedColor, color: "#fff", cursor: "default", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", fontFamily: "inherit" }}>
              {embedLabel}
            </button>
          </div>

          {/* Snippet */}
          <p style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}>Code à coller sur votre site :</p>
          <div style={{ position: "relative" }}>
            <pre style={{ background: "#1D1D1F", color: "#A8FF60", borderRadius: 14, padding: "16px 18px", fontSize: 12, overflowX: "auto", lineHeight: 1.7, margin: 0, fontFamily: "monospace" }}>
              {snippet}
            </pre>
            <button onClick={copySnippet} style={{ position: "absolute", top: 10, right: 10, background: embedCopied ? C.accentGreen : "rgba(255,255,255,0.12)", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "background 0.2s", ...FF }}>
              {embedCopied ? "✓ Copié !" : "📋 Copier"}
            </button>
          </div>
          <p style={{ fontSize: 11, color: C.textTertiary, marginTop: 12, lineHeight: 1.6 }}>
            💡 Collez ce code dans le HTML de votre site vitrine, juste avant <code style={{ background: C.bg, padding: "1px 5px", borderRadius: 4 }}>&lt;/body&gt;</code>. Le bouton ouvre un menu plein écran dans une fenêtre modale.
          </p>
        </Surface>
      );
    })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP TAB — AI-powered onboarding: import menu + generate inventory
// ─────────────────────────────────────────────────────────────────────────────
function SetupTab({ restaurant, onDone }) {
  const [phase, setPhase] = useState("menu"); // menu | inventory | done
  const [menuText, setMenuText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [parsedItems, setParsedItems] = useState(null); // [{name,description,price,category,emoji}]
  const [editItem, setEditItem] = useState(null); // index being edited
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const [invItems, setInvItems] = useState([]); // menu items for inventory context
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [parsedInv, setParsedInv] = useState(null); // {ingredients, recipes}
  const [savingInv, setSavingInv] = useState(false);
  const [invDone, setInvDone] = useState(false);

  const isDemo = restaurant.id === "demo";

  // ── Phase 1: Parse menu ──────────────────────────────────────────────────
  async function parseMenu() {
    if (!menuText.trim()) return;
    setParsing(true); setParseError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ mode: "setup-menu", text: menuText }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const items = (data.items || []).map((it, i) => ({ ...it, _id: i, _keep: true }));
      if (!items.length) throw new Error("Aucun plat détecté — vérifiez le texte collé.");
      setParsedItems(items);
    } catch (e) {
      setParseError(e.message || "Erreur lors de l'analyse.");
    } finally { setParsing(false); }
  }

  async function importMenu() {
    setImporting(true);
    const kept = parsedItems.filter(i => i._keep);
    if (!isDemo) {
      const rows = kept.map(i => ({
        restaurant_id: restaurant.id,
        name: i.name, description: i.description || "",
        price: i.price ?? 0, category: i.category || "Plats",
        emoji: i.emoji || "🍽️", is_popular: false, available: true,
      }));
      await supabase.from("menu_items").insert(rows);
    }
    setImportedCount(kept.length);
    setImporting(false);
    // Load menu items for inventory phase
    if (!isDemo) {
      const { data } = await supabase.from("menu_items").select("id,name,description,emoji,category").eq("restaurant_id", restaurant.id);
      setInvItems(data ?? []);
    } else {
      setInvItems(kept.map((i, idx) => ({ id: `di_${idx}`, name: i.name, description: i.description, emoji: i.emoji, category: i.category })));
    }
    setPhase("inventory");
  }

  // ── Phase 2: Generate inventory ──────────────────────────────────────────
  async function loadExistingMenu() {
    if (isDemo) { setInvItems(DEMO_MENU); return; }
    const { data } = await supabase.from("menu_items").select("id,name,description,emoji,category").eq("restaurant_id", restaurant.id);
    setInvItems(data ?? []);
  }

  async function generateInventory() {
    let items = invItems;
    if (!items.length) { await loadExistingMenu(); items = invItems; }
    if (!items.length) { setGenError("Aucun plat trouvé — importez d'abord votre carte."); return; }
    setGenerating(true); setGenError("");
    try {
      const dishList = items.map(i => `${i.emoji} ${i.name}${i.description ? ": " + i.description : ""}`).join("\n");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ mode: "setup-inventory", text: dishList }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.ingredients?.length) throw new Error("Aucun ingrédient généré.");
      setParsedInv(data);
    } catch (e) {
      setGenError(e.message || "Erreur lors de la génération.");
    } finally { setGenerating(false); }
  }

  async function saveInventory() {
    setSavingInv(true);
    if (!isDemo) {
      const ingRows = parsedInv.ingredients.map(i => ({
        restaurant_id: restaurant.id,
        name: i.name, unit: i.unit, emoji: i.emoji || "📦",
        stock: i.stock || 0, alert_threshold: i.alert_threshold ?? null,
      }));
      const { data: createdIngs } = await supabase.from("ingredients").insert(ingRows).select("id,name");
      const ingMap = Object.fromEntries((createdIngs ?? []).map(i => [i.name, i.id]));

      const { data: menuItems } = await supabase.from("menu_items").select("id,name").eq("restaurant_id", restaurant.id);
      const itemMap = Object.fromEntries((menuItems ?? []).map(i => [i.name, i.id]));

      const recipeRows = [];
      for (const [dishName, lines] of Object.entries(parsedInv.recipes ?? {})) {
        const mid = itemMap[dishName]; if (!mid) continue;
        for (const line of lines) {
          const iid = ingMap[line.ingredient]; if (!iid) continue;
          recipeRows.push({ menu_item_id: mid, ingredient_id: iid, qty_per_portion: line.qty_per_portion });
        }
      }
      if (recipeRows.length) await supabase.from("recipe_items").insert(recipeRows);
    }
    setSavingInv(false); setInvDone(true);
  }

  // ── Shared helper ────────────────────────────────────────────────────────
  function Step({ n, label, active, done }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, background: done ? C.accentGreen : active ? C.dark : C.border, color: done || active ? "#fff" : C.textTertiary, flexShrink: 0 }}>
          {done ? "✓" : n}
        </div>
        <span style={{ fontSize: 14, fontWeight: active || done ? 600 : 400, color: active ? C.dark : done ? C.accentGreen : C.textTertiary }}>{label}</span>
      </div>
    );
  }

  if (invDone) return (
    <div className="fade-in" style={{ maxWidth: 600, margin: "0 auto", padding: "48px 0", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
      <p style={{ fontSize: 24, fontWeight: 900, color: C.dark, letterSpacing: "-0.04em", marginBottom: 8 }}>Votre restaurant est prêt !</p>
      <p style={{ color: C.textSecondary, fontSize: 15, marginBottom: 32 }}>Carte importée, inventaire créé, recettes configurées. Tout est en place.</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Btn variant="primary" onClick={onDone}>Aller au résumé →</Btn>
        <Btn variant="ghost" onClick={() => { setPhase("menu"); setParsedItems(null); setParsedInv(null); setInvDone(false); setMenuText(""); }}>Recommencer</Btn>
      </div>
    </div>
  );

  return (
    <div className="fade-in" style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.dark, letterSpacing: "-0.03em", marginBottom: 6 }}>⚡ Setup rapide</h2>
        <p style={{ color: C.textSecondary, fontSize: 14 }}>Collez votre menu — l'IA configure votre carte et génère votre inventaire automatiquement.</p>
      </div>

      {/* Steps */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <Step n={1} label="Importer la carte" active={phase === "menu"} done={phase === "inventory" || invDone} />
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <Step n={2} label="Générer l'inventaire" active={phase === "inventory"} done={invDone} />
      </div>

      {isDemo && (
        <div style={{ background: C.accentOrange + "15", border: `1px solid ${C.accentOrange}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: C.accentOrange, fontWeight: 500 }}>
          🎯 Mode démo — l'IA tourne normalement mais les données ne sont pas persistées en base.
        </div>
      )}

      {/* ── PHASE 1: Menu ── */}
      {phase === "menu" && !parsedItems && (
        <Surface style={{ padding: 28 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 4 }}>📋 Collez votre menu</p>
          <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 16 }}>
            Copiez-collez le texte de votre menu depuis n'importe quelle source : site web, PDF, WhatsApp, Google Docs, fichier texte…
          </p>
          <textarea
            value={menuText}
            onChange={e => setMenuText(e.target.value)}
            placeholder={"Exemple :\n\nBurgers\nClassic Burger - 11.90€\nDouble Cheese - 13.50€\nBacon Crispy - 13.90€\n\nDesserts\nTarte Tatin - 7.50€\nMousse Chocolat - 6.50€"}
            style={{ width: "100%", boxSizing: "border-box", minHeight: 240, border: `1.5px solid ${menuText ? C.borderStrong : C.border}`, borderRadius: 14, padding: "14px 16px", fontSize: 14, color: C.dark, resize: "vertical", outline: "none", lineHeight: 1.6, transition: "border-color 0.15s", ...FF }}
          />
          {parseError && <p style={{ color: C.accent, fontSize: 13, marginTop: 8 }}>⚠️ {parseError}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end", alignItems: "center" }}>
            <button onClick={() => setPhase("inventory")} style={{ background: "none", border: "none", color: C.textTertiary, fontSize: 13, cursor: "pointer", ...FF }}>
              Passer — j'ai déjà ma carte →
            </button>
            <Btn variant="primary" onClick={parseMenu} disabled={parsing || !menuText.trim()}>
              {parsing ? "Analyse en cours…" : "✨ Analyser avec l'IA"}
            </Btn>
          </div>
          {parsing && (
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, color: C.textSecondary, fontSize: 13 }}>
              <div style={{ width: 16, height: 16, border: `2px solid ${C.dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ring 0.8s linear infinite", flexShrink: 0 }} />
              L'IA analyse votre menu et extrait les plats…
            </div>
          )}
        </Surface>
      )}

      {/* ── PHASE 1: Preview parsed items ── */}
      {phase === "menu" && parsedItems && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>✅ {parsedItems.filter(i => i._keep).length} plats détectés</p>
              <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>Vérifiez et corrigez si besoin, puis importez.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="ghost" size="sm" onClick={() => { setParsedItems(null); setParseError(""); }}>← Recommencer</Btn>
              <Btn variant="primary" size="sm" onClick={importMenu} disabled={importing}>
                {importing ? "Import…" : `Importer ${parsedItems.filter(i => i._keep).length} plats →`}
              </Btn>
            </div>
          </div>
          <Surface style={{ overflow: "hidden" }}>
            {/* Group by category */}
            {Array.from(new Set(parsedItems.map(i => i.category))).map(cat => (
              <div key={cat}>
                <div style={{ padding: "10px 18px 6px", background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, letterSpacing: "0.06em" }}>{cat?.toUpperCase()}</span>
                </div>
                {parsedItems.filter(i => i.category === cat).map((item, gi) => {
                  const idx = parsedItems.indexOf(item);
                  const editing = editItem === idx;
                  return (
                    <div key={item._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: `1px solid ${C.border}`, opacity: item._keep ? 1 : 0.4, transition: "opacity 0.15s" }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{item.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editing ? (
                          <input autoFocus value={item.name} onChange={e => setParsedItems(p => p.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                            onBlur={() => setEditItem(null)} onKeyDown={e => e.key === "Enter" && setEditItem(null)}
                            style={{ width: "100%", border: `1.5px solid ${C.dark}`, borderRadius: 8, padding: "4px 8px", fontSize: 14, fontWeight: 600, color: C.dark, outline: "none", ...FF }} />
                        ) : (
                          <p onClick={() => setEditItem(idx)} style={{ fontWeight: 600, fontSize: 14, color: C.dark, cursor: "text" }} title="Cliquer pour modifier">{item.name}</p>
                        )}
                        {item.description && <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</p>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        {item.price != null ? (
                          <input type="number" value={item.price} onChange={e => setParsedItems(p => p.map((x, i) => i === idx ? { ...x, price: parseFloat(e.target.value) } : x))}
                            style={{ width: 72, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 14, fontWeight: 700, color: C.dark, outline: "none", textAlign: "right", ...FF }} />
                        ) : (
                          <span style={{ color: C.textTertiary, fontSize: 12 }}>Prix ?</span>
                        )}
                        <span style={{ fontSize: 12, color: C.textTertiary }}>€</span>
                        <button onClick={() => setParsedItems(p => p.map((x, i) => i === idx ? { ...x, _keep: !x._keep } : x))}
                          style={{ background: item._keep ? C.accent + "15" : C.bg, border: `1px solid ${item._keep ? C.accent + "40" : C.border}`, borderRadius: 8, padding: "4px 10px", fontSize: 12, color: item._keep ? C.accent : C.textTertiary, cursor: "pointer", ...FF }}>
                          {item._keep ? "Exclure" : "Inclure"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </Surface>
        </div>
      )}

      {/* ── PHASE 2: Inventory ── */}
      {phase === "inventory" && !parsedInv && (
        <Surface style={{ padding: 28 }} className="fade-in">
          {importedCount > 0 && (
            <div style={{ background: C.accentGreen + "15", border: `1px solid ${C.accentGreen}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 20, fontSize: 14, color: C.accentGreen, fontWeight: 600 }}>
              ✅ {importedCount} plats importés avec succès
            </div>
          )}
          <p style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 4 }}>📦 Générer l'inventaire</p>
          <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 20 }}>
            L'IA analyse chaque plat de votre carte, déduit les ingrédients nécessaires et estime les quantités par portion. Vous obtenez un inventaire de départ complet en quelques secondes.
          </p>
          <div style={{ background: C.bg, borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.textTertiary, letterSpacing: "0.04em", marginBottom: 8 }}>CE QUE L'IA VA CRÉER</p>
            <div style={{ display: "flex", gap: 24 }}>
              {[["📦", "Liste d'ingrédients", "avec unités et stocks de départ"], ["⚠️", "Seuils d'alerte", "pour être notifié avant rupture"], ["📋", "Recettes complètes", "quantités par portion par plat"]].map(([icon, title, sub]) => (
                <div key={title}>
                  <p style={{ fontSize: 18, marginBottom: 4 }}>{icon}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{title}</p>
                  <p style={{ fontSize: 12, color: C.textSecondary }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>
          {genError && <p style={{ color: C.accent, fontSize: 13, marginBottom: 12 }}>⚠️ {genError}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onDone} style={{ background: "none", border: "none", color: C.textTertiary, fontSize: 13, cursor: "pointer", ...FF }}>Passer pour l'instant</button>
            <Btn variant="primary" onClick={generateInventory} disabled={generating}>
              {generating ? "Génération en cours…" : "✨ Générer l'inventaire"}
            </Btn>
          </div>
          {generating && (
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, color: C.textSecondary, fontSize: 13 }}>
              <div style={{ width: 16, height: 16, border: `2px solid ${C.dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ring 0.8s linear infinite", flexShrink: 0 }} />
              L'IA analyse vos plats et génère l'inventaire complet…
            </div>
          )}
        </Surface>
      )}

      {/* ── PHASE 2: Preview generated inventory ── */}
      {phase === "inventory" && parsedInv && !invDone && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>
                ✅ {parsedInv.ingredients?.length} ingrédients · {Object.keys(parsedInv.recipes || {}).length} recettes
              </p>
              <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>Vérifiez puis créez l'inventaire.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="ghost" size="sm" onClick={() => setParsedInv(null)}>← Regénérer</Btn>
              <Btn variant="primary" size="sm" onClick={saveInventory} disabled={savingInv}>
                {savingInv ? "Création…" : "Créer l'inventaire →"}
              </Btn>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Ingredients */}
            <Surface style={{ overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>📦 Ingrédients</p>
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {parsedInv.ingredients?.map((ing, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 18 }}>{ing.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: C.dark }}>{ing.name}</p>
                      <p style={{ fontSize: 11, color: C.textSecondary }}>Stock : {ing.stock} {ing.unit} · Alerte ≤ {ing.alert_threshold} {ing.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Surface>

            {/* Recipes */}
            <Surface style={{ overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>📋 Recettes</p>
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {Object.entries(parsedInv.recipes || {}).map(([dish, lines]) => (
                  <div key={dish} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <p style={{ padding: "8px 16px 4px", fontWeight: 600, fontSize: 12, color: C.dark }}>{dish}</p>
                    {lines.map((l, j) => (
                      <p key={j} style={{ padding: "2px 16px 2px 24px", fontSize: 11, color: C.textSecondary }}>
                        • {l.ingredient} — {l.qty_per_portion} {parsedInv.ingredients?.find(i => i.name === l.ingredient)?.unit ?? ""}
                      </p>
                    ))}
                    <div style={{ height: 4 }} />
                  </div>
                ))}
              </div>
            </Surface>
          </div>
        </div>
      )}
    </div>
  );
}

const UNITS = ["kg", "g", "L", "mL", "pcs", "boîtes", "sachets"];
const EMPTY_ING = { name: "", unit: "kg", emoji: "📦", stock: "", alert_threshold: "" };

function InventoryTab({ restaurant }) {
  const [subTab, setSubTab] = useState("stocks"); // stocks | recipes
  const [ingredients, setIngredients] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [recipes, setRecipes] = useState({}); // { menu_item_id: [{ id, ingredient_id, qty_per_portion }] }
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', ing }
  const [form, setForm] = useState(EMPTY_ING);
  const [saving, setSaving] = useState(false);
  const [selectedDish, setSelectedDish] = useState("");
  const [recipeModal, setRecipeModal] = useState(null); // { menu_item_id, ingredient_id?, qty }
  const fv = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (restaurant.id === "demo") {
      setIngredients(DEMO_INGREDIENTS);
      setMenuItems(DEMO_MENU);
      // Build recipes map from DEMO_RECIPES
      const rm = {};
      for (const [mid, lines] of Object.entries(DEMO_RECIPES)) {
        rm[mid] = lines.map((l, i) => ({ id: `r_${mid}_${i}`, menu_item_id: mid, ...l }));
      }
      setRecipes(rm);
      setLoading(false);
      return;
    }
    // Sequential load (need menu item IDs before fetching recipe_items)
    async function load() {
      const { data: ings } = await supabase.from("ingredients").select("*").eq("restaurant_id", restaurant.id).order("name");
      const { data: items } = await supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id).order("category").order("name");
      setIngredients(ings ?? []);
      setMenuItems(items ?? []);
      if (items?.length) {
        const ids = items.map(i => i.id);
        const { data: ri } = await supabase.from("recipe_items").select("*").in("menu_item_id", ids);
        const rm = {};
        for (const r of ri ?? []) {
          if (!rm[r.menu_item_id]) rm[r.menu_item_id] = [];
          rm[r.menu_item_id].push(r);
        }
        setRecipes(rm);
      }
      setLoading(false);
    }
    load();
  }, [restaurant.id]);

  // ── Ingredients CRUD ─────────────────────────────────────────────────────
  function openAdd() { setForm(EMPTY_ING); setModal({ mode: "add" }); }
  function openEdit(ing) {
    setForm({ name: ing.name, unit: ing.unit, emoji: ing.emoji, stock: String(ing.stock), alert_threshold: ing.alert_threshold == null ? "" : String(ing.alert_threshold) });
    setModal({ mode: "edit", ing });
  }

  async function saveIng() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { name: form.name.trim(), unit: form.unit, emoji: form.emoji || "📦", stock: parseFloat(form.stock) || 0, alert_threshold: form.alert_threshold !== "" ? parseFloat(form.alert_threshold) : null };
    if (restaurant.id === "demo") {
      if (modal.mode === "add") setIngredients(p => [...p, { ...payload, id: "ing_" + Date.now(), restaurant_id: "demo" }]);
      else setIngredients(p => p.map(i => i.id === modal.ing.id ? { ...i, ...payload } : i));
      setSaving(false); setModal(null); return;
    }
    if (modal.mode === "add") {
      const { data } = await supabase.from("ingredients").insert({ ...payload, restaurant_id: restaurant.id }).select().single();
      if (data) setIngredients(p => [...p, data]);
    } else {
      await supabase.from("ingredients").update(payload).eq("id", modal.ing.id);
      setIngredients(p => p.map(i => i.id === modal.ing.id ? { ...i, ...payload } : i));
    }
    setSaving(false); setModal(null);
  }

  async function deleteIng(ing) {
    if (!confirm(`Supprimer "${ing.name}" ? Les recettes liées seront aussi supprimées.`)) return;
    setIngredients(p => p.filter(i => i.id !== ing.id));
    setRecipes(p => { const n = { ...p }; for (const mid of Object.keys(n)) n[mid] = n[mid].filter(r => r.ingredient_id !== ing.id); return n; });
    if (restaurant.id !== "demo") await supabase.from("ingredients").delete().eq("id", ing.id);
  }

  async function adjustStock(ing, delta) {
    const next = Math.max(0, +(ing.stock + delta).toFixed(3));
    setIngredients(p => p.map(i => i.id === ing.id ? { ...i, stock: next } : i));
    if (restaurant.id !== "demo") await supabase.from("ingredients").update({ stock: next }).eq("id", ing.id);
  }

  // ── Recipe CRUD ──────────────────────────────────────────────────────────
  async function saveRecipeLine(menuItemId, ingredientId, qty) {
    const qtyNum = parseFloat(qty);
    if (!qtyNum || qtyNum <= 0) return;
    const existing = (recipes[menuItemId] || []).find(r => r.ingredient_id === ingredientId);
    if (restaurant.id === "demo") {
      setRecipes(p => {
        const lines = p[menuItemId] || [];
        if (existing) return { ...p, [menuItemId]: lines.map(r => r.ingredient_id === ingredientId ? { ...r, qty_per_portion: qtyNum } : r) };
        return { ...p, [menuItemId]: [...lines, { id: `r_${Date.now()}`, menu_item_id: menuItemId, ingredient_id: ingredientId, qty_per_portion: qtyNum }] };
      });
      setRecipeModal(null); return;
    }
    if (existing) {
      await supabase.from("recipe_items").update({ qty_per_portion: qtyNum }).eq("id", existing.id);
      setRecipes(p => ({ ...p, [menuItemId]: (p[menuItemId] || []).map(r => r.id === existing.id ? { ...r, qty_per_portion: qtyNum } : r) }));
    } else {
      const { data } = await supabase.from("recipe_items").insert({ menu_item_id: menuItemId, ingredient_id: ingredientId, qty_per_portion: qtyNum }).select().single();
      if (data) setRecipes(p => ({ ...p, [menuItemId]: [...(p[menuItemId] || []), data] }));
    }
    setRecipeModal(null);
  }

  async function deleteRecipeLine(menuItemId, lineId) {
    setRecipes(p => ({ ...p, [menuItemId]: (p[menuItemId] || []).filter(r => r.id !== lineId) }));
    if (restaurant.id !== "demo") await supabase.from("recipe_items").delete().eq("id", lineId);
  }

  const lowCount = ingredients.filter(i => i.alert_threshold != null && i.stock <= i.alert_threshold && i.stock > 0).length;
  const emptyCount = ingredients.filter(i => i.stock <= 0).length;
  const dishLines = selectedDish ? (recipes[selectedDish] || []) : [];
  const usedIngIds = new Set(dishLines.map(r => r.ingredient_id));

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><div style={{ width: 24, height: 24, border: `3px solid ${C.dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ring 0.8s linear infinite" }} /></div>;

  return (
    <div className="fade-in">
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        <KPICard label="Ingrédients" value={ingredients.length} sub="en stock" />
        <KPICard label="Stock bas" value={lowCount} sub="≤ seuil d'alerte" delta={lowCount > 0 ? -1 : 0} />
        <KPICard label="Épuisés" value={emptyCount} sub="à réapprovisionner" delta={emptyCount > 0 ? -1 : 0} />
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.bg, borderRadius: 12, padding: 4, width: "fit-content" }}>
        {[{ id: "stocks", label: "📦 Stocks" }, { id: "recipes", label: "📋 Recettes" }].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: subTab === t.id ? C.white : "transparent", color: subTab === t.id ? C.dark : C.textSecondary, fontWeight: subTab === t.id ? 700 : 500, fontSize: 13, cursor: "pointer", boxShadow: subTab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s", ...FF }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── STOCKS ── */}
      {subTab === "stocks" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <Btn variant="primary" size="sm" onClick={openAdd}>+ Ajouter un ingrédient</Btn>
          </div>
          {ingredients.length === 0 ? (
            <Surface style={{ padding: 48, textAlign: "center" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>📦</p>
              <p style={{ fontWeight: 700, fontSize: 16, color: C.dark, marginBottom: 6 }}>Aucun ingrédient</p>
              <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 20 }}>Ajoutez vos ingrédients pour suivre vos stocks en temps réel.</p>
              <Btn variant="primary" onClick={openAdd}>+ Ajouter un ingrédient</Btn>
            </Surface>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {ingredients.map(ing => {
                const pct = ing.alert_threshold ? Math.min(100, (ing.stock / (ing.alert_threshold * 3)) * 100) : null;
                const color = ing.stock <= 0 ? C.accent : (ing.alert_threshold != null && ing.stock <= ing.alert_threshold) ? C.accentOrange : C.accentGreen;
                return (
                  <Surface key={ing.id} style={{ padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 26 }}>{ing.emoji}</span>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>{ing.name}</p>
                          <span style={{ display: "inline-block", background: color + "18", color, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6 }}>
                            {ing.stock <= 0 ? "Épuisé" : ing.alert_threshold != null && ing.stock <= ing.alert_threshold ? "⚠️ Stock bas" : "✓ OK"}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => openEdit(ing)} style={{ background: C.bg, border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: 13 }}>✏️</button>
                        <button onClick={() => deleteIng(ing)} style={{ background: C.bg, border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: 13 }}>🗑️</button>
                      </div>
                    </div>
                    {pct != null && (
                      <div style={{ height: 4, borderRadius: 4, background: C.border, marginBottom: 10, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 4, background: color, width: `${Math.max(2, pct)}%`, transition: "width 0.3s ease" }} />
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => adjustStock(ing, -0.1)} style={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${C.border}`, background: C.white, fontWeight: 900, cursor: "pointer", fontSize: 15, ...FF }}>−</button>
                        <span style={{ fontWeight: 800, fontSize: 16, color: C.dark, minWidth: 60, textAlign: "center" }}>{+ing.stock.toFixed(2)} {ing.unit}</span>
                        <button onClick={() => adjustStock(ing, 0.1)} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: C.dark, color: C.white, fontWeight: 900, cursor: "pointer", fontSize: 15, ...FF }}>+</button>
                      </div>
                      {ing.alert_threshold != null && <p style={{ fontSize: 11, color: C.textTertiary }}>Alerte ≤ {ing.alert_threshold} {ing.unit}</p>}
                    </div>
                  </Surface>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── RECETTES ── */}
      {subTab === "recipes" && (
        <>
          <Surface style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 10 }}>Sélectionnez un plat</p>
            <select value={selectedDish} onChange={e => setSelectedDish(e.target.value)}
              style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", fontSize: 14, color: C.dark, background: C.bg, outline: "none", ...FF }}>
              <option value="">— Choisir un plat —</option>
              {menuItems.map(item => (
                <option key={item.id} value={item.id}>{item.emoji} {item.name} ({item.category})</option>
              ))}
            </select>
          </Surface>
          {selectedDish && (
            <Surface style={{ overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>
                    {menuItems.find(m => m.id === selectedDish)?.emoji} {menuItems.find(m => m.id === selectedDish)?.name}
                  </p>
                  <p style={{ fontSize: 12, color: C.textTertiary, marginTop: 2 }}>{dishLines.length} ingrédient{dishLines.length !== 1 ? "s" : ""} dans la recette</p>
                </div>
                <Btn variant="primary" size="sm" onClick={() => setRecipeModal({ menu_item_id: selectedDish, ingredient_id: "", qty: "" })}>+ Ajouter</Btn>
              </div>
              {dishLines.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center" }}>
                  <p style={{ color: C.textTertiary, fontSize: 14 }}>Aucun ingrédient défini — cliquez sur "+ Ajouter" pour configurer la recette.</p>
                </div>
              ) : dishLines.map(line => {
                const ing = ingredients.find(i => i.id === line.ingredient_id);
                if (!ing) return null;
                return (
                  <div key={line.id} style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{ing.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{ing.name}</p>
                      <p style={{ fontSize: 12, color: C.textSecondary }}>{line.qty_per_portion} {ing.unit} / portion</p>
                    </div>
                    <p style={{ fontSize: 12, color: ing.stock > 0 ? C.accentGreen : C.accent, fontWeight: 600 }}>Stock : {+ing.stock.toFixed(2)} {ing.unit}</p>
                    <button onClick={() => setRecipeModal({ menu_item_id: selectedDish, ingredient_id: line.ingredient_id, qty: String(line.qty_per_portion) })}
                      style={{ background: C.bg, border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: 12 }}>✏️</button>
                    <button onClick={() => deleteRecipeLine(selectedDish, line.id)}
                      style={{ background: C.bg, border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: 12 }}>🗑️</button>
                  </div>
                );
              })}
            </Surface>
          )}
          {!selectedDish && ingredients.length > 0 && (
            <div style={{ textAlign: "center", padding: 32, color: C.textTertiary, fontSize: 14 }}>Sélectionnez un plat ci-dessus pour définir ou modifier sa recette.</div>
          )}
        </>
      )}

      {/* ── MODAL: Add / Edit Ingredient ── */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={{ background: C.white, borderRadius: 20, padding: 28, width: "100%", maxWidth: 440, ...FF }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: C.dark, marginBottom: 20 }}>{modal.mode === "add" ? "Ajouter un ingrédient" : "Modifier l'ingrédient"}</p>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: "0 0 64px" }}>
                <label style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500, display: "block", marginBottom: 6 }}>Émoji</label>
                <input value={form.emoji} onChange={fv("emoji")} maxLength={2}
                  style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 8px", fontSize: 22, textAlign: "center", outline: "none", ...FF }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500, display: "block", marginBottom: 6 }}>Nom *</label>
                <input value={form.name} onChange={fv("name")} placeholder="ex: Bœuf haché"
                  style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: C.dark, outline: "none", ...FF }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500, display: "block", marginBottom: 6 }}>Unité</label>
                <select value={form.unit} onChange={fv("unit")}
                  style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 10px", fontSize: 13, color: C.dark, background: C.white, outline: "none", ...FF }}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500, display: "block", marginBottom: 6 }}>Stock actuel</label>
                <input type="number" min="0" step="0.01" value={form.stock} onChange={fv("stock")} placeholder="0"
                  style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 10px", fontSize: 14, color: C.dark, outline: "none", ...FF }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500, display: "block", marginBottom: 6 }}>Seuil alerte</label>
                <input type="number" min="0" step="0.01" value={form.alert_threshold} onChange={fv("alert_threshold")} placeholder="vide = aucun"
                  style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 10px", fontSize: 14, color: C.dark, outline: "none", ...FF }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Btn variant="ghost" full onClick={() => setModal(null)}>Annuler</Btn>
              <Btn variant="primary" full onClick={saveIng} disabled={saving || !form.name.trim()}>{saving ? "…" : "Enregistrer"}</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Add / Edit Recipe Line ── */}
      {recipeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => { if (e.target === e.currentTarget) setRecipeModal(null); }}>
          <div style={{ background: C.white, borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, ...FF }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: C.dark, marginBottom: 20 }}>{recipeModal.ingredient_id ? "Modifier la quantité" : "Ajouter un ingrédient"}</p>
            {!recipeModal.ingredient_id && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500, display: "block", marginBottom: 6 }}>Ingrédient</label>
                <select value={recipeModal.ingredient_id} onChange={e => setRecipeModal(p => ({ ...p, ingredient_id: e.target.value }))}
                  style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: C.dark, background: C.white, outline: "none", ...FF }}>
                  <option value="">— Choisir —</option>
                  {ingredients.filter(i => !usedIngIds.has(i.id)).map(i => (
                    <option key={i.id} value={i.id}>{i.emoji} {i.name} ({i.unit})</option>
                  ))}
                </select>
              </div>
            )}
            {recipeModal.ingredient_id && (
              <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 14 }}>
                {ingredients.find(i => i.id === recipeModal.ingredient_id)?.emoji} {ingredients.find(i => i.id === recipeModal.ingredient_id)?.name}
              </p>
            )}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500, display: "block", marginBottom: 6 }}>
                Quantité par portion ({ingredients.find(i => i.id === recipeModal.ingredient_id)?.unit || "unité"})
              </label>
              <input type="number" min="0" step="0.001" value={recipeModal.qty} onChange={e => setRecipeModal(p => ({ ...p, qty: e.target.value }))} placeholder="ex: 0.250"
                style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 15, color: C.dark, outline: "none", ...FF }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" full onClick={() => setRecipeModal(null)}>Annuler</Btn>
              <Btn variant="primary" full onClick={() => saveRecipeLine(recipeModal.menu_item_id, recipeModal.ingredient_id, recipeModal.qty)} disabled={!recipeModal.ingredient_id || !recipeModal.qty}>Enregistrer</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_ITEM = { name: "", description: "", price: "", category: "Menus", emoji: "🍽️", photo_url: "", is_popular: false, is_menu: false, available: true, stock: "", supplements: [], extras: [] };
// supplements format: [{ groupName, required, maxChoices, options: [{name, price}] }]
// extras format: [{name, price}] — optional add-ons shown at end of composition tunnel
const CATEGORIES = ["Entrées", "Plats", "Poissons", "Burgers", "Pizzas", "Desserts", "Boissons", "Accompagnements"];

function MenuTabDash({ restaurant }) {
  const store = useContext(StoreCtx);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', item }
  const [form, setForm] = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [catOrder, setCatOrder] = useState([]); // custom category order
  const [showOrder, setShowOrder] = useState(false);
  const [showTranslate, setShowTranslate] = useState(false);
  const [translateLang, setTranslateLang] = useState("en");
  const [translations, setTranslations] = useState({}); // id → { name, description }
  const [translating, setTranslating] = useState(false);
  const [savingTranslations, setSavingTranslations] = useState(false);
  const TRANSLATE_LANGS = [
    { code: "en", label: "🇬🇧 Anglais" },
    { code: "ar", label: "🇸🇦 Arabe" },
    { code: "es", label: "🇪🇸 Espagnol" },
    { code: "pt", label: "🇵🇹 Portugais" },
    { code: "de", label: "🇩🇪 Allemand" },
    { code: "it", label: "🇮🇹 Italien" },
  ];

  async function gtranslate(text, tl) {
    if (!text?.trim()) return text;
    try {
      const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`);
      const j = await r.json();
      return j?.[0]?.map(s => s[0]).join("") || text;
    } catch { return text; }
  }

  async function autoTranslate() {
    setTranslating(true);
    const result = {};
    await Promise.all(items.map(async item => {
      const existing = item.translations?.[translateLang] || {};
      const [name, description] = await Promise.all([
        gtranslate(item.name, translateLang),
        item.description ? gtranslate(item.description, translateLang) : Promise.resolve(""),
      ]);
      result[item.id] = { name: existing.name || name, description: existing.description || description };
    }));
    setTranslations(result);
    setTranslating(false);
  }

  async function saveTranslations() {
    if (restaurant.id === "demo") { store.pushNotif("Indisponible en mode démo", "warning"); return; }
    setSavingTranslations(true);
    await Promise.all(items.map(async item => {
      const t = translations[item.id];
      if (!t) return;
      const existing = item.translations || {};
      const updated = { ...existing, [translateLang]: t };
      await supabase.from("menu_items").update({ translations: updated }).eq("id", item.id);
      setItems(p => p.map(i => i.id === item.id ? { ...i, translations: updated } : i));
    }));
    setSavingTranslations(false);
    store.pushNotif(`✅ Traductions ${translateLang.toUpperCase()} sauvegardées`, "success");
  }
  const [savingOrder, setSavingOrder] = useState(false);
  const dragCat = useRef(null);
  const [expandedCats, setExpandedCats] = useState({}); // cat → bool (show dishes in disposition)
  const [dishOrder, setDishOrder] = useState({}); // cat → [item ids] (pending reorder)
  const [renamingCat, setRenamingCat] = useState(null); // { oldName, value }
  const [groupClipboard, setGroupClipboard] = useState(null); // copied supplements groups
  const fv = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (restaurant.id === "demo") { setItems(DEMO_MENU); setLoading(false); return; }
    supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id).order("category").order("name")
      .then(({ data }) => { setItems(data ?? []); setLoading(false); });
    supabase.from("restaurant_settings").select("category_order").eq("restaurant_id", restaurant.id).maybeSingle()
      .then(({ data }) => { if (data?.category_order) setCatOrder(data.category_order); });
  }, [restaurant.id]);

  function openAdd() { setForm(EMPTY_ITEM); setError(""); setModal({ mode: "add" }); }
  function openEdit(item) { setForm({ name: item.name, description: item.description, price: String(item.price), category: item.category, emoji: item.emoji, photo_url: item.photo_url || "", is_popular: item.is_popular, is_menu: !!item.is_menu, available: item.available, stock: item.stock == null ? "" : String(item.stock), supplements: item.supplements || [], extras: item.extras || [] }); setError(""); setModal({ mode: "edit", item }); }

  async function updateStock(item, delta) {
    const cur = item.stock == null ? null : item.stock;
    if (cur == null) return;
    const next = Math.max(0, cur + delta);
    const available = next > 0;
    setItems(p => p.map(i => i.id === item.id ? { ...i, stock: next, available } : i));
    if (restaurant.id !== "demo") await supabase.from("menu_items").update({ stock: next, available }).eq("id", item.id);
  }

  async function uploadPhoto(file) {
    const ext = file.name.split(".").pop();
    const path = `${restaurant.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("menu-images").upload(path, file, { upsert: true });
    if (error) { setError("Erreur upload : " + error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("menu-images").getPublicUrl(path);
    setForm(p => ({ ...p, photo_url: publicUrl }));
  }

  async function save() {
    if (!form.name || !form.price) { setError("Nom et prix requis."); return; }
    setSaving(true); setError("");
    const stock = form.stock === "" ? null : parseInt(form.stock, 10);
    const available = stock == null ? form.available : stock > 0;
    const supplements = (form.supplements || [])
      .filter(g => g.groupName?.trim())
      .map(g => ({ groupName: g.groupName.trim(), required: !!g.required, maxChoices: g.maxChoices || 1, options: (g.options || []).filter(o => o.name?.trim()).map(o => ({ name: o.name.trim(), price: parseFloat(o.price) || 0 })) }))
      .filter(g => g.options.length > 0);
    const extras = (form.extras || [])
      .filter(e => e.name?.trim())
      .map(e => ({ name: e.name.trim(), price: parseFloat(e.price) || 0 }));
    const payload = { ...form, price: parseFloat(form.price), stock, available, restaurant_id: restaurant.id, supplements, extras };
    if (restaurant.id === "demo") {
      if (modal.mode === "add") {
        setItems(p => [...p, { ...payload, id: "dm_" + Date.now() }]);
      } else {
        setItems(p => p.map(i => i.id === modal.item.id ? { ...i, ...payload } : i));
      }
      setSaving(false); setModal(null); return;
    }
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
    setItems(p => p.map(i => i.id === item.id ? { ...i, available: !i.available } : i));
    if (restaurant.id !== "demo") await supabase.from("menu_items").update({ available: !item.available }).eq("id", item.id);
  }

  async function deleteItem(item) {
    if (!confirm(`Supprimer "${item.name}" ?`)) return;
    setItems(p => p.filter(i => i.id !== item.id));
    if (restaurant.id !== "demo") await supabase.from("menu_items").delete().eq("id", item.id);
  }

  const byCategory = items.reduce((acc, item) => { (acc[item.category] = acc[item.category] || []).push(item); return acc; }, {});
  Object.values(byCategory).forEach(arr => arr.sort((a, b) => ((a.sort_order ?? 9999) - (b.sort_order ?? 9999)) || a.name.localeCompare(b.name)));
  const allCats = Object.keys(byCategory);
  // Dish list for a category, applying any pending reorder
  function catDishes(cat) {
    const base = byCategory[cat] || [];
    const ids = dishOrder[cat];
    if (!ids) return base;
    const map = Object.fromEntries(base.map(i => [i.id, i]));
    return [...ids.map(id => map[id]).filter(Boolean), ...base.filter(i => !ids.includes(i.id))];
  }
  function moveDish(cat, idx, dir) {
    const list = catDishes(cat);
    const to = idx + dir;
    if (to < 0 || to >= list.length) return;
    const ids = list.map(i => i.id);
    [ids[idx], ids[to]] = [ids[to], ids[idx]];
    setDishOrder(p => ({ ...p, [cat]: ids }));
  }
  async function renameCategory(oldName, newName) {
    const name = newName.trim();
    if (!name || name === oldName) { setRenamingCat(null); return; }
    if (allCats.includes(name)) { store?.pushNotif?.("Cette catégorie existe déjà — les plats seront fusionnés", "info"); }
    setItems(p => p.map(i => i.category === oldName ? { ...i, category: name } : i));
    setCatOrder(p => p.map(c => c === oldName ? name : c));
    setDishOrder(p => { const { [oldName]: moved, ...rest } = p; return moved ? { ...rest, [name]: moved } : rest; });
    setExpandedCats(p => { const { [oldName]: was, ...rest } = p; return was ? { ...rest, [name]: true } : rest; });
    setRenamingCat(null);
    if (restaurant.id !== "demo") {
      await supabase.from("menu_items").update({ category: name }).eq("restaurant_id", restaurant.id).eq("category", oldName);
      await supabase.from("restaurant_settings").upsert({ restaurant_id: restaurant.id, category_order: orderedCats.map(c => c === oldName ? name : c), updated_at: new Date().toISOString() }, { onConflict: "restaurant_id" });
    }
    store?.pushNotif?.(`✅ Catégorie renommée : ${name}`, "success");
  }
  // Merge: catOrder first (only those that still exist), then any new cats not yet in order
  const orderedCats = [...catOrder.filter(c => allCats.includes(c)), ...allCats.filter(c => !catOrder.includes(c))];

  function onDragStart(cat) { dragCat.current = cat; }
  function onDragOver(e, cat) {
    e.preventDefault();
    if (dragCat.current === cat) return;
    setCatOrder(prev => {
      const order = orderedCats.filter(c => prev.length === 0 || prev.includes(c) || allCats.includes(c));
      const from = order.indexOf(dragCat.current);
      const to = order.indexOf(cat);
      if (from === -1 || to === -1) return prev;
      const next = [...order];
      next.splice(from, 1);
      next.splice(to, 0, dragCat.current);
      return next;
    });
  }
  function onDragEnd() { dragCat.current = null; }

  async function saveOrder() {
    setSavingOrder(true);
    if (restaurant.id !== "demo") {
      await supabase.from("restaurant_settings").upsert({ restaurant_id: restaurant.id, category_order: orderedCats, updated_at: new Date().toISOString() }, { onConflict: "restaurant_id" });
      // Persist dish order within each reordered category
      let sortErr = false;
      for (const [cat, ids] of Object.entries(dishOrder)) {
        for (let idx = 0; idx < ids.length; idx++) {
          const { error } = await supabase.from("menu_items").update({ sort_order: idx }).eq("id", ids[idx]);
          if (error?.message?.includes("column")) { sortErr = true; break; }
        }
        if (sortErr) break;
      }
      if (sortErr) store?.pushNotif?.("⚠️ Ordre des plats non sauvegardé : exécutez la migration SQL (colonne sort_order)", "warning");
    }
    // Apply dish order locally
    setItems(p => p.map(i => {
      const ids = dishOrder[i.category];
      if (!ids) return i;
      const idx = ids.indexOf(i.id);
      return idx === -1 ? i : { ...i, sort_order: idx };
    }));
    setCatOrder(orderedCats);
    setDishOrder({});
    setSavingOrder(false);
    setShowOrder(false);
  }

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ color: C.textSecondary, fontSize: 13 }}>{items.length} plat{items.length !== 1 ? "s" : ""}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={() => { setShowOrder(false); setShowTranslate(o => !o); if (!showTranslate) { setTranslations({}); } }}>🌍 Traduction</Btn>
          <Btn variant="ghost" size="sm" onClick={() => { setShowTranslate(false); setShowOrder(o => !o); }}>📋 Disposition</Btn>
          <Btn variant="primary" onClick={openAdd}>+ Ajouter un plat</Btn>
        </div>
      </div>

      {/* Translation panel */}
      {showTranslate && (
        <Surface style={{ padding: 20, marginBottom: 20, border: `1.5px solid ${C.accentBlue}30` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>🌍 Traduction de la carte</div>
              <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>Traduisez automatiquement vos plats. Les clients verront ces traductions quand ils changent de langue.</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={translateLang} onChange={e => { setTranslateLang(e.target.value); setTranslations({}); }}
                style={{ padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, background: C.white, cursor: "pointer" }}>
                {TRANSLATE_LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              <Btn variant="ghost" size="sm" disabled={translating} onClick={autoTranslate}>{translating ? "⏳ Traduction…" : "✨ Traduire automatiquement"}</Btn>
              {Object.keys(translations).length > 0 && (
                <Btn variant="primary" size="sm" disabled={savingTranslations} onClick={saveTranslations}>{savingTranslations ? "..." : "💾 Sauvegarder"}</Btn>
              )}
              <Btn variant="ghost" size="sm" onClick={() => setShowTranslate(false)}>✕</Btn>
            </div>
          </div>
          {Object.keys(translations).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 500, overflowY: "auto" }}>
              {items.map(item => {
                const t = translations[item.id];
                if (!t) return null;
                return (
                  <div key={item.id} style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 18 }}>{item.emoji}</span>
                      <span style={{ fontSize: 12, color: C.textTertiary, flex: 1 }}>{item.name}</span>
                    </div>
                    <input value={t.name} onChange={e => setTranslations(p => ({ ...p, [item.id]: { ...p[item.id], name: e.target.value } }))}
                      placeholder="Nom traduit"
                      style={{ padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} />
                    {item.description && (
                      <textarea value={t.description} onChange={e => setTranslations(p => ({ ...p, [item.id]: { ...p[item.id], description: e.target.value } }))}
                        placeholder="Description traduite" rows={2}
                        style={{ padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 12, width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0", color: C.textTertiary, fontSize: 13 }}>
              {translating ? "Traduction en cours…" : "Choisissez une langue et cliquez sur \"✨ Traduire automatiquement\""}
            </div>
          )}
        </Surface>
      )}

      {/* Category order panel */}
      {showOrder && (
        <Surface style={{ padding: 20, marginBottom: 20, border: `1.5px solid ${C.accentBlue}30` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>📋 Disposition de la carte</div>
              <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>Glissez les catégories pour les réordonner. L'ordre s'applique à la vue client.</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="ghost" size="sm" onClick={() => setShowOrder(false)}>Annuler</Btn>
              <Btn variant="primary" size="sm" disabled={savingOrder} onClick={saveOrder}>{savingOrder ? "..." : "💾 Enregistrer"}</Btn>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {orderedCats.map((cat, i) => {
              const dishes = catDishes(cat);
              const expanded = !!expandedCats[cat];
              const renaming = renamingCat?.oldName === cat;
              return (
                <div key={cat} style={{ background: C.bg, borderRadius: 10, border: `1.5px solid ${expanded ? C.accentBlue + "50" : C.border}` }}>
                  <div
                    draggable={!renaming}
                    onDragStart={() => onDragStart(cat)}
                    onDragOver={e => onDragOver(e, cat)}
                    onDragEnd={onDragEnd}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: renaming ? "default" : "grab", userSelect: "none" }}>
                    <span style={{ fontSize: 14, color: C.textTertiary, cursor: "grab" }}>⠿</span>
                    <span style={{ fontSize: 18 }}>{dishes[0]?.emoji || "🍽️"}</span>
                    {renaming ? (
                      <input autoFocus value={renamingCat.value}
                        onChange={e => setRenamingCat(p => ({ ...p, value: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") renameCategory(cat, renamingCat.value); if (e.key === "Escape") setRenamingCat(null); }}
                        onBlur={() => renameCategory(cat, renamingCat.value)}
                        style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.dark, background: "#fff", border: `1.5px solid ${C.accentBlue}`, borderRadius: 8, padding: "5px 10px", outline: "none", ...FF }} />
                    ) : (
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.dark, flex: 1 }}>{cat}</span>
                    )}
                    {!renaming && (
                      <button onClick={e => { e.stopPropagation(); setRenamingCat({ oldName: cat, value: cat }); }} title="Renommer la catégorie"
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "2px 4px", opacity: 0.6 }}>✏️</button>
                    )}
                    <button onClick={() => setExpandedCats(p => ({ ...p, [cat]: !p[cat] }))}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.accentBlue, fontWeight: 600, padding: "2px 6px", ...FF }}>
                      {dishes.length} plat{dishes.length !== 1 ? "s" : ""} {expanded ? "▴" : "▾"}
                    </button>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button onClick={() => setCatOrder(p => { const o = [...orderedCats]; if (i === 0) return o; o.splice(i, 1); o.splice(i - 1, 0, cat); return o; })}
                        style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.3 : 1, fontSize: 10, lineHeight: 1, padding: "1px 4px" }}>▲</button>
                      <button onClick={() => setCatOrder(p => { const o = [...orderedCats]; if (i === orderedCats.length - 1) return o; o.splice(i, 1); o.splice(i + 1, 0, cat); return o; })}
                        style={{ background: "none", border: "none", cursor: i === orderedCats.length - 1 ? "default" : "pointer", opacity: i === orderedCats.length - 1 ? 0.3 : 1, fontSize: 10, lineHeight: 1, padding: "1px 4px" }}>▼</button>
                    </div>
                  </div>
                  {/* Dishes inside category — reorderable */}
                  {expanded && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: "6px 10px 10px 38px", display: "flex", flexDirection: "column", gap: 4 }}>
                      {dishes.map((d, di) => (
                        <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: "#fff", borderRadius: 8, border: `1px solid ${C.border}` }}>
                          <span style={{ fontSize: 16 }}>{d.photo_url ? <img src={d.photo_url} alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover", verticalAlign: "middle" }} /> : d.emoji}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: C.dark, flex: 1 }}>{d.name}</span>
                          <span style={{ fontSize: 12, color: C.textTertiary }}>{Number(d.price).toFixed(2)} €</span>
                          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <button onClick={() => moveDish(cat, di, -1)}
                              style={{ background: "none", border: "none", cursor: di === 0 ? "default" : "pointer", opacity: di === 0 ? 0.3 : 1, fontSize: 9, lineHeight: 1, padding: "1px 4px" }}>▲</button>
                            <button onClick={() => moveDish(cat, di, 1)}
                              style={{ background: "none", border: "none", cursor: di === dishes.length - 1 ? "default" : "pointer", opacity: di === dishes.length - 1 ? 0.3 : 1, fontSize: 9, lineHeight: 1, padding: "1px 4px" }}>▼</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Surface>
      )}

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
        orderedCats.map(cat => { const catItems = byCategory[cat]; if (!catItems) return null; return (
          <div key={cat} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, letterSpacing: "0.08em", marginBottom: 8, paddingLeft: 4 }}>{cat.toUpperCase()}</p>
            <Surface style={{ overflow: "hidden" }}>
              {catItems.map((item, i) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px", borderBottom: i < catItems.length - 1 ? `1px solid ${C.border}` : "none", opacity: item.available ? 1 : 0.5 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden", flexShrink: 0 }}>
                    {item.photo_url ? <img src={item.photo_url} alt="" style={{ width: 44, height: 44, objectFit: "cover" }} /> : item.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{item.name}</p>
                      {item.is_menu && <Tag color="#0071E3">🍽️+🥤 Menu</Tag>}
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
        ); })
      )}

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 24 }}>
          <Surface style={{ padding: 32, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.dark, marginBottom: 24 }}>{modal.mode === "add" ? "Nouveau plat" : "Modifier le plat"}</h2>
            <div style={{ display: "flex", gap: 12, marginBottom: 4 }}>
              {/* Emoji fallback */}
              <div>
                <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Emoji</label>
                <input value={form.emoji} onChange={fv("emoji")} style={{ width: 60, textAlign: "center", background: C.bg, border: "none", borderRadius: 12, padding: "12px 8px", fontSize: 24, outline: "none" }} />
              </div>
              {/* Photo upload */}
              <div>
                <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Photo</label>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 60, height: 52, borderRadius: 12, background: form.photo_url ? "transparent" : C.bg, border: form.photo_url ? "none" : `2px dashed ${C.border}`, cursor: "pointer", overflow: "hidden", position: "relative" }}>
                  {form.photo_url
                    ? <img src={form.photo_url} alt="" style={{ width: 60, height: 52, objectFit: "cover", borderRadius: 12 }} />
                    : <span style={{ fontSize: 20 }}>📷</span>
                  }
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && uploadPhoto(e.target.files[0])} />
                </label>
              </div>
              {form.photo_url && (
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                  <button onClick={() => setForm(p => ({ ...p, photo_url: "" }))} style={{ background: C.bg, border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: C.textSecondary, cursor: "pointer" }}>✕ Retirer</button>
                </div>
              )}
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
                <input list="cat-suggestions" value={form.category} onChange={fv("category")} placeholder="Ex: Tacos, Pizzas…"
                  style={{ width: "100%", background: C.bg, border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 15, color: C.dark, outline: "none", ...FF, marginBottom: 16, boxSizing: "border-box" }} />
                <datalist id="cat-suggestions">
                  {[...CATEGORIES, ...Array.from(new Set(items.map(i => i.category).filter(c => c && !CATEGORIES.includes(c))))].map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Stock <span style={{ color: C.textTertiary, fontWeight: 400 }}>(laisser vide = illimité)</span>
              </label>
              <input type="number" min={0} placeholder="Ex: 12 — vide = illimité" value={form.stock} onChange={fv("stock")}
                style={{ width: "100%", background: C.bg, border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 15, color: C.dark, outline: "none", ...FF }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={form.is_popular} onChange={e => setForm(p => ({ ...p, is_popular: e.target.checked }))} style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 14, color: C.dark }}>⭐ Populaire</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                onClick={e => { e.preventDefault(); setForm(p => { const next = !p.is_menu; const hasPlatGroup = (p.supplements || []).some(g => g.groupName === "Plat"); const hasBoissGroup = (p.supplements || []).some(g => g.groupName === "Boisson"); const extra = next ? [ ...(!hasPlatGroup ? [{ groupName: "Plat", required: true, maxChoices: 1, options: [{ name: "", price: "" }] }] : []), ...(!hasBoissGroup ? [{ groupName: "Boisson", required: true, maxChoices: 1, options: [{ name: "", price: "" }] }] : []) ] : []; return { ...p, is_menu: next, supplements: next ? [...(p.supplements || []), ...extra] : p.supplements }; }); }}>
                <input type="checkbox" checked={form.is_menu} readOnly style={{ width: 16, height: 16, pointerEvents: "none" }} />
                <span style={{ fontSize: 14, color: C.dark }}>🍽️+🥤 Formule Menu</span>
              </label>
              {form.stock === "" && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.available} onChange={e => setForm(p => ({ ...p, available: e.target.checked }))} style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: 14, color: C.dark }}>✅ Disponible</span>
                </label>
              )}
            </div>
            {form.is_menu && (
              <div style={{ background: "#0071E310", border: "1px solid #0071E330", borderRadius: 10, padding: "8px 12px", marginBottom: 16, fontSize: 12, color: "#0071E3" }}>
                💡 Configurez les groupes <strong>Plat</strong> et <strong>Boisson</strong> ci-dessous pour définir les choix du menu.
              </div>
            )}
            {/* Garnitures section */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <label style={{ color: C.textSecondary, fontSize: 13, fontWeight: 600 }}>🧩 Garnitures & Composition</label>
                  <p style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>Créez des groupes de choix (ex: Viande, Sauce, Légumes)</p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {groupClipboard && (
                    <button type="button" onClick={() => setForm(p => ({ ...p, supplements: [...(p.supplements || []), ...groupClipboard.map(g => ({ ...g, options: g.options.map(o => ({ ...o })) }))] }))}
                      style={{ background: "#0071E3", color: C.white, border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", ...FF }}
                      title={`Coller ${groupClipboard.length} groupe(s)`}>
                      📋 Coller ({groupClipboard.length})
                    </button>
                  )}
                  {(form.supplements || []).length > 0 && (
                    <button type="button" onClick={() => { setGroupClipboard((form.supplements || []).map(g => ({ ...g, options: g.options.map(o => ({ ...o })) }))); store.pushNotif(`✅ ${form.supplements.length} groupe(s) copié(s)`, "success"); }}
                      style={{ background: C.bg, color: C.dark, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", ...FF }}>
                      📄 Copier
                    </button>
                  )}
                  <button type="button" onClick={() => setForm(p => ({ ...p, supplements: [...(p.supplements || []), { groupName: "", required: true, maxChoices: 1, options: [{ name: "", price: "" }] }] }))}
                    style={{ background: C.dark, color: C.white, border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, ...FF }}>
                    + Groupe
                  </button>
                </div>
              </div>
              {(form.supplements || []).map((grp, gi) => (
                <div key={gi} style={{ border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
                  {/* Group header */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                    {/* Reorder buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button type="button" disabled={gi === 0}
                        onClick={() => setForm(p => { const s = [...p.supplements]; [s[gi-1], s[gi]] = [s[gi], s[gi-1]]; return { ...p, supplements: s }; })}
                        style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, width: 22, height: 20, fontSize: 10, cursor: gi === 0 ? "default" : "pointer", color: gi === 0 ? C.border : C.textSecondary, lineHeight: 1, padding: 0 }}>▲</button>
                      <button type="button" disabled={gi === (form.supplements || []).length - 1}
                        onClick={() => setForm(p => { const s = [...p.supplements]; [s[gi], s[gi+1]] = [s[gi+1], s[gi]]; return { ...p, supplements: s }; })}
                        style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, width: 22, height: 20, fontSize: 10, cursor: gi === (form.supplements || []).length - 1 ? "default" : "pointer", color: gi === (form.supplements || []).length - 1 ? C.border : C.textSecondary, lineHeight: 1, padding: 0 }}>▼</button>
                    </div>
                    <input
                      placeholder="Nom du groupe (ex: Viande)"
                      value={grp.groupName}
                      onChange={e => setForm(p => { const s = [...p.supplements]; s[gi] = { ...s[gi], groupName: e.target.value }; return { ...p, supplements: s }; })}
                      style={{ flex: 1, background: C.bg, border: "none", borderRadius: 10, padding: "9px 12px", fontSize: 14, fontWeight: 600, color: C.dark, outline: "none", ...FF }}
                    />
                    <select value={grp.maxChoices} onChange={e => setForm(p => { const s = [...p.supplements]; s[gi] = { ...s[gi], maxChoices: Number(e.target.value) }; return { ...p, supplements: s }; })}
                      style={{ background: C.bg, border: "none", borderRadius: 10, padding: "9px 10px", fontSize: 13, color: C.dark, outline: "none", ...FF }}>
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} choix max</option>)}
                    </select>
                    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textSecondary, cursor: "pointer", whiteSpace: "nowrap" }}>
                      <input type="checkbox" checked={grp.required} onChange={e => setForm(p => { const s = [...p.supplements]; s[gi] = { ...s[gi], required: e.target.checked }; return { ...p, supplements: s }; })} />
                      Obligatoire
                    </label>
                    <button type="button" onClick={() => setForm(p => ({ ...p, supplements: p.supplements.filter((_, i) => i !== gi) }))}
                      style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 9px", cursor: "pointer", color: C.accent, fontSize: 13 }}>✕</button>
                  </div>
                  {/* Options */}
                  {(grp.options || []).map((opt, oi) => (
                    <div key={oi} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: C.textTertiary, width: 14, flexShrink: 0 }}>•</span>
                      <input
                        placeholder="Ex: Poulet, Bœuf, Falafel..."
                        value={opt.name}
                        onChange={e => setForm(p => { const s = [...p.supplements]; const opts = [...s[gi].options]; opts[oi] = { ...opts[oi], name: e.target.value }; s[gi] = { ...s[gi], options: opts }; return { ...p, supplements: s }; })}
                        style={{ flex: 1, background: C.bg, border: "none", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: C.dark, outline: "none", ...FF }}
                      />
                      <input
                        type="number" placeholder="0" min="0" step="0.5"
                        value={opt.price}
                        onChange={e => setForm(p => { const s = [...p.supplements]; const opts = [...s[gi].options]; opts[oi] = { ...opts[oi], price: e.target.value }; s[gi] = { ...s[gi], options: opts }; return { ...p, supplements: s }; })}
                        style={{ width: 64, background: C.bg, border: "none", borderRadius: 8, padding: "8px 8px", fontSize: 13, color: C.dark, outline: "none", ...FF }}
                      />
                      <span style={{ fontSize: 12, color: C.textSecondary }}>€</span>
                      {grp.options.length > 1 && (
                        <button type="button" onClick={() => setForm(p => { const s = [...p.supplements]; s[gi] = { ...s[gi], options: s[gi].options.filter((_, i) => i !== oi) }; return { ...p, supplements: s }; })}
                          style={{ background: "none", border: "none", cursor: "pointer", color: C.textTertiary, fontSize: 14, padding: "0 2px" }}>✕</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm(p => { const s = [...p.supplements]; s[gi] = { ...s[gi], options: [...s[gi].options, { name: "", price: "" }] }; return { ...p, supplements: s }; })}
                    style={{ background: "none", border: `1px dashed ${C.border}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: C.textSecondary, cursor: "pointer", marginTop: 4, width: "100%", ...FF }}>
                    + Option
                  </button>
                </div>
              ))}
            </div>
            {/* Suppléments additionnels */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <label style={{ color: C.textSecondary, fontSize: 13, fontWeight: 600 }}>➕ Suppléments additionnels</label>
                  <p style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>Options optionnelles proposées à la fin du tunnel (ex: Sauce pimentée, Extra fromage)</p>
                </div>
                <button type="button" onClick={() => setForm(p => ({ ...p, extras: [...(p.extras || []), { name: "", price: "" }] }))}
                  style={{ background: C.dark, color: C.white, border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, ...FF }}>
                  + Supplément
                </button>
              </div>
              {(form.extras || []).map((ext, ei) => (
                <div key={ei} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <input
                    placeholder="Ex: Extra fromage, Sauce pimentée…"
                    value={ext.name}
                    onChange={e => setForm(p => { const ex = [...(p.extras || [])]; ex[ei] = { ...ex[ei], name: e.target.value }; return { ...p, extras: ex }; })}
                    style={{ flex: 1, background: C.bg, border: "none", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: C.dark, outline: "none", ...FF }}
                  />
                  <input
                    type="number" placeholder="0" min="0" step="0.5"
                    value={ext.price}
                    onChange={e => setForm(p => { const ex = [...(p.extras || [])]; ex[ei] = { ...ex[ei], price: e.target.value }; return { ...p, extras: ex }; })}
                    style={{ width: 64, background: C.bg, border: "none", borderRadius: 8, padding: "8px 8px", fontSize: 13, color: C.dark, outline: "none", ...FF }}
                  />
                  <span style={{ fontSize: 12, color: C.textSecondary }}>€</span>
                  <button type="button" onClick={() => setForm(p => ({ ...p, extras: (p.extras || []).filter((_, i) => i !== ei) }))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.textTertiary, fontSize: 14, padding: "0 2px" }}>✕</button>
                </div>
              ))}
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
// PROMOS TAB
// ─────────────────────────────────────────────────────────────────────────────
const PROMO_COLORS = ["#FF9F0A", "#FF375F", "#34C759", "#0071E3", "#BF5AF2", "#1D1D1F"];
const PROMO_TYPES = [{ value: "happy_hour", label: "Happy Hour" }, { value: "seasonal", label: "Saisonnier" }, { value: "event", label: "Événement" }];
const EMPTY_PROMO_FORM = { name: "", description: "", discount_percent: 0, emoji: "🎁", color: "#FF9F0A", type: "event", start_date: "", end_date: "", active: true };

function EventCalendar({ promos }) {
  const [cur, setCur] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [selectedDay, setSelectedDay] = useState(null);
  const today = new Date();
  const isMobile = useIsMobile();

  const firstDay = new Date(cur.year, cur.month, 1);
  const daysInMonth = new Date(cur.year, cur.month + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7; // Monday=0

  const seasonalThisMonth = SEASONAL_EVENTS.filter(e => e.month === cur.month + 1);

  const promoEvents = promos.filter(p => {
    if (!p.start_date && !p.end_date) return false;
    const start = p.start_date ? new Date(p.start_date) : null;
    const end = p.end_date ? new Date(p.end_date) : null;
    const mStart = new Date(cur.year, cur.month, 1);
    const mEnd = new Date(cur.year, cur.month + 1, 0);
    if (start && end) return start <= mEnd && end >= mStart;
    if (start) return start.getMonth() === cur.month && start.getFullYear() === cur.year;
    return false;
  });

  const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const DAYS_FR = isMobile ? ["L","M","M","J","V","S","D"] : ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

  function getDayEvents(day) {
    const date = new Date(cur.year, cur.month, day);
    const seasonal = seasonalThisMonth.filter(e => e.day === day);
    const pEvents = promoEvents.filter(p => {
      const start = p.start_date ? new Date(p.start_date) : null;
      const end = p.end_date ? new Date(p.end_date) : null;
      if (start && end) return date >= start && date <= end;
      if (start) return start.getDate() === day;
      return false;
    });
    return { seasonal, promos: pEvents };
  }

  const cells = Array.from({ length: startDow }, () => null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEvents = selectedDay ? getDayEvents(selectedDay) : null;

  return (
    <Surface style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => { setCur(p => { const d = new Date(p.year, p.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; }); setSelectedDay(null); }}
          style={{ background: C.bg, border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 18, color: C.dark, ...FF }}>‹</button>
        <p style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{MONTHS_FR[cur.month]} {cur.year}</p>
        <button onClick={() => { setCur(p => { const d = new Date(p.year, p.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; }); setSelectedDay(null); }}
          style={{ background: C.bg, border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 18, color: C.dark, ...FF }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${C.border}` }}>
        {DAYS_FR.map((d, i) => <div key={i} style={{ padding: "6px 0", textAlign: "center", fontSize: 11, fontWeight: 700, color: C.textTertiary }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
        {cells.map((day, i) => {
          const isToday = day && today.getDate() === day && today.getMonth() === cur.month && today.getFullYear() === cur.year;
          const isSel = day === selectedDay;
          const { seasonal, promos: dayPromos } = day ? getDayEvents(day) : { seasonal: [], promos: [] };
          const hasEvent = seasonal.length > 0 || dayPromos.length > 0;
          return (
            <div key={i} onClick={() => day && setSelectedDay(isSel ? null : day)}
              style={{ minHeight: isMobile ? 48 : 64, padding: isMobile ? "4px 3px 2px" : "6px 6px 4px", borderBottom: i < cells.length - 7 ? `1px solid ${C.border}` : "none", borderRight: (i + 1) % 7 !== 0 ? `1px solid ${C.border}` : "none", background: isSel ? C.dark + "10" : isToday ? C.accentBlue + "08" : "transparent", cursor: day ? "pointer" : "default" }}>
              {day && <>
                <div style={{ width: isMobile ? 20 : 24, height: isMobile ? 20 : 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: isToday ? C.dark : "transparent", color: isToday ? C.white : hasEvent ? C.dark : C.textTertiary, fontSize: isMobile ? 11 : 12, fontWeight: isToday || hasEvent ? 700 : 400, marginBottom: 2 }}>{day}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {seasonal.map(ev => (
                    <div key={ev.name} title={ev.name} style={{ background: ev.color + "20", borderLeft: `2px solid ${ev.color}`, borderRadius: 3, padding: isMobile ? "1px 2px" : "1px 4px", fontSize: isMobile ? 10 : 10, fontWeight: 600, color: ev.color, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {isMobile ? ev.emoji : `${ev.emoji} ${ev.name}`}
                    </div>
                  ))}
                  {dayPromos.map(p => (
                    <div key={p.id} title={p.name} style={{ background: p.color + "20", borderLeft: `2px solid ${p.color}`, borderRadius: 3, padding: isMobile ? "1px 2px" : "1px 4px", fontSize: 10, fontWeight: 600, color: p.color, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {isMobile ? p.emoji : `${p.emoji} ${p.name}`}
                    </div>
                  ))}
                </div>
              </>}
            </div>
          );
        })}
      </div>
      {/* Selected day popup */}
      {selectedDay && selectedEvents && (selectedEvents.seasonal.length > 0 || selectedEvents.promos.length > 0) && (
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, background: C.bg }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 8 }}>
            {selectedDay} {MONTHS_FR[cur.month]}
          </p>
          {selectedEvents.seasonal.map(ev => (
            <div key={ev.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: ev.color + "12", borderRadius: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>{ev.emoji}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: ev.color }}>{ev.name}</p>
                <p style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.4 }}>{ev.msg}</p>
              </div>
            </div>
          ))}
          {selectedEvents.promos.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: p.color + "12", borderRadius: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>{p.emoji}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: p.color }}>{p.name}</p>
                <p style={{ fontSize: 12, color: C.textSecondary }}>{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Monthly event list */}
      {(seasonalThisMonth.length > 0 || promoEvents.length > 0) && (
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ce mois</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {seasonalThisMonth.map(ev => (
              <span key={ev.name} style={{ fontSize: 11, background: ev.color + "15", color: ev.color, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>{ev.emoji} {ev.name} (j.{ev.day})</span>
            ))}
            {promoEvents.map(p => (
              <span key={p.id} style={{ fontSize: 11, background: p.color + "15", color: p.color, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>{p.emoji} {p.name}</span>
            ))}
          </div>
        </div>
      )}
    </Surface>
  );
}

function PromosTab({ restaurant, store }) {
  const isDemo = restaurant.id === "demo";
  const isMobile = useIsMobile();
  // Use shared store so campaign launches from alerts appear instantly here
  const promos = store.promotions ?? [];
  const setPromos = store.setPromotions;
  const [subTab, setSubTab] = useState("promos"); // promos | calendar
  const [modal, setModal] = useState(null); // null | "new" | "edit" | "relance"
  const [editing, setEditing] = useState(null);
  const [relancePromo, setRelancePromo] = useState(null);
  const [form, setForm] = useState(EMPTY_PROMO_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const fv = k => e => setForm(p => ({ ...p, [k]: typeof e === "object" ? e.target.value : e }));

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function savePromo() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, discount_percent: parseInt(form.discount_percent) || 0, start_date: form.start_date || null, end_date: form.end_date || null };
    if (isDemo) {
      if (modal === "new") setPromos(p => [{ ...payload, id: "promo_" + Date.now(), restaurant_id: "demo", send_count: 0, created_at: new Date().toISOString() }, ...p]);
      else setPromos(p => p.map(x => x.id === editing.id ? { ...x, ...payload } : x));
      setSaving(false); setModal(null); return;
    }
    if (modal === "new") {
      const { data } = await supabase.from("promotions").insert({ ...payload, restaurant_id: restaurant.id }).select().single();
      if (data) setPromos(p => [data, ...p]);
    } else {
      await supabase.from("promotions").update(payload).eq("id", editing.id);
      setPromos(p => p.map(x => x.id === editing.id ? { ...x, ...payload } : x));
    }
    setSaving(false); setModal(null);
  }

  async function deletePromo(promo) {
    if (!confirm(`Supprimer "${promo.name}" ?`)) return;
    setPromos(p => p.filter(x => x.id !== promo.id));
    if (!isDemo) await supabase.from("promotions").delete().eq("id", promo.id);
  }

  async function toggleActive(promo) {
    const next = !promo.active;
    setPromos(p => p.map(x => x.id === promo.id ? { ...x, active: next } : x));
    if (!isDemo) await supabase.from("promotions").update({ active: next }).eq("id", promo.id);
  }

  function openNew() { setForm(EMPTY_PROMO_FORM); setEditing(null); setModal("new"); }
  function openEdit(promo) {
    setForm({ name: promo.name, description: promo.description, discount_percent: promo.discount_percent, emoji: promo.emoji, color: promo.color, type: promo.type, start_date: promo.start_date || "", end_date: promo.end_date || "", active: promo.active });
    setEditing(promo); setModal("edit");
  }

  const typeLabel = { happy_hour: "Happy Hour", seasonal: "Saisonnier", event: "Événement" };

  return (
    <div className="fade-in">
      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: C.accentGreen, color: "#fff", padding: "10px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 9000, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", ...FF }}>
          {toast}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.dark, letterSpacing: "-0.03em" }}>Promotions & Événements</h2>
          <p style={{ color: C.textSecondary, fontSize: 14, marginTop: 4 }}>{promos.length} promo{promos.length !== 1 ? "s" : ""} configurée{promos.length !== 1 ? "s" : ""}</p>
        </div>
        <Btn variant="primary" onClick={openNew}>+ Nouvelle promo</Btn>
      </div>

      {/* Sub-tab switcher */}
      <div style={{ display: "inline-flex", background: C.bg, borderRadius: 12, padding: 4, marginBottom: 24, gap: 2 }}>
        {[{ id: "promos", label: "🎁 Promos auto" }, { id: "codes", label: "🏷️ Codes promo" }, { id: "calendar", label: "📅 Calendrier" }].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: subTab === t.id ? C.white : "transparent", color: subTab === t.id ? C.dark : C.textSecondary, fontWeight: subTab === t.id ? 700 : 500, fontSize: 13, cursor: "pointer", boxShadow: subTab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s", ...FF }}>{t.label}</button>
        ))}
      </div>

      {subTab === "codes" && <PromoCodesTab restaurant={restaurant} />}
      {subTab === "calendar" && <EventCalendar promos={promos} />}

      {subTab === "promos" && (promos.length === 0 ? (
        <Surface style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>
          <p style={{ fontWeight: 700, fontSize: 16, color: C.dark, marginBottom: 6 }}>Aucune promotion</p>
          <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 20 }}>Créez des promotions pour fidéliser vos clients.</p>
          <Btn variant="primary" onClick={openNew}>+ Créer une promo</Btn>
        </Surface>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: isMobile ? 10 : 16 }}>
          {promos.map(promo => (
            <Surface key={promo.id} style={{ padding: 0, overflow: "hidden", borderTop: `3px solid ${promo.color}`, opacity: promo.active ? 1 : 0.7 }}>
              <div style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <span style={{ fontSize: 32 }}>{promo.emoji}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => toggleActive(promo)}
                      style={{ width: 36, height: 20, borderRadius: 10, border: "none", background: promo.active ? C.accentGreen : C.border, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
                      title={promo.active ? "Désactiver" : "Activer"}
                    >
                      <span style={{ position: "absolute", top: 2, left: promo.active ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                    </button>
                  </div>
                </div>
                <p style={{ fontWeight: 700, fontSize: 16, color: C.dark, marginBottom: 4 }}>{promo.name}</p>
                <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 12, lineHeight: 1.4 }}>{promo.description}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {promo.discount_percent > 0 && <Tag color={promo.color}>−{promo.discount_percent}%</Tag>}
                  <Tag color={C.textTertiary}>{typeLabel[promo.type] || promo.type}</Tag>
                  {promo.active ? <Tag color={C.accentGreen}>Active</Tag> : <Tag color={C.textTertiary}>Inactive</Tag>}
                </div>
                {(promo.start_date || promo.end_date) && (
                  <p style={{ fontSize: 12, color: C.textTertiary, marginBottom: 12 }}>
                    📅 {promo.start_date || "?"} {promo.end_date && promo.end_date !== promo.start_date ? `→ ${promo.end_date}` : ""}
                  </p>
                )}
                {promo.send_count > 0 && <p style={{ fontSize: 12, color: C.textSecondary, marginBottom: 12 }}>📧 {promo.send_count} envoi{promo.send_count > 1 ? "s" : ""}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="ghost" size="xs" full onClick={() => openEdit(promo)}>Modifier</Btn>
                  <Btn variant="subtle" size="xs" full onClick={() => { setRelancePromo(promo); setModal("relance"); }}>Relance</Btn>
                  <button onClick={() => deletePromo(promo)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: C.accent, fontSize: 12, ...FF }}>✕</button>
                </div>
              </div>
            </Surface>
          ))}
        </div>
      ))}

      {/* Add/Edit Modal */}
      {(modal === "new" || modal === "edit") && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 24 }} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <Surface style={{ padding: 32, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.dark, marginBottom: 24 }}>{modal === "new" ? "Nouvelle promotion" : "Modifier la promotion"}</h2>
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Emoji</label>
                <input value={form.emoji} onChange={fv("emoji")} maxLength={2} style={{ width: 60, textAlign: "center", background: C.bg, border: "none", borderRadius: 12, padding: "12px 8px", fontSize: 24, outline: "none" }} />
              </div>
              <div style={{ flex: 1 }}>
                <InputField label="Nom" placeholder="ex: Happy Hour" value={form.name} onChange={fv("name")} autoFocus />
              </div>
            </div>
            <InputField label="Description" placeholder="ex: Boissons à -30% de 17h à 19h" value={form.description} onChange={fv("description")} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Réduction (%)</label>
                <input type="number" min={0} max={100} value={form.discount_percent} onChange={fv("discount_percent")} style={{ width: "100%", background: C.bg, border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 15, color: C.dark, outline: "none", ...FF }} />
              </div>
              <div>
                <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Type</label>
                <select value={form.type} onChange={fv("type")} style={{ width: "100%", background: C.bg, border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: C.dark, outline: "none", ...FF }}>
                  {PROMO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Couleur</label>
              <div style={{ display: "flex", gap: 8 }}>
                {PROMO_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                    style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: form.color === c ? `3px solid ${C.dark}` : "3px solid transparent", cursor: "pointer", outline: "none" }} />
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Date début</label>
                <input type="date" value={form.start_date} onChange={fv("start_date")} style={{ width: "100%", background: C.bg, border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: C.dark, outline: "none", ...FF }} />
              </div>
              <div>
                <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Date fin</label>
                <input type="date" value={form.end_date} onChange={fv("end_date")} style={{ width: "100%", background: C.bg, border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: C.dark, outline: "none", ...FF }} />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 24 }}>
              <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 14, color: C.dark }}>Active (visible sur la carte client)</span>
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" full onClick={() => setModal(null)}>Annuler</Btn>
              <Btn variant="primary" full onClick={savePromo} disabled={saving || !form.name.trim()}>{saving ? "..." : "Enregistrer"}</Btn>
            </div>
          </Surface>
        </div>
      )}

      {/* Relance Modal */}
      {modal === "relance" && relancePromo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 24 }} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <Surface style={{ padding: 32, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.dark, marginBottom: 6 }}>📧 Envoyer une relance</h2>
            <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 24 }}>Aperçu de l'email qui sera envoyé à vos clients</p>
            {/* Phone preview */}
            <div style={{ background: C.bg, borderRadius: 16, padding: 20, marginBottom: 20, border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 11, color: C.textTertiary, marginBottom: 8 }}>De : votre-restaurant@wegemo.fr</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 16 }}>Objet : {relancePromo.emoji} {relancePromo.name} — Offre exclusive pour vous !</p>
              <div style={{ background: C.white, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: C.dark, marginBottom: 4 }}>{restaurant.name}</p>
                <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 12 }}>Une offre exclusive rien que pour vous !</p>
                <div style={{ background: relancePromo.color + "15", borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${relancePromo.color}30` }}>
                  <p style={{ fontSize: 24, marginBottom: 6 }}>{relancePromo.emoji}</p>
                  <p style={{ fontWeight: 700, fontSize: 16, color: relancePromo.color, marginBottom: 4 }}>{relancePromo.name}</p>
                  <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: relancePromo.discount_percent > 0 ? 8 : 0 }}>{relancePromo.description}</p>
                  {relancePromo.discount_percent > 0 && <p style={{ fontSize: 22, fontWeight: 900, color: relancePromo.color }}>−{relancePromo.discount_percent}%</p>}
                </div>
                <div style={{ background: C.dark, borderRadius: 10, padding: "10px 16px", textAlign: "center" }}>
                  <p style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>Voir la carte →</p>
                </div>
              </div>
            </div>
            <div style={{ background: C.bg, borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>👥</span>
              <p style={{ fontSize: 14, color: C.dark }}><strong>{isDemo ? Math.floor(Math.random() * 60 + 20) : "?"} clients</strong> dans votre base</p>
            </div>
            <Btn variant="primary" full onClick={() => {
              const count = isDemo ? Math.floor(Math.random() * 60 + 20) : Math.floor(Math.random() * 60 + 20);
              setModal(null);
              showToast(`✓ Relance envoyée à ${count} clients !`);
            }}>Envoyer la relance</Btn>
            <p style={{ textAlign: "center", fontSize: 12, color: C.textTertiary, marginTop: 12 }}>📧 Connexion email requise (Resend API) pour l'envoi réel</p>
            <Btn variant="ghost" full style={{ marginTop: 8 }} onClick={() => setModal(null)}>Annuler</Btn>
          </Surface>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAISSE TAB
// ─────────────────────────────────────────────────────────────────────────────
function pmLabel(pm) {
  if (pm === "card") return "Carte bancaire";
  if (pm === "apple_pay") return "Apple Pay";
  if (pm === "google_pay") return "Google Pay";
  return "Espèces";
}

function exportCSV(orders, restaurant) {
  const dateStr = new Date().toLocaleDateString("fr-FR");
  const headers = [
    "Date", "Heure", "N° Commande", "Table", "Client",
    "Article", "Quantité", "Prix unitaire HT (€)", "TVA 10% (€)", "Prix unitaire TTC (€)", "Total ligne TTC (€)",
    "Composition/Détail", "Note commande",
    "Mode paiement", "Total commande TTC (€)"
  ];
  const rows = [headers];
  orders.forEach(o => {
    const d = new Date(o.createdAt);
    const date = d.toLocaleDateString("fr-FR");
    const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const num = o.id.slice(0, 8).toUpperCase();
    const table = `Table ${o.table}`;
    const client = o.customerName || "";
    const note = (o.note || "").replace(/;/g, ",");
    const pm = pmLabel(o.payment_method);
    if (o.items && o.items.length > 0) {
      o.items.forEach((it, idx) => {
        const pttc = Number(it.price || 0);
        const pht = (pttc / 1.10);
        const tva = pttc - pht;
        const ligneTotal = pttc * it.qty;
        rows.push([
          date, heure, num, table, client,
          it.name, it.qty,
          pht.toFixed(2), tva.toFixed(2), pttc.toFixed(2), ligneTotal.toFixed(2),
          (it.detail || "").replace(/;/g, ","),
          idx === 0 ? note : "",
          idx === 0 ? pm : "",
          idx === 0 ? o.total.toFixed(2) : "",
        ]);
      });
    } else {
      rows.push([date, heure, num, table, client, "", "", "", "", "", "", "", note, pm, o.total.toFixed(2)]);
    }
    // blank separator row
    rows.push(Array(headers.length).fill(""));
  });
  // Summary footer
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const totalHT = revenue / 1.10;
  const totalTVA = revenue - totalHT;
  const byMethod = orders.reduce((acc, o) => { const m = pmLabel(o.payment_method); acc[m] = (acc[m] || 0) + o.total; return acc; }, {});
  rows.push(Array(headers.length).fill(""));
  rows.push(["=== RÉCAPITULATIF JOURNALIER ===", ...Array(headers.length - 1).fill("")]);
  rows.push([`Restaurant : ${restaurant.name}`, `Date : ${dateStr}`, `Nb commandes : ${orders.length}`, ...Array(headers.length - 3).fill("")]);
  rows.push([`CA TTC : ${revenue.toFixed(2)} €`, `CA HT : ${totalHT.toFixed(2)} €`, `TVA 10% : ${totalTVA.toFixed(2)} €`, ...Array(headers.length - 3).fill("")]);
  Object.entries(byMethod).forEach(([m, v]) => rows.push([`${m} : ${v.toFixed(2)} €`, ...Array(headers.length - 1).fill("")]));

  const csv = "﻿" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `caisse-${restaurant.name.replace(/\s+/g, "-")}-${dateStr.replace(/\//g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportRapportZ(orders, restaurant) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const heureStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const totalHT = revenue / 1.10;
  const totalTVA = revenue - totalHT;
  const avgTicket = orders.length > 0 ? revenue / orders.length : 0;
  const byMethod = orders.reduce((acc, o) => { const m = pmLabel(o.payment_method); acc[m] = (acc[m] || 0) + o.total; return acc; }, {});

  const line = (label, val, bold = false) =>
    `<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;font-size:13px;color:#444;${bold?"font-weight:700":""}}">${label}</td><td style="padding:6px 12px;text-align:right;font-size:13px;${bold?"font-weight:700;color:#000":"color:#222"}">${val}</td></tr>`;

  const orderRows = orders.map(o => {
    const d = new Date(o.createdAt);
    const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const client = o.customerName ? `<span style="color:#0071E3;font-weight:600">${o.customerName}</span>` : `<span style="color:#aaa">—</span>`;
    const articles = (o.items || []).map(it => {
      const detail = it.detail ? `<span style="color:#FF9F0A;font-size:11px"> · ${it.detail}</span>` : "";
      return `<span style="display:block;font-size:12px;color:#555">× ${it.qty} ${it.name}${detail}</span>`;
    }).join("");
    const pmBadge = `<span style="background:${o.payment_method === "card" ? "#0071E310" : o.payment_method?.includes("pay") ? "#BF5AF210" : "#34C75910"};color:${o.payment_method === "card" ? "#0071E3" : o.payment_method?.includes("pay") ? "#BF5AF2" : "#34C759"};font-size:11px;padding:2px 7px;border-radius:10px;font-weight:600">${pmLabel(o.payment_method)}</span>`;
    const note = o.note ? `<div style="font-size:11px;color:#888;margin-top:3px;font-style:italic">📝 ${o.note}</div>` : "";
    return `<tr style="border-bottom:1px solid #f0f0f0">
      <td style="padding:10px 12px;font-size:13px;color:#666;white-space:nowrap">${heure}</td>
      <td style="padding:10px 12px;font-size:13px;font-weight:600">T${o.table}</td>
      <td style="padding:10px 12px">${client}${note}</td>
      <td style="padding:10px 12px">${articles}</td>
      <td style="padding:10px 12px;text-align:center">${pmBadge}</td>
      <td style="padding:10px 12px;text-align:right;font-weight:800;font-size:15px">${o.total.toFixed(2)} €</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Rapport Z — ${restaurant.name} — ${dateStr}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 32px; color: #1d1d1f; background: #fff; }
    @media print { body { padding: 16px; } .no-print { display: none; } }
    h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; margin: 0 0 4px; }
    .sub { font-size: 14px; color: #666; margin-bottom: 32px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
    .card { background: #f5f5f7; border-radius: 14px; padding: 18px 20px; }
    .card-label { font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
    .card-value { font-size: 28px; font-weight: 900; letter-spacing: -0.04em; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f7; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
    th:last-child, td:last-child { text-align: right; }
    .section-title { font-size: 16px; font-weight: 700; margin: 28px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #1d1d1f; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #aaa; text-align: center; }
    .total-row { background: #1d1d1f; color: #fff; }
    .total-row td { padding: 12px; font-weight: 800; font-size: 16px; }
    button { background: #1d1d1f; color: #fff; border: none; border-radius: 10px; padding: 12px 24px; font-size: 15px; font-weight: 600; cursor: pointer; margin-right: 10px; }
  </style>
  </head><body>
  <div class="no-print" style="margin-bottom:24px">
    <button onclick="window.print()">🖨️ Imprimer</button>
    <button onclick="window.close()" style="background:#f5f5f7;color:#1d1d1f">✕ Fermer</button>
  </div>
  <h1>📊 Rapport Z — ${restaurant.name}</h1>
  <p class="sub">Clôture du ${dateStr} · Édité à ${heureStr}</p>

  <div class="grid">
    <div class="card"><div class="card-label">CA Total TTC</div><div class="card-value">${revenue.toFixed(2)} €</div></div>
    <div class="card"><div class="card-label">Nb commandes</div><div class="card-value">${orders.length}</div></div>
    <div class="card"><div class="card-label">Ticket moyen TTC</div><div class="card-value">${avgTicket.toFixed(2)} €</div></div>
    <div class="card"><div class="card-label">Espèces encaissées</div><div class="card-value">${(byMethod["Espèces"] || 0).toFixed(2)} €</div></div>
  </div>

  <div class="section-title">Répartition TVA</div>
  <table style="margin-bottom:24px">
    <thead><tr><th>Taux</th><th>Base HT</th><th>TVA</th><th>TTC</th></tr></thead>
    <tbody>
      ${line("TVA 10% (restauration)", `${totalHT.toFixed(2)} €`)}
      ${line("Montant TVA", `${totalTVA.toFixed(2)} €`)}
      ${line("Total TTC", `${revenue.toFixed(2)} €`, true)}
    </tbody>
  </table>

  <div class="section-title">Répartition par mode de paiement</div>
  <table style="margin-bottom:24px">
    <thead><tr><th>Mode</th><th>Nb transactions</th><th>Montant</th><th>%</th></tr></thead>
    <tbody>
      ${Object.entries(byMethod).map(([m, v]) => {
        const nb = orders.filter(o => pmLabel(o.payment_method) === m).length;
        return `<tr style="border-bottom:1px solid #eee">
          <td style="padding:8px 12px;font-size:13px">${m}</td>
          <td style="padding:8px 12px;font-size:13px;text-align:left">${nb}</td>
          <td style="padding:8px 12px;font-size:13px;text-align:right;font-weight:700">${v.toFixed(2)} €</td>
          <td style="padding:8px 12px;font-size:13px;text-align:right;color:#888">${revenue > 0 ? Math.round(v / revenue * 100) : 0}%</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>

  <div class="section-title">Journal détaillé des commandes</div>
  <table>
    <thead><tr><th>Heure</th><th>Table</th><th>Client</th><th>Articles</th><th style="text-align:center">Paiement</th><th>Total</th></tr></thead>
    <tbody>${orderRows}</tbody>
    <tfoot><tr class="total-row"><td colspan="5">TOTAL DU JOUR — ${orders.length} commande${orders.length !== 1 ? "s" : ""}</td><td>${revenue.toFixed(2)} €</td></tr></tfoot>
  </table>

  <div class="footer">
    Rapport généré par Wegemo · ${restaurant.name} · ${dateStr} à ${heureStr}<br>
    Document comptable — à conserver 10 ans (art. L123-22 Code de commerce)
  </div>
  </body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  w.document.write(html);
  w.document.close();
}

function CaisseTab({ store, restaurant }) {
  const isMobile = useIsMobile();
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [histOrders, setHistOrders] = useState(null);
  const [histLoading, setHistLoading] = useState(false);
  const isToday = selectedDate === todayStr;
  const orders = isToday ? (store.doneOrders || []) : (histOrders || []);

  useEffect(() => {
    if (isToday) { setHistOrders(null); return; }
    setHistLoading(true);
    const dayStart = new Date(selectedDate + "T00:00:00");
    const dayEnd = new Date(selectedDate + "T23:59:59.999");
    supabase.from("orders").select(ORDER_QUERY)
      .eq("restaurant_id", restaurant.id).eq("status", "DONE")
      .gte("created_at", dayStart.toISOString()).lte("created_at", dayEnd.toISOString())
      .order("created_at", { ascending: false })
      .then(({ data }) => { setHistOrders((data ?? []).map(fmtOrder)); setHistLoading(false); });
  }, [selectedDate, isToday, restaurant.id]);

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const avgTicket = orders.length > 0 ? revenue / orders.length : 0;
  const byMethod = orders.reduce((acc, o) => {
    const m = o.payment_method || "cash";
    acc[m] = (acc[m] || 0) + o.total;
    return acc;
  }, {});

  // Ticket de caisse customization
  const [ticketForm, setTicketForm] = useState({ ticket_address: "", ticket_phone: "", ticket_tax_id: "", ticket_footer: "" });
  const [ticketSaving, setTicketSaving] = useState(false);
  useEffect(() => {
    if (restaurant.id === "demo") return;
    supabase.from("restaurant_settings").select("ticket_address,ticket_phone,ticket_tax_id,ticket_footer").eq("restaurant_id", restaurant.id).maybeSingle()
      .then(({ data }) => { if (data) setTicketForm({ ticket_address: data.ticket_address || "", ticket_phone: data.ticket_phone || "", ticket_tax_id: data.ticket_tax_id || "", ticket_footer: data.ticket_footer || "" }); });
  }, [restaurant.id]);
  async function saveTicket() {
    if (restaurant.id === "demo") { store.pushNotif("Indisponible en mode démo", "warning"); return; }
    setTicketSaving(true);
    const { error } = await supabase.from("restaurant_settings").upsert({ restaurant_id: restaurant.id, ...ticketForm, updated_at: new Date().toISOString() }, { onConflict: "restaurant_id" });
    setTicketSaving(false);
    if (error) store.pushNotif(error.message?.includes("column") ? "⚠️ Exécutez la migration SQL (colonnes ticket_*)" : "Erreur : " + error.message, "warning");
    else store.pushNotif("✅ Ticket de caisse enregistré", "success");
  }
  const tf = field => e => setTicketForm(p => ({ ...p, [field]: e.target.value }));
  const tInput = { width: "100%", background: C.bg, border: "1.5px solid transparent", borderRadius: 12, padding: "12px 14px", color: C.dark, fontSize: 14, outline: "none", boxSizing: "border-box", ...FF };

  const dateLabel = isToday ? "Aujourd'hui" : new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="fade-in">
      {/* Date navigation */}
      <Surface style={{ padding: "14px 20px", marginBottom: isMobile ? 12 : 20, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split("T")[0]); }} style={{ width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...FF }}>‹</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.dark, textTransform: "capitalize", margin: 0 }}>{dateLabel}</p>
          <p style={{ fontSize: 11, color: C.textTertiary, margin: 0 }}>Historique caisse</p>
        </div>
        <input type="date" value={selectedDate} max={todayStr}
          onChange={e => e.target.value && setSelectedDate(e.target.value)}
          style={{ fontSize: 13, color: C.dark, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "6px 10px", background: C.white, cursor: "pointer", ...FF }} />
        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); const next = d.toISOString().split("T")[0]; if (next <= todayStr) setSelectedDate(next); }} disabled={isToday} style={{ width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${C.border}`, background: isToday ? C.bg : C.white, cursor: isToday ? "not-allowed" : "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: isToday ? 0.4 : 1, ...FF }}>›</button>
      </Surface>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 20 }}>
        <KPICard label="CA du jour" value={`${revenue.toFixed(2)}€`} sub="clôturées" />
        <KPICard label="Commandes" value={orders.length} sub="servies" />
        <KPICard label="Ticket moy." value={avgTicket > 0 ? `${avgTicket.toFixed(2)}€` : "—"} sub="" />
        <KPICard label="Espèces" value={`${(byMethod.cash || 0).toFixed(2)}€`} sub="à encaisser" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 20 }}>
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
          <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 6 }}>Exports comptables</p>
          <p style={{ fontSize: 12, color: C.textTertiary, marginBottom: 16 }}>Détail par article, client, TVA, mode de paiement</p>
          <Btn variant="primary" full onClick={() => exportCSV(orders, restaurant)} style={{ marginBottom: 10 }}>
            📊 Exporter CSV (Excel / comptable)
          </Btn>
          <Btn variant="ghost" full onClick={() => exportRapportZ(orders, restaurant)} style={{ marginBottom: 10 }}>
            🖨️ Rapport Z — impression / PDF
          </Btn>
          {orders.length === 0 && !histLoading && (
            <p style={{ color: C.textTertiary, fontSize: 13, textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
              Aucune commande clôturée<br />{isToday ? "aujourd'hui" : "ce jour-là"}.
            </p>
          )}
        </Surface>
      </div>

      <Surface style={{ overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Journal — {isToday ? "Aujourd'hui" : new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
          <p style={{ fontSize: 13, color: C.textSecondary }}>{orders.length} commande{orders.length !== 1 ? "s" : ""}</p>
        </div>
        {histLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textTertiary, fontSize: 14 }}>Chargement…</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textTertiary, fontSize: 14 }}>
            Aucune commande clôturée {isToday ? "aujourd'hui" : "ce jour-là"}.<br />
            {isToday && <span style={{ fontSize: 12 }}>Passez les commandes en "Servie" depuis la vue cuisine.</span>}
          </div>
        ) : orders.map((o, i) => {
          const pm = pmLabel(o.payment_method);
          const pmColor = o.payment_method === "card" ? C.accentBlue : o.payment_method?.includes("pay") ? C.accentPurple : C.accentGreen;
          return (
            <div key={o.id} style={{ padding: "14px 22px", borderBottom: i < orders.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: C.dark, flexShrink: 0 }}>T{o.table}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>#{o.id.slice(0, 6).toUpperCase()}</p>
                    {o.customerName && <span style={{ fontSize: 12, fontWeight: 600, color: "#0071E3", background: "#0071E310", borderRadius: 8, padding: "1px 8px" }}>👤 {o.customerName}</span>}
                    <span style={{ fontSize: 11, color: C.textTertiary }}>{new Date(o.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 8px" }}>
                    {(o.items || []).map((it, ii) => (
                      <span key={ii} style={{ fontSize: 12, color: C.textSecondary }}>
                        {it.emoji} {it.name} ×{it.qty}{it.detail ? <span style={{ color: C.accentOrange }}> ({it.detail})</span> : ""}
                      </span>
                    ))}
                  </div>
                  {o.note && <p style={{ fontSize: 11, color: C.textTertiary, marginTop: 3, fontStyle: "italic" }}>📝 {o.note}</p>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  <p style={{ fontWeight: 800, fontSize: 16, color: C.dark }}>{o.total.toFixed(2)} €</p>
                  <Tag color={pmColor}>{pm}</Tag>
                </div>
              </div>
            </div>
          );
        })}
        {orders.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 22px", background: C.bg, borderTop: `2px solid ${C.borderStrong}` }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>Total</p>
            <p style={{ fontWeight: 900, fontSize: 20, color: C.dark, letterSpacing: "-0.03em" }}>{revenue.toFixed(2)} €</p>
          </div>
        )}
      </Surface>

      {/* Personnalisation du ticket de caisse */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: isMobile ? 8 : 12, marginTop: isMobile ? 12 : 20 }}>
        <Surface style={{ padding: "22px 24px" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 4 }}>🧾 Ticket de caisse</p>
          <p style={{ fontSize: 12, color: C.textTertiary, marginBottom: 18 }}>Ces informations apparaissent sur le ticket remis au client (espèces et carte) et sur le reçu envoyé par email. Le nom du restaurant apparaît toujours.</p>
          <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Adresse du restaurant</label>
          <input type="text" value={ticketForm.ticket_address} onChange={tf("ticket_address")} placeholder="12 rue de la République, 75001 Paris" style={{ ...tInput, marginBottom: 14 }} />
          <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Téléphone</label>
          <input type="text" value={ticketForm.ticket_phone} onChange={tf("ticket_phone")} placeholder="+33 1 23 45 67 89" style={{ ...tInput, marginBottom: 14 }} />
          <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>N° d'identification fiscale (NIF, SIRET, TVA…)</label>
          <input type="text" value={ticketForm.ticket_tax_id} onChange={tf("ticket_tax_id")} placeholder="NIF 123456789" style={{ ...tInput, marginBottom: 14 }} />
          <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Message en bas du ticket</label>
          <textarea value={ticketForm.ticket_footer} onChange={tf("ticket_footer")} rows={2} placeholder="Merci de votre visite ! À bientôt 🙏" style={{ ...tInput, resize: "vertical", marginBottom: 16 }} />
          <Btn variant="primary" full onClick={saveTicket} disabled={ticketSaving}>{ticketSaving ? "Enregistrement…" : "💾 Enregistrer le ticket"}</Btn>
        </Surface>
        <Surface style={{ padding: "22px 20px" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.textTertiary, letterSpacing: "0.06em", marginBottom: 10, textAlign: "center" }}>APERÇU</p>
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 16px", fontFamily: "monospace", fontSize: 11, color: C.dark, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <p style={{ textAlign: "center", fontWeight: 800, fontSize: 13, margin: "0 0 2px" }}>{restaurant.name}</p>
            {ticketForm.ticket_address && <p style={{ textAlign: "center", margin: "0 0 1px", color: C.textSecondary }}>{ticketForm.ticket_address}</p>}
            {ticketForm.ticket_phone && <p style={{ textAlign: "center", margin: "0 0 1px", color: C.textSecondary }}>Tél : {ticketForm.ticket_phone}</p>}
            {ticketForm.ticket_tax_id && <p style={{ textAlign: "center", margin: "0 0 1px", color: C.textSecondary }}>{ticketForm.ticket_tax_id}</p>}
            <p style={{ textAlign: "center", margin: "6px 0", borderTop: `1px dashed ${C.border}`, borderBottom: `1px dashed ${C.border}`, padding: "6px 0" }}>1× Tacos poulet — 8.50 €<br />1× Coca-Cola — 2.50 €</p>
            <p style={{ textAlign: "center", fontWeight: 800, fontSize: 12, margin: "0 0 6px" }}>TOTAL : 11.00 €</p>
            <p style={{ textAlign: "center", fontWeight: 800, color: "#C77700", border: "1.5px solid #FF9F0A", background: "#FF9F0A10", borderRadius: 6, padding: "3px 0", margin: "0 0 6px" }}>💵 À PAYER À LA CAISSE</p>
            {ticketForm.ticket_footer && <p style={{ textAlign: "center", margin: 0, fontStyle: "italic", color: C.textSecondary }}>{ticketForm.ticket_footer}</p>}
          </div>
        </Surface>
      </div>
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
    customerName: o.customer_name || "",
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
    if (restaurantId === "demo") {
      setOrders(DEMO_ORDERS.map(o => ({ ...o, items: o.items.map(i => ({ ...i, done: false })) })));
      setLoading(false);
      return;
    }
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
          pushNotif(`Commande #${order.id.slice(0,6).toUpperCase()} — Table ${order.table}${order.customerName ? ` · ${order.customerName}` : ""}`, "new");
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

    // Polling fallback every 8s in case Realtime dropped silently — re-fetches
    // active orders and merges any the websocket missed.
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, tables(number), order_items(*, menu_items(name, emoji, category))")
        .eq("restaurant_id", restaurantId).neq("status", "DONE")
        .order("created_at", { ascending: true });
      if (!data) return;
      setOrders(prev => {
        const known = new Set(prev.map(o => o.id));
        const incoming = data.map(fmt);
        const fresh = incoming.filter(o => !known.has(o.id));
        if (fresh.length === 0) return prev;
        fresh.forEach(o => pushNotif(`Commande #${o.id.slice(0,6).toUpperCase()} — Table ${o.table}${o.customerName ? ` · ${o.customerName}` : ""}`, "new"));
        return [...fresh, ...prev];
      });
    }, 3000);

    return () => { supabase.removeChannel(channel); clearInterval(tick); clearInterval(poll); };
  }, [restaurantId]);

  const advanceOrder = useCallback(async (id) => {
    const next = { new: "cooking", cooking: "ready", ready: "served" };
    const nextDB = { new: "PREPARING", cooking: "READY", ready: "DONE" };
    if (restaurantId === "demo") {
      setOrders(prev => {
        const o = prev.find(x => x.id === id);
        if (!o || !next[o.status]) return prev;
        if (o.status === "ready") return prev.filter(x => x.id !== id);
        return prev.map(x => x.id === id ? { ...x, status: next[x.status] } : x);
      });
      return;
    }
    setOrders(prev => {
      const o = prev.find(x => x.id === id);
      if (!o || !nextDB[o.status]) return prev;
      const newDbStatus = nextDB[o.status];
      supabase.from("orders").update({ status: newDbStatus }).eq("id", id).then(() => {});
      // Fire the customer's "order ready" push notification — silently
      // does nothing if they never subscribed (no edge function deployed
      // yet, or they declined notification permission).
      if (newDbStatus === "READY") {
        supabase.functions.invoke("send-ready-push", { body: { order_id: id } }).catch(() => {});
      }
      return prev; // realtime update will handle the state change
    });
  }, [restaurantId]);

  const toggleItem = useCallback((orderId, itemId) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, items: o.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) } : o
    ));
  }, []);

  return { orders, served, loading, advanceOrder, toggleItem };
}

function CuisineView({ restaurant, onBack, onLogout }) {
  const store = useContext(StoreCtx);
  const { orders, served, loading, advanceOrder, toggleItem } = useLiveOrders(restaurant.id, store.pushNotif);
  const [clock, setClock] = useState(new Date());
  const [etaMap, setEtaMap] = useState({});
  const [newOrderAlert, setNewOrderAlert] = useState(null); // { id, table, order_type, items }
  const seenOrderIds = useRef(new Set());
  const seededRef = useRef(false);
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);

  // Detect new orders and trigger alert
  useEffect(() => {
    if (loading) return;
    // First time orders are loaded: mark already-existing orders as seen
    // without ringing (only genuinely NEW arrivals should trigger the alarm).
    if (!seededRef.current) {
      seededRef.current = true;
      orders.forEach(o => seenOrderIds.current.add(o.id));
      return;
    }
    const newOrders = orders.filter(o => o.status === "new" && !seenOrderIds.current.has(o.id));
    newOrders.forEach(o => seenOrderIds.current.add(o.id));
    if (newOrders.length > 0) {
      setNewOrderAlert(newOrders[0]);
      playOrderAlarm();
    }
  }, [orders, loading]);

  // Keep ringing every few seconds as long as at least one order is still
  // waiting to be accepted (status "new" / PENDING) and hasn't been silenced
  // by a user click — stops as soon as it's accepted, silenced, or empty.
  const silenced = useSilencedOrders();
  const pendingCount = orders.filter(o => o.status === "new" && !silenced.has(o.id)).length;
  useEffect(() => {
    if (pendingCount === 0) return;
    const id = setInterval(() => playOrderAlarm(), 2500);
    return () => clearInterval(id);
  }, [pendingCount]);

  // Load existing ETAs on mount
  useEffect(() => {
    if (!orders.length || restaurant.id === "demo") return;
    const ids = orders.map(o => o.id).filter(id => !id.startsWith("demo"));
    if (!ids.length) return;
    supabase.from("orders").select("id,estimated_ready_at").in("id", ids)
      .then(({ data }) => {
        if (!data) return;
        const map = {};
        data.forEach(r => { if (r.estimated_ready_at) map[r.id] = r.estimated_ready_at; });
        setEtaMap(map);
      });
  }, [orders.length]);

  async function adjustETA(orderId, deltaMin) {
    const current = etaMap[orderId] ? new Date(etaMap[orderId]) : new Date(Date.now() + 15 * 60 * 1000);
    const next = new Date(current.getTime() + deltaMin * 60 * 1000);
    // Don't go below 1 minute from now
    const min1 = new Date(Date.now() + 60 * 1000);
    const clamped = next < min1 ? min1 : next;
    setEtaMap(p => ({ ...p, [orderId]: clamped.toISOString() }));
    if (restaurant.id !== "demo") {
      await supabase.from("orders").update({ estimated_ready_at: clamped.toISOString() }).eq("id", orderId);
    }
  }

  const COLS = [
    { key: "new", label: "Nouvelles", color: "#0071E3", orders: orders.filter(o => o.status === "new") },
    { key: "cooking", label: "En cuisine", color: "#FF9F0A", orders: orders.filter(o => o.status === "cooking") },
    { key: "ready", label: "Prêtes ✓", color: "#34C759", orders: orders.filter(o => o.status === "ready") },
  ];
  const btn = { new: "Accepter →", cooking: "Prête ✓", ready: "Servie ✓" };
  const audioUnlocked = useOrderAudioUnlocked();

  return (
    <div style={{ background: "#F5F5F7", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Figtree', -apple-system, sans-serif" }}>
      <style>{css}</style>
      <Toasts notifs={store.notifications} />

      {/* Sound must be enabled by an explicit tap (browser autoplay rules) —
          show until confirmed unlocked, so the alarm can never silently fail. */}
      {!audioUnlocked && (
        <div onClick={unlockOrderAudio} style={{ position: "sticky", top: 0, zIndex: 10000, background: "#FF3B30", color: "#fff", textAlign: "center", padding: "12px 16px", fontWeight: 800, fontSize: 15, cursor: "pointer", ...FF }}>
          🔔 Cliquez ici pour activer la sonnerie des nouvelles commandes — vous entendrez un petit bip de confirmation
        </div>
      )}
      {audioUnlocked && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 20px 0" }}>
          <button onClick={playOrderAlarm} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.textSecondary, ...FF }}>
            🔊 Tester la sonnerie
          </button>
        </div>
      )}

      {/* New order alert overlay — closing it does NOT stop the alarm, only
          actually accepting the order does (per explicit requirement). */}
      {newOrderAlert && (
        <div onClick={() => setNewOrderAlert(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", animation: "fadeIn 0.2s ease" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 28, padding: "36px 48px", textAlign: "center", maxWidth: 380, width: "90%", boxShadow: "0 32px 80px rgba(0,0,0,0.4)", animation: "popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ fontSize: 64, marginBottom: 12, animation: "bellShake 0.6s ease infinite" }}>🔔</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.textTertiary, letterSpacing: "0.08em", marginBottom: 8 }}>NOUVELLE COMMANDE</p>
            <p style={{ fontSize: 48, fontWeight: 900, color: C.dark, lineHeight: 1, marginBottom: 8 }}>Table {newOrderAlert.table}</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: newOrderAlert.order_type === "takeaway" ? "#FFF3E0" : "#E8F5E9", borderRadius: 20, padding: "8px 18px", marginBottom: 20 }}>
              <span style={{ fontSize: 20 }}>{newOrderAlert.order_type === "takeaway" ? "🥡" : "🍽️"}</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: newOrderAlert.order_type === "takeaway" ? "#E65100" : "#2E7D32" }}>{newOrderAlert.order_type === "takeaway" ? "À emporter" : "Sur place"}</span>
            </div>
            <div style={{ background: C.bg, borderRadius: 14, padding: "12px 16px", marginBottom: 24, textAlign: "left" }}>
              {newOrderAlert.items?.slice(0, 4).map((item, i) => (
                <p key={i} style={{ fontSize: 14, color: C.dark, fontWeight: 600, padding: "3px 0" }}>×{item.qty} {item.emoji} {item.name}</p>
              ))}
              {(newOrderAlert.items?.length > 4) && <p style={{ fontSize: 12, color: C.textTertiary, marginTop: 4 }}>+{newOrderAlert.items.length - 4} autre(s)…</p>}
            </div>
            <button onClick={() => { if (newOrderAlert) { advanceOrder(newOrderAlert.id); silenceOrder(newOrderAlert.id); } setNewOrderAlert(null); }} style={{ width: "100%", padding: "16px 0", background: C.dark, color: C.white, border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: "pointer", ...FF }}>
              ✓ Accepter la commande
            </button>
            <button onClick={() => setNewOrderAlert(null)} style={{ width: "100%", padding: "12px 0", background: "none", border: "none", color: C.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 8, ...FF }}>
              Fermer (la sonnerie continue)
            </button>
          </div>
        </div>
      )}

      <header style={{ background: C.dark, height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {onBack
            ? <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "7px 14px", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 13, fontWeight: 500, ...FF }}>← Dashboard</button>
            : onLogout && <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "7px 14px", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 13, fontWeight: 500, ...FF }}>Déconnexion</button>
          }
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
                        <div>
                          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>TABLE</p>
                          {order.customerName
                            ? <p style={{ fontSize: 13, color: C.white, fontWeight: 700, letterSpacing: "-0.01em" }}>{order.customerName}</p>
                            : <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{order.id.slice(0, 6)}</p>
                          }
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: order.order_type === "takeaway" ? "rgba(255,160,0,0.25)" : "rgba(255,255,255,0.15)", borderRadius: 10, padding: "2px 8px", marginTop: 3 }}>
                            <span style={{ fontSize: 11 }}>{order.order_type === "takeaway" ? "🥡" : "🍽️"}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: order.order_type === "takeaway" ? "#FFD600" : "rgba(255,255,255,0.85)" }}>{order.order_type === "takeaway" ? "Emporter" : "Sur place"}</span>
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color: C.white, lineHeight: 1 }}>{order.elapsed}<span style={{ fontSize: 12, opacity: 0.6 }}>min</span></p>
                        {isLate && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>⚠ RETARD</p>}
                      </div>
                    </div>
                    {order.payment_method === "cash" && (
                      <div style={{ background: order.paid ? "#E8F5E9" : "#FFF3E0", borderBottom: `1px solid ${order.paid ? "#A5D6A7" : "#FFCC80"}`, padding: "6px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14 }}>{order.paid ? "✅" : "💵"}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: order.paid ? "#2E7D32" : "#E65100" }}>
                          {order.paid ? "Espèces encaissées" : "Espèces — non encaissé"}
                        </span>
                      </div>
                    )}
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
                            {item.detail && (
                              <details onClick={e => e.stopPropagation()} style={{ marginTop: 4 }}>
                                <summary style={{ fontSize: 11, color: C.accentOrange, fontWeight: 700, cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 4, userSelect: "none" }}>
                                  <span style={{ fontSize: 9 }}>▶</span> Composition
                                </summary>
                                <div style={{ marginTop: 5, paddingLeft: 8, borderLeft: `2px solid ${C.accentOrange}30` }}>
                                  {item.detail.split(" · ").map((part, pi) => (
                                    <p key={pi} style={{ fontSize: 12, color: part.startsWith("+") ? C.accentOrange : C.textSecondary, fontWeight: part.startsWith("+") ? 700 : 500, margin: "2px 0", lineHeight: 1.4 }}>
                                      {part.startsWith("+") ? part : `• ${part}`}
                                    </p>
                                  ))}
                                </div>
                              </details>
                            )}
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
                    {order.status !== "ready" && (() => {
                      const eta = etaMap[order.id] ? new Date(etaMap[order.id]) : null;
                      const diffMin = eta ? Math.round((eta - clock) / 60000) : null;
                      const etaStr = eta ? eta.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : null;
                      return (
                        <div style={{ padding: "0 12px 8px" }}>
                          <div style={{ background: "#FFF8E7", border: "1px solid #FFD60A30", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                              <p style={{ fontSize: 10, color: "#7A5C00", fontWeight: 700, letterSpacing: "0.05em" }}>TEMPS CLIENT</p>
                              <p style={{ fontSize: 15, fontWeight: 800, color: "#7A5C00", lineHeight: 1.1 }}>
                                {eta ? (diffMin <= 0 ? "Prêt!" : `≈ ${diffMin} min`) : "— min"}
                                {etaStr && diffMin > 0 && <span style={{ fontSize: 11, fontWeight: 500, color: "#A07800" }}> · {etaStr}</span>}
                              </p>
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => adjustETA(order.id, -5)} style={{ background: C.accentGreen + "20", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 14, fontWeight: 800, color: C.accentGreen, cursor: "pointer", ...FF }}>−5</button>
                              <button onClick={() => adjustETA(order.id, 5)} style={{ background: C.accent + "20", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 14, fontWeight: 800, color: C.accent, cursor: "pointer", ...FF }}>+5</button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    <div style={{ padding: "6px 12px 12px" }}>
                      <button onClick={() => { if (canAdvance) { advanceOrder(order.id); silenceOrder(order.id); } }} className="btn-press" style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: !canAdvance ? C.bg : order.status === "ready" ? C.accentGreen : C.dark, color: !canAdvance ? C.textTertiary : C.white, fontSize: 14, fontWeight: 700, cursor: canAdvance ? "pointer" : "not-allowed", transition: "all 0.15s", ...FF }}>
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
function CardPaymentForm({ total, onSuccess, onCancel, restaurant }) {
  const containerRef = useRef(null);
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const ENV_STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const rid = restaurant?.id && restaurant.id !== "demo" ? restaurant.id : null;
        // Use the configured supabase client (same one that loads the menu) to
        // avoid CORS/preflight quirks with raw fetch.
        // NB: the deployed function slug has a trailing dash ("create-payment-intent-"),
        // so try it first, then fall back to the canonical name.
        let parsed = null, invokeErr = null;
        for (const fnName of ["create-payment-intent-", "create-payment-intent"]) {
          const r = await supabase.functions.invoke(fnName, { body: { amount: total, restaurant_id: rid } });
          if (!r.error && r.data) { parsed = r.data; invokeErr = null; break; }
          invokeErr = r.error;
        }
        if (invokeErr) throw new Error(`Appel fonction: ${invokeErr.message || invokeErr}`);
        const { client_secret, publishable_key, error: fnErr } = parsed || {};
        if (cancelled) return;
        const pubKey = ENV_STRIPE_KEY || publishable_key;
        if (fnErr === "stripe_not_configured") { setConfigured(false); setReady(true); return; }
        if (fnErr) throw new Error(`Fonction: ${fnErr}`);
        if (!pubKey) throw new Error("Clé publique Stripe absente (publishable_key vide)");
        if (!client_secret) throw new Error("client_secret absent");
        const stripe = window.Stripe(pubKey);
        stripeRef.current = stripe;
        const elements = stripe.elements({ clientSecret: client_secret, appearance: { theme: "flat", variables: { borderRadius: "12px", fontFamily: "'Figtree', sans-serif" } } });
        elementsRef.current = elements;
        setReady(true); // mounting happens in the effect below, once the container is rendered
      } catch (e) {
        if (cancelled) return;
        setError("Erreur paiement — " + (e?.message || String(e)));
        setReady(true);
      }
    };
    let check;
    if (window.Stripe) { init(); } else {
      check = setInterval(() => { if (window.Stripe) { clearInterval(check); init(); } }, 100);
    }
    return () => { cancelled = true; if (check) clearInterval(check); };
  }, [total, restaurant?.id]);

  // Mount the Payment Element only after the container div is actually rendered
  // (while !ready the component shows a spinner and containerRef is null)
  const mountedRef = useRef(false);
  useEffect(() => {
    if (ready && elementsRef.current && containerRef.current && !mountedRef.current) {
      const payEl = elementsRef.current.create("payment");
      payEl.mount(containerRef.current);
      mountedRef.current = true;
    }
  }, [ready]);

  async function pay() {
    if (!stripeRef.current || !elementsRef.current || paying) return;
    setPaying(true); setError("");
    const { error: err, paymentIntent } = await stripeRef.current.confirmPayment({ elements: elementsRef.current, confirmParams: { return_url: window.location.href }, redirect: "if_required" });
    if (err) { setError(err.message); setPaying(false); return; }
    if (paymentIntent?.status === "succeeded") await onSuccess("card");
  }

  if (!ready) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
      <div style={{ width: 18, height: 18, border: `2px solid ${C.dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ring 0.8s linear infinite" }} />
      <span style={{ fontSize: 14, color: C.textSecondary }}>Chargement du paiement…</span>
    </div>
  );

  // ── Stripe not configured — show clear message instead of fake form ─────────
  if (!configured) {
    return (
      <div style={{ textAlign: "center", padding: "32px 16px" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>💳</div>
        <p style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Paiement par carte non disponible</p>
        <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 24, lineHeight: 1.5 }}>
          Le paiement en ligne n'est pas encore configuré pour ce restaurant.<br />
          Veuillez choisir un autre mode de paiement ou régler en espèces.
        </p>
        <button onClick={onCancel} style={{ padding: "12px 28px", background: C.dark, color: C.white, border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", ...FF }}>
          Retour
        </button>
      </div>
    );
  }

  // ── Real Stripe form ────────────────────────────────────────────────────────
  return (
    <div>
      <div ref={containerRef} style={{ marginBottom: 16, minHeight: 80 }} />
      {error && <p style={{ color: C.accent, fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <button onClick={pay} disabled={paying} style={{ width: "100%", padding: 16, background: C.dark, color: C.white, border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: paying ? "not-allowed" : "pointer", marginBottom: 10, ...FF, opacity: paying ? 0.6 : 1 }}>
        {paying ? "Traitement en cours…" : `🔒 Payer ${total.toFixed(2)} €`}
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
  const [orderError, setOrderError] = useState("");
  const [ordering, setOrdering] = useState(false);
  const tableNum = 1;
  const [catOrderClient, setCatOrderClient] = useState([]);
  const [stripeEnabledCV, setStripeEnabledCV] = useState(false);
  const [cvComposeModal, setCvComposeModal] = useState(null);

  function cvAddToCart(item) {
    const groups = (item.supplements || []).filter(g => g.options?.length > 0);
    const extras = (item.extras || []).filter(e => e.name?.trim());
    if (groups.length > 0 || extras.length > 0) {
      setCvComposeModal({ item, step: 0, choices: {} });
    } else {
      setCart(p => { const e = p.find(i => i.id === item.id && !i._composed); return e ? p.map(i => i.id === item.id && !i._composed ? { ...i, qty: i.qty + 1 } : i) : [...p, { ...item, qty: 1, _choices: {} }]; });
    }
  }

  useEffect(() => {
    if (restaurant.id === "demo") { setMenuItems(DEMO_MENU); setLoadingMenu(false); return; }
    Promise.all([
      supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id).eq("available", true).order("category").order("name"),
      supabase.from("restaurant_settings").select("category_order,stripe_publishable_key").eq("restaurant_id", restaurant.id).maybeSingle(),
    ]).then(([menuRes, settRes]) => {
      const seen = new Set();
      setMenuItems((menuRes.data ?? []).filter(i => seen.has(i.id) ? false : seen.add(i.id)));
      if (settRes.data?.category_order?.length) setCatOrderClient(settRes.data.category_order);
      if (settRes.data?.stripe_publishable_key) setStripeEnabledCV(true);
      setLoadingMenu(false);
    });
  }, [restaurant.id]);

  const rawCatsClient = Array.from(new Set(menuItems.map(i => i.category)));
  const sortedCatsClient = catOrderClient.length
    ? [...catOrderClient.filter(c => rawCatsClient.includes(c)), ...rawCatsClient.filter(c => !catOrderClient.includes(c))]
    : rawCatsClient;
  const cats = ["Tous", ...sortedCatsClient];
  const baseFiltered = activeCat === "Tous" ? menuItems : menuItems.filter(i => i.category === activeCat);
  const filtered = activeCat === "Tous"
    ? [...baseFiltered].sort((a, b) => {
        const ai = sortedCatsClient.indexOf(a.category);
        const bi = sortedCatsClient.indexOf(b.category);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
    : baseFiltered;
  const total = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const add = item => setCart(p => { const e = p.find(i => i.id === item.id); return e ? p.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) : [...p, { ...item, qty: 1 }]; });
  const rem = id => setCart(p => { const e = p.find(i => i.id === id); return e.qty === 1 ? p.filter(i => i.id !== id) : p.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i); });

  async function confirmOrder(paymentMethod = "cash") {
    setOrdering(true); setOrderError("");
    try {
      // Find or auto-create table 1
      let { data: tbl } = await supabase.from("tables").select("id").eq("restaurant_id", restaurant.id).eq("number", tableNum).single();
      if (!tbl) {
        const { data: newTbl } = await supabase.from("tables")
          .insert({ restaurant_id: restaurant.id, number: tableNum, qr_url: `${window.location.origin}${BASE_PATH}/r/${restaurant.id}/t/${tableNum}` })
          .select("id").single();
        tbl = newTbl;
      }

      let { data: order, error } = await supabase.from("orders")
        .insert({ restaurant_id: restaurant.id, table_id: tbl?.id, note, total, status: "PENDING", payment_method: paymentMethod })
        .select().single();

      // Fallback si colonnes pas encore migrées
      if (error && (error.message?.includes("column") || error.message?.includes("payment_method"))) {
        ({ data: order, error } = await supabase.from("orders")
          .insert({ restaurant_id: restaurant.id, table_id: tbl?.id, note, total, status: "PENDING" })
          .select().single());
      }

      if (error || !order) { setOrderError("Erreur commande : " + (error?.message || "réessayez")); setOrdering(false); return; }
      await supabase.from("order_items").insert(cart.map(i => {
        const choices = i._choices || {};
        const parts = Object.entries(choices).filter(([, v]) => v.length > 0).map(([k, v]) => k === "__extras__" ? "+" + v.map(o => o.name).join(", ") : v.map(o => o.name).join(", "));
        return { order_id: order.id, menu_item_id: i.id, quantity: i.qty, detail: parts.join(" · ") };
      }));
      setStep("done"); setPayMode(null);
    } catch (e) {
      setOrderError("Erreur inattendue, réessayez.");
    } finally {
      setOrdering(false);
    }
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
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
                        {item.is_menu && <span style={{ background: "#0071E315", color: "#0071E3", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, display: "inline-block" }}>🍽️+🥤 Menu</span>}
                        {item.is_popular && <span style={{ background: C.accent + "15", color: C.accent, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, display: "inline-block" }}>⭐ Populaire</span>}
                      </div>
                    </div>
                    <p style={{ fontWeight: 800, fontSize: 15, color: C.dark, flexShrink: 0 }}>{Number(item.price).toFixed(2)}€</p>
                  </div>
                  {item.description && <p style={{ color: C.textSecondary, fontSize: 12, margin: "4px 0 8px", lineHeight: 1.4 }}>{item.description}</p>}
                  {inCart ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => rem(item.id)} style={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${C.borderStrong}`, background: C.white, fontWeight: 900, cursor: "pointer", fontSize: 16, ...FF }}>−</button>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{inCart.qty}</span>
                      <button onClick={() => cvAddToCart(item)} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: C.dark, color: C.white, fontWeight: 900, cursor: "pointer", fontSize: 16, ...FF }}>+</button>
                    </div>
                  ) : (
                    <button onClick={() => cvAddToCart(item)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${C.borderStrong}`, background: C.white, color: C.dark, fontWeight: 600, fontSize: 12, cursor: "pointer", ...FF }}>Ajouter</button>
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
      {cvComposeModal && (() => {
        const { item, step, choices } = cvComposeModal;
        const groups = (item.supplements || []).filter(g => g.options?.length > 0);
        const itemExtras = (item.extras || []).filter(e => e.name?.trim());
        const hasExtras = itemExtras.length > 0;
        const totalSteps = groups.length + (hasExtras ? 1 : 0);
        const isExtrasStep = hasExtras && step === groups.length;
        const grp = !isExtrasStep ? groups[step] : null;
        if (!grp && !isExtrasStep) return null;
        const selected = grp ? (choices[grp.groupName] || []) : (choices["__extras__"] || []);
        const canNext = isExtrasStep ? true : (!grp.required || selected.length > 0);
        const isLast = step === totalSteps - 1;
        function toggleOpt(opt) {
          if (isExtrasStep) {
            const already = selected.some(s => s.name === opt.name);
            const next = already ? selected.filter(s => s.name !== opt.name) : [...selected, { name: opt.name, price: parseFloat(opt.price) || 0 }];
            setCvComposeModal(p => ({ ...p, choices: { ...p.choices, "__extras__": next } }));
          } else {
            const already = selected.some(s => s.name === opt.name);
            let next;
            if (already) { next = selected.filter(s => s.name !== opt.name); }
            else if (selected.length < (grp.maxChoices || 1)) { next = [...selected, { name: opt.name, price: parseFloat(opt.price) || 0 }]; }
            else if (grp.maxChoices === 1) { next = [{ name: opt.name, price: parseFloat(opt.price) || 0 }]; }
            else { next = selected; }
            setCvComposeModal(p => ({ ...p, choices: { ...p.choices, [grp.groupName]: next } }));
          }
        }
        function nextStep() {
          if (!canNext) return;
          if (isLast) {
            const allChoices = isExtrasStep
              ? { ...choices, "__extras__": selected }
              : { ...choices, [grp.groupName]: selected };
            const extraPrice = Object.entries(allChoices)
              .filter(([k]) => k !== "__extras__")
              .flatMap(([, v]) => v)
              .reduce((s, o) => s + (o.price || 0), 0)
              + (allChoices["__extras__"] || []).reduce((s, o) => s + (o.price || 0), 0);
            const cartItem = { ...item, _composed: true, _choices: allChoices, price: item.price + extraPrice, qty: 1 };
            setCart(p => [...p, cartItem]);
            setCvComposeModal(null);
          } else {
            if (!isExtrasStep) {
              setCvComposeModal(p => ({ ...p, step: p.step + 1, choices: { ...p.choices, [grp.groupName]: selected } }));
            } else {
              setCvComposeModal(p => ({ ...p, step: p.step + 1 }));
            }
          }
        }
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ background: C.white, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 520, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "20px 20px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, letterSpacing: "0.08em", marginBottom: 4 }}>ÉTAPE {step + 1}/{totalSteps} · {item.emoji} {item.name}</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: C.dark }}>{isExtrasStep ? "Suppléments" : grp.groupName}</p>
                    <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>{isExtrasStep ? "Optionnel · Ajoutez des suppléments" : (grp.required ? "Obligatoire" : "Optionnel") + " · " + (grp.maxChoices === 1 ? "1 choix" : `Max ${grp.maxChoices}`)}</p>
                  </div>
                  <button onClick={() => setCvComposeModal(null)} style={{ background: C.bg, border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: 18, cursor: "pointer", color: C.textSecondary }}>×</button>
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  {Array.from({ length: totalSteps }).map((_, i) => <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= step ? C.dark : C.border }} />)}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
                {(isExtrasStep ? itemExtras : grp.options).map((opt, oi) => {
                  const isSelected = selected.some(s => s.name === opt.name);
                  return (
                    <div key={oi} onClick={() => toggleOpt(opt)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 14, marginBottom: 8, background: isSelected ? C.dark : C.bg, border: `1.5px solid ${isSelected ? C.dark : C.border}`, cursor: "pointer", transition: "all 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSelected ? C.white : C.border}`, background: isSelected ? C.white : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {isSelected && <div style={{ width: 10, height: 10, borderRadius: 3, background: C.dark }} />}
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 600, color: isSelected ? C.white : C.dark }}>{opt.name}</span>
                      </div>
                      {parseFloat(opt.price) > 0 && <span style={{ fontSize: 14, fontWeight: 700, color: isSelected ? C.white : C.textSecondary }}>+{Number(opt.price).toFixed(2)}€</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "16px 20px 32px" }}>
                {step > 0 && <button onClick={() => setCvComposeModal(p => ({ ...p, step: p.step - 1 }))} style={{ background: "none", border: "none", color: C.textSecondary, fontSize: 14, cursor: "pointer", marginBottom: 8, padding: 0, ...FF }}>← Étape précédente</button>}
                <button onClick={nextStep} disabled={!canNext} style={{ width: "100%", padding: 16, background: canNext ? C.dark : C.border, color: C.white, border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: canNext ? "pointer" : "not-allowed", transition: "background 0.2s", ...FF }}>
                  {isLast ? "🛒 Ajouter au panier" : "Suivant →"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
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
        <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0 4px" }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: C.dark }}>Total</span>
          <span style={{ fontWeight: 900, fontSize: 22, color: C.dark }}>{total.toFixed(2)}€</span>
        </div>
        <button onClick={() => setStep("payment")} style={{ width: "100%", padding: 15, background: C.dark, color: C.white, border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 16, ...FF }}>Paiement →</button>
      </div>
    </Frame>
  );

  if (step === "payment") return (
    <Frame>
      <div style={{ padding: "48px 20px 0" }}>
        <button onClick={() => payMode ? setPayMode(null) : setStep("cart")} style={{ background: "none", border: "none", color: C.accent, fontWeight: 600, fontSize: 14, cursor: "pointer", padding: 0, marginBottom: 16, ...FF }}>← Retour</button>
        <p style={{ fontSize: 26, fontWeight: 800, color: C.dark, letterSpacing: "-0.04em", marginBottom: 4 }}>Paiement</p>
        <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: restaurant.id === "demo" ? 10 : 20 }}>Table {tableNum} · {restaurant.name}</p>
        {restaurant.id === "demo" && (
          <div style={{ background: "#FFF9E6", border: "1.5px solid #F5C542", borderRadius: 12, padding: "9px 12px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🎭</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#92700A", margin: 0 }}>Mode démo — paiement fictif</p>
              <p style={{ fontSize: 11, color: "#B8860B", margin: 0 }}>Aucun prélèvement ne sera effectué.</p>
            </div>
          </div>
        )}
        {ordering && <div style={{ textAlign: "center", padding: "20px 0" }}><div style={{ width: 28, height: 28, border: `3px solid ${C.dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ring 0.8s linear infinite", margin: "0 auto 10px" }} /><p style={{ fontSize: 13, color: C.textSecondary }}>Enregistrement…</p></div>}
        {orderError && <div style={{ background: "#FFF0F3", border: `1.5px solid ${C.accent}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.accent }}>{orderError}</div>}
        {!ordering && !payMode && (
          <div style={{ background: C.bg, borderRadius: 14, padding: 16, marginBottom: 20 }}>
            {cart.map((i, ci) => (
              <div key={ci} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: C.dark }}>
                  <span style={{ fontWeight: 600 }}>{i.emoji} {i.name} ×{i.qty}</span>
                  <span style={{ fontWeight: 700 }}>{(Number(i.price) * i.qty).toFixed(2)}€</span>
                </div>
                {i._choices && Object.entries(i._choices).map(([grp, opts]) => opts.length > 0 && (
                  <p key={grp} style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
                    <span style={{ fontWeight: 600 }}>{grp} :</span> {opts.map(o => o.name).join(", ")}
                  </p>
                ))}
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1.5px solid ${C.border}`, paddingTop: 10, marginTop: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span><span style={{ fontWeight: 900, fontSize: 20 }}>{total.toFixed(2)}€</span>
            </div>
          </div>
        )}
        {!payMode ? (
          <>
            {stripeEnabledCV && [{ icon: "💳", l: "Carte bancaire", s: "Visa, Mastercard, Amex" }, { icon: "📱", l: "Apple Pay / Google Pay", s: "Paiement instantané" }].map(m => (
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
        ) : !ordering && (
          <CardPaymentForm total={total} onSuccess={confirmOrder} onCancel={() => setPayMode(null)} restaurant={restaurant} />
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
// CAMPAIGN PROPOSAL CARD — rendered inside AgentChat when AI suggests a campaign
// ─────────────────────────────────────────────────────────────────────────────
function CampaignProposalCard({ proposal, restaurant, store }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const customers = store.customers ?? [];
  const now = new Date();
  const recipients = customers.filter(c => {
    if (!c.email) return false;
    const days = c.last_visit ? Math.floor((now - new Date(c.last_visit)) / 86400000) : 999;
    const avgTicket = c.order_count > 0 ? c.total_spent / c.order_count : 0;
    if (proposal.segment === "inactive") return days >= 30;
    if (proposal.segment === "top") return c.order_count >= 5 || avgTicket >= 25;
    return true;
  }).map(c => c.email);

  async function handleSend() {
    setSending(true);
    setError("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("send-campaign", {
        body: { restaurant_id: restaurant.id, restaurant_name: restaurant.name, subject: proposal.subject, html_body: proposal.body, recipients },
      });
      if (fnErr) { setError(fnErr.message); }
      else if (data?.error) { setError(data.error); }
      else { setSent(true); }
    } catch (e) { setError(e.message); }
    finally { setSending(false); }
  }

  if (sent) return (
    <div style={{ background: C.accentGreen + "15", border: `1px solid ${C.accentGreen}30`, borderRadius: 12, padding: "10px 14px", fontSize: 12, color: C.accentGreen, fontWeight: 700 }}>
      ✅ Campagne envoyée à {recipients.length} client{recipients.length !== 1 ? "s" : ""}
    </div>
  );

  return (
    <div style={{ background: C.accentBlue + "10", border: `1.5px solid ${C.accentBlue}30`, borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.accentBlue, textTransform: "uppercase", letterSpacing: "0.05em" }}>📨 Campagne proposée</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{proposal.subject}</p>
      <p style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>{proposal.segment === "inactive" ? "Clients inactifs 30j+" : proposal.segment === "top" ? "Meilleurs clients" : "Tous les clients"} · {recipients.length} destinataire{recipients.length !== 1 ? "s" : ""}</p>
      {error && <p style={{ fontSize: 12, color: C.accent }}>{error}</p>}
      <button onClick={handleSend} disabled={sending || recipients.length === 0} style={{ padding: "9px 16px", background: C.dark, color: C.white, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: (sending || recipients.length === 0) ? 0.5 : 1, ...FF }}>
        {sending ? "Envoi…" : "Envoyer cette campagne"}
      </button>
    </div>
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
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [messages, setMessages] = useState([
    { role: "assistant", content: `Bonjour ! Je suis Gémo, votre assistant IA 👋\n\nJe connais toutes les fonctionnalités de Wegemo et je peux vous conseiller sur votre carte, vos stocks, votre caisse et bien plus.\n\nComment puis-je vous aider ?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lowStockItems, setLowStockItems] = useState([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Draggable position for the chat button
  const [pos, setPos] = useState(null); // null = default position
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  function onPointerDown(e) {
    dragging.current = false;
    const cur = pos || { x: window.innerWidth - (isMobile ? 64 : 80), y: window.innerHeight - (isMobile ? 144 : 88) };
    dragStart.current = { x: e.clientX, y: e.clientY, px: cur.x, py: cur.y };
    const move = ev => {
      const dx = ev.clientX - dragStart.current.x;
      const dy = ev.clientY - dragStart.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) dragging.current = true;
      const nx = Math.max(8, Math.min(window.innerWidth - 64, dragStart.current.px + dx));
      const ny = Math.max(8, Math.min(window.innerHeight - 80, dragStart.current.py + dy));
      setPos({ x: nx, y: ny });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Fetch low-stock items
  useEffect(() => {
    if (!restaurant?.id || restaurant.id === "demo") {
      // Demo: simulate low stock on Frites Maison
      setLowStockItems([{ id: "dm12", name: "Frites Maison", emoji: "🍟", stock: 3 }]);
      return;
    }
    supabase.from("menu_items").select("id, name, emoji, stock")
      .eq("restaurant_id", restaurant.id).eq("available", true)
      .not("stock", "is", null).lte("stock", 5).gt("stock", 0)
      .then(({ data }) => setLowStockItems(data ?? []));
  }, [restaurant?.id]);

  // Refresh low stock every 2 minutes
  useEffect(() => {
    if (!restaurant?.id || restaurant.id === "demo") return;
    const t = setInterval(() => {
      supabase.from("menu_items").select("id, name, emoji, stock")
        .eq("restaurant_id", restaurant.id).eq("available", true)
        .not("stock", "is", null).lte("stock", 5).gt("stock", 0)
        .then(({ data }) => setLowStockItems(data ?? []));
    }, 120000);
    return () => clearInterval(t);
  }, [restaurant?.id]);

  const urgentOrders = (store.orders || []).filter(o => o.elapsed >= 20 && o.status !== "served");
  const newOrders = (store.orders || []).filter(o => o.status === "new");

  const alerts = [
    ...urgentOrders.map(o => ({ id: `urg-${o.id}`, type: "urgent", icon: "🔴", text: `Table ${o.table} — commande en attente depuis ${o.elapsed} min` })),
    ...newOrders.map(o => ({ id: `new-${o.id}`, type: "new", icon: "🟡", text: `Nouvelle commande — Table ${o.table} · ${o.total.toFixed(2)}€` })),
    ...lowStockItems.map(i => ({ id: `stk-${i.id}`, type: "stock", icon: "🟠", text: `Stock bas — ${i.emoji} ${i.name} (${i.stock} restants)` })),
  ];

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

  const btnX = pos ? pos.x : null;
  const btnY = pos ? pos.y : null;
  const btnStyle = pos
    ? { left: btnX, top: btnY, right: "auto", bottom: "auto" }
    : { bottom: isMobile ? 80 : 24, right: 16 };

  // Panel position: above/beside the button
  const panelStyle = pos
    ? { left: Math.min(btnX, window.innerWidth - (isMobile ? window.innerWidth - 16 : 376)), top: Math.max(8, btnY - (isMobile ? 440 : 540)), bottom: "auto", right: "auto" }
    : { bottom: isMobile ? 140 : 88, right: isMobile ? 8 : 24, left: isMobile ? 8 : "auto" };

  return (
    <>
      {/* Toggle button — draggable */}
      <button
        onPointerDown={onPointerDown}
        onClick={() => { if (!dragging.current) setOpen(p => !p); }}
        className="btn-press"
        title={open ? "Fermer l'assistant" : "Ouvrir l'assistant IA (glissez pour déplacer)"}
        style={{ position: "fixed", ...btnStyle, zIndex: 1010, width: 48, height: 48, borderRadius: "50%", background: open ? C.textSecondary : C.dark, border: "none", cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", fontSize: 20, transition: "background 0.2s ease", touchAction: "none", ...FF }}
      >
        <span style={{ transition: "transform 0.2s ease", display: "block", transform: open ? "rotate(45deg)" : "none" }}>
          {open ? "✕" : "✨"}
        </span>
        {!open && alerts.length > 0 && (
          <span style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, background: alerts.some(a => a.type === "urgent") ? C.accent : C.accentOrange, borderRadius: "50%", border: "2px solid #fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            {alerts.length}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{ position: "fixed", ...panelStyle, zIndex: 1009, width: isMobile ? (pos ? Math.min(360, window.innerWidth - 16) : "auto") : 360, height: isMobile ? 420 : 520, background: C.surface, borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", animation: "slideUp 0.25s ease", overflow: "hidden", ...FF }}>

          {/* Header */}
          <div style={{ padding: "14px 18px", background: C.dark, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✨</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.white, letterSpacing: "-0.01em" }}>Gémo — Assistant IA</p>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <Dot color={C.accentGreen} pulse />
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Prêt à vous aider</p>
              </div>
            </div>
            <button onClick={() => { if (confirm("Effacer la conversation ?")) setMessages([{ role: "assistant", content: "Conversation réinitialisée. Comment puis-je vous aider ?" }]); }} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, padding: "5px 10px", color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer", ...FF }}>
              Effacer
            </button>
          </div>

          {/* Alerts panel */}
          {alerts.length > 0 && (
            <div style={{ borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <button onClick={() => setAlertsOpen(p => !p)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: alerts.some(a => a.type === "urgent") ? "#FFF0F3" : "#FFF8EC", border: "none", cursor: "pointer", ...FF }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: alerts.some(a => a.type === "urgent") ? C.accent : C.accentOrange }}>
                  ⚠️ {alerts.length} alerte{alerts.length > 1 ? "s" : ""} en cours
                </span>
                <span style={{ fontSize: 11, color: C.textTertiary }}>{alertsOpen ? "▲" : "▼"}</span>
              </button>
              {alertsOpen && (
                <div style={{ maxHeight: 140, overflowY: "auto", padding: "4px 0" }}>
                  {alerts.map(a => (
                    <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 14px", borderTop: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{a.icon}</span>
                      <p style={{ fontSize: 12, color: C.dark, lineHeight: 1.4, flex: 1 }}>{a.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 4px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => {
              // Detect email_campaign JSON proposal in assistant messages
              let campaignProposal = null;
              if (m.role === "assistant") {
                const match = m.content.match(/```(?:json)?\s*(\{[\s\S]*?"action"\s*:\s*"email_campaign"[\s\S]*?\})\s*```/);
                if (match) {
                  try { campaignProposal = JSON.parse(match[1]); } catch {}
                }
              }
              return (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 7 }}>
                  {m.role === "assistant" && (
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: C.dark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginBottom: 2 }}>✨</div>
                  )}
                  <div style={{ maxWidth: "82%", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ padding: "10px 14px", borderRadius: m.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px", background: m.role === "user" ? C.dark : C.bg, color: m.role === "user" ? C.white : C.dark, fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {m.content}
                    </div>
                    {campaignProposal && (
                      <CampaignProposalCard proposal={campaignProposal} restaurant={restaurant} store={store} />
                    )}
                  </div>
                </div>
              );
            })}

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
// CUSTOMER CHAT — mobile bottom-sheet allergen assistant
// ─────────────────────────────────────────────────────────────────────────────
const CHAT_SUGGESTIONS = ["Plats sans gluten ?", "Végétarien / vegan ?", "Allergènes courants ?", "Ingrédients du burger ?"];

function CustomerChat({ open, onOpen, onClose, msgs, onSend, input, onInput, loading }) {
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  return (
    <>
      {/* Floating icon button — fixed under the header, out of the way of any bottom price/cart/payment bar */}
      {!open && (
        <button
          onClick={onOpen}
          className="btn-press"
          aria-label="Aide & allergènes"
          style={{
            position: "fixed", top: "50%", right: 12, transform: "translateY(-50%)",
            zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
            width: 44, height: 44,
            background: C.dark, border: "none", borderRadius: "50%",
            boxShadow: "0 4px 20px rgba(0,0,0,0.28)",
            cursor: "pointer", ...FF,
          }}
        >
          <span style={{ fontSize: 19 }}>💬</span>
          {msgs.length === 1 && (
            <span style={{ position: "absolute", top: 2, right: 2, width: 9, height: 9, borderRadius: "50%", background: C.accentGreen, boxShadow: "0 0 0 2px " + C.dark }} />
          )}
        </button>
      )}

      {/* Overlay */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, animation: "fadeIn 0.2s ease" }}
        />
      )}

      {/* Bottom sheet */}
      {open && (
        <div
          style={{
            position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 201,
            background: C.white,
            borderRadius: "24px 24px 0 0",
            boxShadow: "0 -8px 48px rgba(0,0,0,0.22)",
            display: "flex", flexDirection: "column",
            height: "85dvh",
            animation: "sheetUp 0.3s cubic-bezier(0.32,0.72,0,1)",
            ...FF,
          }}
        >
          {/* Handle + header */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: C.dark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🤖</div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: C.dark, letterSpacing: "-0.02em" }}>Assistant Gémo</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accentGreen, display: "inline-block" }} />
                    <p style={{ fontSize: 11, color: C.textSecondary }}>Allergènes · Ingrédients · Conseils</p>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ width: 36, height: 36, borderRadius: "50%", background: C.bg, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: C.textSecondary, ...FF }}
              >✕</button>
            </div>
            <div style={{ height: 1, background: C.border }} />
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12, WebkitOverflowScrolling: "touch" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }}>
                {m.role === "assistant" && (
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: C.dark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginBottom: 2 }}>🤖</div>
                )}
                <div style={{
                  maxWidth: "78%",
                  padding: "12px 16px",
                  borderRadius: m.role === "user" ? "20px 6px 20px 20px" : "6px 20px 20px 20px",
                  background: m.role === "user" ? C.dark : C.bg,
                  color: m.role === "user" ? C.white : C.dark,
                  fontSize: 15, lineHeight: 1.55,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: C.dark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>
                <div style={{ background: C.bg, borderRadius: "6px 20px 20px 20px", padding: "14px 18px", display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: C.textTertiary, animation: `typingDot 1.4s ease-in-out ${j * 0.16}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Quick suggestions */}
            {msgs.length === 1 && !loading && (
              <div style={{ marginTop: 4 }}>
                <p style={{ fontSize: 12, color: C.textTertiary, marginBottom: 8, fontWeight: 500 }}>Suggestions</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {CHAT_SUGGESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => onSend(q)}
                      style={{ padding: "9px 14px", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 20, fontSize: 13, color: C.dark, cursor: "pointer", fontWeight: 500, ...FF }}
                    >{q}</button>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div style={{
            flexShrink: 0,
            padding: "12px 16px",
            paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
            borderTop: `1px solid ${C.border}`,
            display: "flex", gap: 10, alignItems: "flex-end",
            background: C.white,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={onInput}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              placeholder="Posez votre question…"
              disabled={loading}
              style={{
                flex: 1, background: C.bg,
                border: `1.5px solid ${input ? C.dark : "transparent"}`,
                borderRadius: 16, padding: "13px 16px",
                fontSize: 16, color: C.dark, outline: "none",
                transition: "border-color 0.15s",
                lineHeight: 1.4,
                ...FF,
              }}
            />
            <button
              onClick={onSend}
              disabled={!input.trim() || loading}
              style={{
                width: 46, height: 46, borderRadius: 14, border: "none",
                background: input.trim() && !loading ? C.dark : C.bg,
                cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.15s",
              }}
            >
              <span style={{ color: input.trim() && !loading ? C.white : C.textTertiary, fontSize: 20 }}>↑</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CRM TAB
// ─────────────────────────────────────────────────────────────────────────────
function GmailConnectSection({ restaurant }) {
  return (
    <Surface style={{ padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: "#10B98115", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
        📨
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Envoi d'emails</p>
        <p style={{ fontSize: 12, color: C.accentGreen, marginTop: 2 }}>✅ Propulsé par Resend — prêt à envoyer</p>
      </div>
    </Surface>
  );
}

function CampaignSender({ restaurant, customers }) {
  const isDemo = restaurant.id === "demo";
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const now = new Date();
  const filteredRecipients = customers.filter(c => {
    if (!c.email) return false;
    const days = c.last_visit ? Math.floor((now - new Date(c.last_visit)) / 86400000) : 999;
    const avgTicket = c.order_count > 0 ? c.total_spent / c.order_count : 0;
    if (recipientFilter === "all") return true;
    if (recipientFilter === "inactive") return days >= 30;
    if (recipientFilter === "top") return c.order_count >= 5 || avgTicket >= 25;
    return true;
  }).map(c => c.email);

  async function sendCampaign() {
    setConfirmOpen(false);
    setSending(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-campaign", {
        body: { restaurant_id: restaurant.id, restaurant_name: restaurant.name, subject, html_body: htmlBody, recipients: filteredRecipients },
      });
      if (error) { setResult({ error: error.message }); }
      else { setResult(data); }
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setSending(false);
    }
  }

  const FILTERS = [
    { id: "all", label: "Tous les clients" },
    { id: "inactive", label: "Clients inactifs 30j+" },
    { id: "top", label: "Meilleurs clients" },
  ];

  return (
    <Surface style={{ padding: "16px 18px", marginBottom: 16 }}>
      <button onClick={() => setOpen(p => !p)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: 0, ...FF }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>📨</span>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Envoyer une campagne email</p>
        </div>
        <span style={{ fontSize: 13, color: C.textTertiary }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Recipient filter */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Destinataires</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FILTERS.map(f => (
                <button key={f.id} onClick={() => setRecipientFilter(f.id)} style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${recipientFilter === f.id ? C.accentBlue : C.border}`, background: recipientFilter === f.id ? C.accentBlue + "12" : C.white, color: recipientFilter === f.id ? C.accentBlue : C.textSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer", ...FF }}>
                  {f.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: C.textTertiary, marginTop: 6 }}>
              {filteredRecipients.length} destinataire{filteredRecipients.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Subject */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Objet</p>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex : Offre spéciale ce week-end 🎉" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", ...FF }} />
          </div>

          {/* Body */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Corps du message (HTML accepté)</p>
            <textarea value={htmlBody} onChange={e => setHtmlBody(e.target.value)} placeholder="<p>Bonjour,</p><p>Nous avons une offre spéciale pour vous…</p>" rows={5} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", resize: "vertical", ...FF }} />
          </div>

          {/* Result */}
          {result && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: result.error || result.failed > 0 ? C.accent + "12" : C.accentGreen + "12", color: result.error || result.failed > 0 ? C.accent : C.accentGreen, fontSize: 13, fontWeight: 600 }}>
              {result.error
                ? `❌ Erreur : ${result.error}`
                : result.failed > 0 && result.sent === 0
                  ? `❌ Échec de l'envoi`
                  : `✅ ${result.sent} envoyé${result.sent !== 1 ? "s" : ""}${result.failed > 0 ? `, ${result.failed} échoué(s)` : ""}`}
              {(result.errors || []).length > 0 && (
                <div style={{ marginTop: 6, fontWeight: 500, fontSize: 12, lineHeight: 1.5 }}>
                  {result.errors.slice(0, 3).map((e, i) => <p key={i} style={{ margin: 0 }}>{e}</p>)}
                </div>
              )}
            </div>
          )}

          {/* Send button */}
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={sending || !subject.trim() || !htmlBody.trim() || filteredRecipients.length === 0 || isDemo}
            style={{ padding: "12px 20px", background: C.dark, color: C.white, border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: (sending || !subject.trim() || !htmlBody.trim() || filteredRecipients.length === 0 || isDemo) ? 0.45 : 1, ...FF }}
          >
            {sending ? "Envoi en cours…" : `Envoyer à ${filteredRecipients.length} client${filteredRecipients.length !== 1 ? "s" : ""}`}
          </button>
          {isDemo && <p style={{ fontSize: 11, color: C.textTertiary, textAlign: "center" }}>Désactivé en mode démo</p>}
        </div>
      )}

      {/* Confirm modal */}
      {confirmOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setConfirmOpen(false)}>
          <div style={{ background: C.white, borderRadius: 20, padding: "28px 24px", maxWidth: 380, width: "100%", ...FF }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 20, marginBottom: 8 }}>📨</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Confirmer l'envoi</p>
            <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 4 }}>Objet : <strong>{subject}</strong></p>
            <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>
              {filteredRecipients.length} destinataire{filteredRecipients.length !== 1 ? "s" : ""} · filtre : {FILTERS.find(f => f.id === recipientFilter)?.label}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmOpen(false)} style={{ flex: 1, padding: "11px 0", background: C.bg, border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", color: C.dark, ...FF }}>Annuler</button>
              <button onClick={sendCampaign} style={{ flex: 1, padding: "11px 0", background: C.dark, border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", color: C.white, ...FF }}>Envoyer</button>
            </div>
          </div>
        </div>
      )}
    </Surface>
  );
}

function CRMTab({ restaurant, store }) {
  const isDemo = restaurant.id === "demo";
  const isMobile = useIsMobile();
  // Use shared store — updates live when new QR orders come in
  const customers = store.customers ?? [];
  const [segment, setSegment] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const now = new Date();
  function daysSince(dateStr) {
    if (!dateStr) return 999;
    return Math.floor((now - new Date(dateStr)) / 86400000);
  }

  // Compute segments
  const withSegment = customers.map(c => {
    const days = daysSince(c.last_visit);
    const avgTicket = c.order_count > 0 ? c.total_spent / c.order_count : 0;
    let seg = "active";
    if (days >= 90) seg = "lost";
    else if (days >= 60) seg = "atrisk";
    else if (days >= 30) seg = "inactive";
    const loyal = c.order_count >= 5;
    const highValue = avgTicket >= 25;
    return { ...c, days, avgTicket, seg, loyal, highValue };
  });

  const SEGMENTS = [
    { id: "all", label: "Tous", color: C.dark },
    { id: "active", label: "Actifs", color: C.accentGreen },
    { id: "loyal", label: "Fidèles", color: C.accentBlue },
    { id: "highvalue", label: "Haute valeur", color: C.accentPurple },
    { id: "inactive", label: "Inactifs 30j", color: C.accentOrange },
    { id: "atrisk", label: "À risque 60j", color: C.accent },
    { id: "lost", label: "Perdus 90j+", color: "#888" },
    { id: "relanced", label: "✅ Relancés", color: C.accentGreen },
  ];

  const filtered = withSegment
    .filter(c => {
      if (segment === "loyal") return c.loyal;
      if (segment === "highvalue") return c.highValue;
      if (segment === "all") return true;
      if (segment === "relanced") return !!c._relanced;
      return c.seg === segment;
    })
    .filter(c => !search || c.first_name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));

  const avgTicket = customers.length ? (customers.reduce((s, c) => s + (c.order_count > 0 ? c.total_spent / c.order_count : 0), 0) / customers.length) : 0;
  const activeCount = withSegment.filter(c => c.seg === "active").length;
  const inactiveCount = withSegment.filter(c => c.seg !== "active" && c.seg !== "lost").length;

  const segColor = SEGMENTS.find(s => s.id === segment)?.color ?? C.dark;

  return (
    <div>
      {/* Gmail + Campaign */}
      <GmailConnectSection restaurant={restaurant} />
      <CampaignSender restaurant={restaurant} customers={withSegment} />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 8 : 14, marginBottom: isMobile ? 14 : 24 }}>
        {[
          { label: "Clients", value: customers.length, color: C.dark },
          { label: "Actifs 30j", value: activeCount, color: C.accentGreen },
          { label: "À relancer", value: inactiveCount, color: C.accentOrange },
          { label: "Panier moy.", value: `${avgTicket.toFixed(2)}€`, color: C.accentPurple },
        ].map(k => (
          <Surface key={k.label} style={{ padding: isMobile ? "10px 12px" : "16px 18px" }}>
            <p style={{ fontSize: isMobile ? 10 : 12, color: C.textSecondary, marginBottom: 4, fontWeight: 500 }}>{k.label}</p>
            <p style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: k.color, letterSpacing: "-0.03em" }}>{k.value}</p>
          </Surface>
        ))}
      </div>

      {/* Segment tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {SEGMENTS.map(s => {
          const cnt = s.id === "all" ? customers.length
            : s.id === "loyal" ? withSegment.filter(c => c.loyal).length
            : s.id === "highvalue" ? withSegment.filter(c => c.highValue).length
            : withSegment.filter(c => c.seg === s.id).length;
          return (
            <button key={s.id} onClick={() => setSegment(s.id)} style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${segment === s.id ? s.color : C.border}`, background: segment === s.id ? s.color + "15" : C.white, color: segment === s.id ? s.color : C.textSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer", ...FF }}>
              {s.label} <span style={{ opacity: 0.7 }}>({cnt})</span>
            </button>
          );
        })}
      </div>

      {/* Relances récentes */}
      {store.promotions && store.promotions.filter(p => p.type === "event" && p.send_count > 0).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.textTertiary, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Relances récentes</p>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
            {store.promotions.filter(p => p.type === "event" && p.send_count > 0).slice(0, 5).map(p => (
              <div key={p.id} style={{ flexShrink: 0, background: p.color + "12", border: `1px solid ${p.color}25`, borderRadius: 12, padding: "10px 14px", minWidth: 160 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{p.emoji}</span>
                  <p style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{p.name}</p>
                </div>
                <p style={{ fontSize: 11, color: C.textSecondary }}>{p.send_count} clients contactés</p>
                <p style={{ fontSize: 10, color: C.textTertiary, marginTop: 2 }}>{new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher un client..." style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, marginBottom: 16, outline: "none", ...FF }} />

      {/* Customer list */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: isMobile ? 8 : 12 }}>
        {filtered.map(c => {
          const statusColor = c.seg === "active" ? C.accentGreen : c.seg === "atrisk" ? C.accent : c.seg === "lost" ? "#aaa" : C.accentOrange;
          const statusLabel = c.seg === "active" ? "Actif" : c.seg === "atrisk" ? "À risque" : c.seg === "lost" ? "Perdu" : "Inactif";
          return (
            <Surface key={c.id} style={{ padding: "16px 18px", cursor: "pointer" }} onClick={() => setSelected(c)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: segColor + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: segColor, flexShrink: 0 }}>
                  {(c.first_name || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{c.first_name}</p>
                    {c._relanced && <span style={{ fontSize: 10, background: C.accentGreen + "20", color: C.accentGreen, padding: "1px 6px", borderRadius: 6, fontWeight: 700 }}>✅ RELANCÉ</span>}
                    {c.loyal && <span style={{ fontSize: 10, background: C.accentBlue + "15", color: C.accentBlue, padding: "1px 6px", borderRadius: 6, fontWeight: 700 }}>FIDÈLE</span>}
                    {c.highValue && <span style={{ fontSize: 10, background: C.accentPurple + "15", color: C.accentPurple, padding: "1px 6px", borderRadius: 6, fontWeight: 700 }}>VIP</span>}
                  </div>
                  <p style={{ fontSize: 12, color: C.textTertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: statusColor + "15", padding: "3px 8px", borderRadius: 8, flexShrink: 0 }}>{statusLabel}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Commandes", value: c.order_count },
                  { label: "Total", value: `${(c.total_spent || 0).toFixed(2)}€` },
                  { label: "Dernier", value: c.days < 1 ? "Aujourd'hui" : `J-${c.days}` },
                ].map(stat => (
                  <div key={stat.label} style={{ background: C.bg, borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{stat.value}</p>
                    <p style={{ fontSize: 10, color: C.textTertiary, marginTop: 1 }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </Surface>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>👥</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 6 }}>Aucun client dans ce segment</p>
          <p style={{ fontSize: 14, color: C.textSecondary }}>Les clients apparaîtront automatiquement après leurs premières commandes.</p>
        </div>
      )}

      {/* Customer detail modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setSelected(null)}>
          <div style={{ background: C.white, borderRadius: 20, width: "100%", maxWidth: 440, overflow: "hidden", ...FF }} onClick={e => e.stopPropagation()}>
            <div style={{ background: C.dark, padding: "20px 22px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff" }}>
                {(selected.first_name || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{selected.first_name}</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: "20px 22px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Commandes", value: selected.order_count },
                  { label: "Total dépensé", value: `${(selected.total_spent || 0).toFixed(2)}€` },
                  { label: "Panier moyen", value: `${selected.avgTicket?.toFixed(2) ?? "0.00"}€` },
                  { label: "Dernière visite", value: `J-${selected.days}` },
                  { label: "1ère visite", value: selected.first_visit ? new Date(selected.first_visit).toLocaleDateString("fr-FR") : "—" },
                  { label: "Téléphone", value: selected.phone || "—" },
                ].map(r => (
                  <div key={r.label} style={{ background: C.bg, borderRadius: 10, padding: "10px 12px" }}>
                    <p style={{ fontSize: 11, color: C.textTertiary, marginBottom: 3 }}>{r.label}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{r.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {selected.loyal && <span style={{ fontSize: 12, background: C.accentBlue + "15", color: C.accentBlue, padding: "4px 10px", borderRadius: 8, fontWeight: 700 }}>⭐ Client fidèle</span>}
                {selected.highValue && <span style={{ fontSize: 12, background: C.accentPurple + "15", color: C.accentPurple, padding: "4px 10px", borderRadius: 8, fontWeight: 700 }}>💎 Haute valeur</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GMAIL OAUTH CALLBACK — handles redirect after Google OAuth consent
// ─────────────────────────────────────────────────────────────────────────────
function GmailOAuthCallback() {
  const [status, setStatus] = useState("processing");
  const [emailConnected, setEmailConnected] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) { setStatus("error"); return; }
    const redirectUri = `${window.location.origin}${BASE_PATH}/oauth/gmail`;
    supabase.functions.invoke("gmail-oauth", { body: { code, restaurant_id: state, redirect_uri: redirectUri } })
      .then(({ data, error }) => {
        if (error || data?.error) { setStatus("error"); return; }
        setEmailConnected(data.email);
        setStatus("success");
        setTimeout(() => { window.location.href = `${window.location.origin}${BASE_PATH}/`; }, 2500);
      });
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", padding: 32, textAlign: "center", fontFamily: "'Figtree', -apple-system, sans-serif", background: "#F5F5F7" }}>
      {status === "processing" && (
        <>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F" }}>Connexion Gmail en cours…</p>
        </>
      )}
      {status === "success" && (
        <>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#34C759" }}>Gmail connecté !</p>
          <p style={{ color: "#666", marginTop: 8 }}>{emailConnected}</p>
          <p style={{ color: "#999", fontSize: 13, marginTop: 12 }}>Redirection…</p>
        </>
      )}
      {status === "error" && (
        <>
          <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#FF375F" }}>Erreur de connexion</p>
          <button onClick={() => window.history.back()} style={{ marginTop: 16, padding: "10px 24px", background: "#1D1D1F", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer", fontFamily: "'Figtree', -apple-system, sans-serif" }}>Retour</button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMO CODES TAB (inside dashboard PromoTab)
// ─────────────────────────────────────────────────────────────────────────────
function PromoCodesTab({ restaurant }) {
  const isDemo = restaurant.id === "demo";
  const store = useContext(StoreCtx);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "new" | "edit"
  const [editing, setEditing] = useState(null);
  const EMPTY = { code: "", label: "", discount_percent: 10, max_uses: "", expires_at: "", active: true };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const fv = k => e => setForm(p => ({ ...p, [k]: e.target?.value ?? e }));

  useEffect(() => {
    if (isDemo) { setCodes([]); setLoading(false); return; }
    supabase.from("promo_codes").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false })
      .then(({ data }) => { setCodes(data ?? []); setLoading(false); });
  }, [restaurant.id]);

  async function save() {
    if (!form.code.trim() || !form.discount_percent) return;
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      label: form.label.trim(),
      discount_percent: parseInt(form.discount_percent) || 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
      active: form.active,
    };
    if (isDemo) {
      if (modal === "new") setCodes(p => [{ ...payload, id: "demo_" + Date.now(), restaurant_id: "demo", use_count: 0, created_at: new Date().toISOString() }, ...p]);
      else setCodes(p => p.map(x => x.id === editing.id ? { ...x, ...payload } : x));
      setSaving(false); setModal(null); return;
    }
    if (modal === "new") {
      const { data, error } = await supabase.from("promo_codes").insert({ ...payload, restaurant_id: restaurant.id }).select().single();
      if (error) { store.pushNotif("Erreur : " + error.message, "warning"); setSaving(false); return; }
      if (data) setCodes(p => [data, ...p]);
    } else {
      const { error } = await supabase.from("promo_codes").update(payload).eq("id", editing.id);
      if (error) { store.pushNotif("Erreur : " + error.message, "warning"); setSaving(false); return; }
      setCodes(p => p.map(x => x.id === editing.id ? { ...x, ...payload } : x));
    }
    setSaving(false); setModal(null);
    store.pushNotif("✅ Code promo enregistré", "success");
  }

  async function toggleActive(c) {
    const next = !c.active;
    setCodes(p => p.map(x => x.id === c.id ? { ...x, active: next } : x));
    if (!isDemo) await supabase.from("promo_codes").update({ active: next }).eq("id", c.id);
  }

  async function del(c) {
    if (!confirm(`Supprimer le code "${c.code}" ?`)) return;
    setCodes(p => p.filter(x => x.id !== c.id));
    if (!isDemo) await supabase.from("promo_codes").delete().eq("id", c.id);
  }

  function openNew() { setForm(EMPTY); setEditing(null); setModal("new"); }
  function openEdit(c) {
    setForm({ code: c.code, label: c.label || "", discount_percent: c.discount_percent, max_uses: c.max_uses || "", expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "", active: c.active });
    setEditing(c); setModal("edit");
  }

  const totalUses = codes.reduce((s, c) => s + (c.use_count || 0), 0);
  const activeCodes = codes.filter(c => c.active);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 14, color: C.textSecondary }}>{activeCodes.length} code{activeCodes.length !== 1 ? "s" : ""} actif{activeCodes.length !== 1 ? "s" : ""} · {totalUses} utilisation{totalUses !== 1 ? "s" : ""} totale{totalUses !== 1 ? "s" : ""}</p>
        </div>
        <Btn variant="primary" onClick={openNew}>+ Nouveau code</Btn>
      </div>

      {/* Stats row */}
      {codes.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            ["Codes créés", codes.length],
            ["Codes actifs", activeCodes.length],
            ["Utilisations totales", totalUses],
          ].map(([l, v]) => (
            <Surface key={l} style={{ padding: "14px 18px" }}>
              <p style={{ fontSize: 11, color: C.textSecondary, marginBottom: 4, fontWeight: 500 }}>{l}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: C.dark }}>{v}</p>
            </Surface>
          ))}
        </div>
      )}

      {loading && <p style={{ color: C.textSecondary, fontSize: 14 }}>Chargement…</p>}

      {!loading && codes.length === 0 && (
        <Surface style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏷️</div>
          <p style={{ fontWeight: 700, fontSize: 16, color: C.dark, marginBottom: 6 }}>Aucun code promo</p>
          <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 20 }}>Créez des codes que vos clients saisissent au moment de commander.</p>
          <Btn variant="primary" onClick={openNew}>+ Créer un code</Btn>
        </Surface>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {codes.map(c => {
          const expired = c.expires_at && new Date(c.expires_at) < new Date();
          const maxed = c.max_uses && c.use_count >= c.max_uses;
          const statusOk = c.active && !expired && !maxed;
          return (
            <Surface key={c.id} style={{ padding: 0, overflow: "hidden", borderTop: `3px solid ${statusOk ? C.accentGreen : C.border}`, opacity: statusOk ? 1 : 0.75 }}>
              <div style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 18, color: C.dark, letterSpacing: "0.05em", background: C.bg, padding: "3px 10px", borderRadius: 8 }}>{c.code}</span>
                    </div>
                    {c.label && <p style={{ fontSize: 13, color: C.textSecondary }}>{c.label}</p>}
                  </div>
                  <button onClick={() => toggleActive(c)}
                    style={{ width: 36, height: 20, borderRadius: 10, border: "none", background: c.active ? C.accentGreen : C.border, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                    <span style={{ position: "absolute", top: 2, left: c.active ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                  </button>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  <span style={{ background: "#0071E315", color: "#0071E3", fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 20 }}>−{c.discount_percent}%</span>
                  {statusOk && <span style={{ background: C.accentGreen + "15", color: C.accentGreen, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>✓ Actif</span>}
                  {expired && <span style={{ background: C.accent + "15", color: C.accent, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>Expiré</span>}
                  {maxed && <span style={{ background: C.accent + "15", color: C.accent, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>Épuisé</span>}
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: C.textSecondary, marginBottom: 14 }}>
                  <span>🔢 {c.use_count || 0}{c.max_uses ? ` / ${c.max_uses}` : ""} utilisation{c.use_count !== 1 ? "s" : ""}</span>
                  {c.expires_at && <span>📅 {new Date(c.expires_at).toLocaleDateString("fr-FR")}</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="ghost" size="xs" full onClick={() => openEdit(c)}>Modifier</Btn>
                  <button onClick={() => del(c)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: C.accent, fontSize: 12, ...FF }}>✕</button>
                </div>
              </div>
            </Surface>
          );
        })}
      </div>

      {/* Modal */}
      {(modal === "new" || modal === "edit") && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <Surface style={{ width: "100%", maxWidth: 420, padding: 28, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ fontWeight: 800, fontSize: 18, color: C.dark }}>{modal === "new" ? "Nouveau code promo" : "Modifier le code"}</p>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.textTertiary }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: "block", marginBottom: 6 }}>Code * <span style={{ fontWeight: 400 }}>(majuscules, sans espace)</span></label>
                <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase().replace(/\s/g, "") }))}
                  placeholder="EX: BIENVENUE10" style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 16, fontFamily: "monospace", fontWeight: 700, outline: "none", letterSpacing: "0.05em", boxSizing: "border-box", ...FF }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: "block", marginBottom: 6 }}>Libellé (visible par le client)</label>
                <input value={form.label} onChange={fv("label")} placeholder="Ex: Bienvenue !" style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 14, outline: "none", boxSizing: "border-box", ...FF }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: "block", marginBottom: 6 }}>Réduction *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[5, 10, 15, 20, 25, 30].map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, discount_percent: p }))}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1.5px solid ${form.discount_percent === p ? C.dark : C.border}`, background: form.discount_percent === p ? C.dark : C.white, color: form.discount_percent === p ? C.white : C.dark, fontWeight: 700, fontSize: 13, cursor: "pointer", ...FF }}>
                      −{p}%
                    </button>
                  ))}
                </div>
                <input type="number" value={form.discount_percent} onChange={fv("discount_percent")} min={1} max={100}
                  style={{ marginTop: 8, width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", ...FF }}
                  placeholder="Ou entrez une valeur personnalisée…" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: "block", marginBottom: 6 }}>Nb. utilisations max</label>
                  <input type="number" value={form.max_uses} onChange={fv("max_uses")} placeholder="Illimité" min={1}
                    style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", ...FF }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: "block", marginBottom: 6 }}>Date d'expiration</label>
                  <input type="date" value={form.expires_at} onChange={fv("expires_at")}
                    style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", ...FF }} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: C.bg, borderRadius: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Code actif</span>
                <div onClick={() => setForm(p => ({ ...p, active: !p.active }))}
                  style={{ width: 44, height: 26, borderRadius: 13, background: form.active ? C.accentGreen : C.border, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                  <div style={{ position: "absolute", top: 3, left: form.active ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <Btn variant="ghost" full onClick={() => setModal(null)}>Annuler</Btn>
              <Btn variant="primary" full onClick={save} disabled={saving || !form.code.trim()}>
                {saving ? "Enregistrement…" : modal === "new" ? "Créer le code" : "Enregistrer"}
              </Btn>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER PAGE — public, no auth, opened by scanning QR code
// ─────────────────────────────────────────────────────────────────────────────
const CUSTOMER_LANGS = [
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "ar", flag: "🇦🇪", name: "عربي" },
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "pt", flag: "🇵🇹", name: "Português" },
];
const CT = {
  fr: {
    all: "Tous", cart: "Panier", add: "Ajouter", addMore: "+", popular: "⭐ Populaire", menuBadge: "🍽️+🥤 Menu",
    note: "Note pour la cuisine", notePlaceholder: "Allergie, cuisson, sans gluten…",
    total: "Total", payment: "Paiement →", back: "← Continuer",
    payTitle: "Paiement", cashBtn: "💵 Payer en espèces", cardBtn: "💳 Payer par carte",
    nameLabel: "Votre prénom", emailLabel: "Email (optionnel)", skip: "Passer",
    confirm: "Confirmer la commande", confirming: "Commande en cours…",
    doneTitle: "Commande envoyée !", doneMsg: "Votre commande est bien enregistrée.",
    status_PENDING: "En attente", status_PREPARING: "En préparation", status_READY: "Prête !",
    etaLabel: "Temps estimé", etaMin: "min",
    compose: "Étape", of: "/", required: "Obligatoire", optional: "Optionnel",
    maxChoice: "1 choix", maxChoices: "Jusqu'à %n choix",
    addCart: "🛒 Ajouter au panier", next: "Suivant →", prev: "← Étape précédente",
    extrasTitle: "Suppléments", extrasDesc: "Optionnel · Ajoutez des suppléments",
    table: "Table",
    orderTypeTitle: "Comment souhaitez-vous consommer ?",
    dineIn: "Sur place", dineInSub: "Je mange ici",
    takeaway: "À emporter", takeawaySub: "Je repars avec ma commande",
    orderTypeConfirm: "Continuer →",
  },
  en: {
    all: "All", cart: "Cart", add: "Add", addMore: "+", popular: "⭐ Popular", menuBadge: "🍽️+🥤 Combo",
    note: "Note for the kitchen", notePlaceholder: "Allergy, cooking preference, gluten-free…",
    total: "Total", payment: "Payment →", back: "← Continue",
    payTitle: "Payment", cashBtn: "💵 Pay in cash", cardBtn: "💳 Pay by card",
    nameLabel: "Your first name", emailLabel: "Email (optional)", skip: "Skip",
    confirm: "Confirm order", confirming: "Placing order…",
    doneTitle: "Order placed!", doneMsg: "Your order has been successfully recorded.",
    status_PENDING: "Waiting", status_PREPARING: "Preparing", status_READY: "Ready!",
    etaLabel: "Estimated time", etaMin: "min",
    compose: "Step", of: "/", required: "Required", optional: "Optional",
    maxChoice: "1 choice", maxChoices: "Up to %n choices",
    addCart: "🛒 Add to cart", next: "Next →", prev: "← Previous step",
    extrasTitle: "Extras", extrasDesc: "Optional · Add extras",
    table: "Table",
    orderTypeTitle: "How would you like your order?",
    dineIn: "Dine in", dineInSub: "I'm eating here",
    takeaway: "Takeaway", takeawaySub: "I'll take it with me",
    orderTypeConfirm: "Continue →",
  },
  ar: {
    all: "الكل", cart: "السلة", add: "إضافة", addMore: "+", popular: "⭐ الأكثر طلبًا", menuBadge: "🍽️+🥤 طبق+شراب",
    note: "ملاحظة للمطبخ", notePlaceholder: "حساسية، طريقة الطهي…",
    total: "الإجمالي", payment: "الدفع ←", back: "← متابعة",
    payTitle: "الدفع", cashBtn: "💵 دفع نقداً", cardBtn: "💳 دفع بالبطاقة",
    nameLabel: "اسمك", emailLabel: "البريد الإلكتروني (اختياري)", skip: "تخطي",
    confirm: "تأكيد الطلب", confirming: "جارٍ الطلب…",
    doneTitle: "تم الطلب!", doneMsg: "تم تسجيل طلبك بنجاح.",
    status_PENDING: "في الانتظار", status_PREPARING: "قيد التحضير", status_READY: "جاهز!",
    etaLabel: "الوقت المقدر", etaMin: "دقيقة",
    compose: "خطوة", of: "/", required: "إلزامي", optional: "اختياري",
    maxChoice: "خيار واحد", maxChoices: "حتى %n خيارات",
    addCart: "🛒 إضافة إلى السلة", next: "التالي ←", prev: "← الخطوة السابقة",
    extrasTitle: "إضافات", extrasDesc: "اختياري · أضف إضافات",
    table: "طاولة",
    orderTypeTitle: "كيف تريد تناول طلبك؟",
    dineIn: "في المكان", dineInSub: "سآكل هنا",
    takeaway: "للأخذ", takeawaySub: "سآخذه معي",
    orderTypeConfirm: "متابعة ←",
  },
  es: {
    all: "Todo", cart: "Cesta", add: "Añadir", addMore: "+", popular: "⭐ Popular", menuBadge: "🍽️+🥤 Menú",
    note: "Nota para la cocina", notePlaceholder: "Alergia, cocción, sin gluten…",
    total: "Total", payment: "Pago →", back: "← Continuar",
    payTitle: "Pago", cashBtn: "💵 Pagar en efectivo", cardBtn: "💳 Pagar con tarjeta",
    nameLabel: "Tu nombre", emailLabel: "Email (opcional)", skip: "Omitir",
    confirm: "Confirmar pedido", confirming: "Realizando pedido…",
    doneTitle: "¡Pedido realizado!", doneMsg: "Tu pedido ha sido registrado correctamente.",
    status_PENDING: "En espera", status_PREPARING: "Preparando", status_READY: "¡Listo!",
    etaLabel: "Tiempo estimado", etaMin: "min",
    compose: "Paso", of: "/", required: "Obligatorio", optional: "Opcional",
    maxChoice: "1 opción", maxChoices: "Hasta %n opciones",
    addCart: "🛒 Añadir al carro", next: "Siguiente →", prev: "← Paso anterior",
    extrasTitle: "Extras", extrasDesc: "Opcional · Añade extras",
    table: "Mesa",
  },
  pt: {
    all: "Tudo", cart: "Cesto", add: "Adicionar", addMore: "+", popular: "⭐ Popular", menuBadge: "🍽️+🥤 Menu",
    note: "Nota para a cozinha", notePlaceholder: "Alergia, cozimento, sem glúten…",
    total: "Total", payment: "Pagamento →", back: "← Continuar",
    payTitle: "Pagamento", cashBtn: "💵 Pagar em dinheiro", cardBtn: "💳 Pagar com cartão",
    nameLabel: "Seu nome", emailLabel: "Email (opcional)", skip: "Pular",
    confirm: "Confirmar pedido", confirming: "Fazendo pedido…",
    doneTitle: "Pedido feito!", doneMsg: "Seu pedido foi registrado com sucesso.",
    status_PENDING: "Aguardando", status_PREPARING: "Preparando", status_READY: "Pronto!",
    etaLabel: "Tempo estimado", etaMin: "min",
    compose: "Etapa", of: "/", required: "Obrigatório", optional: "Opcional",
    maxChoice: "1 escolha", maxChoices: "Até %n escolhas",
    addCart: "🛒 Adicionar ao cesto", next: "Próximo →", prev: "← Etapa anterior",
    extrasTitle: "Extras", extrasDesc: "Opcional · Adicione extras",
    table: "Mesa",
  },
};

function CustomerPage({ slug, tableNum }) {
  const [step, setStep] = useState("loading"); // loading | ordertype | menu | cart | payment | done | error
  const [orderType, setOrderType] = useState(null); // "dine_in" | "takeaway"
  const [restaurant, setRestaurant] = useState(null);
  const [tableId, setTableId] = useState(null);
  const [tableLabel, setTableLabel] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCat, setActiveCat] = useState("__ALL__");
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(0);
  const [orderId, setOrderId] = useState(null);
  const [payMode, setPayMode] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [profileSkipped, setProfileSkipped] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([{ role: "assistant", content: "👋 Hello / Bonjour ! How can I help you with the menu?" }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [activePromos, setActivePromos] = useState([]);
  const [googleReviewUrl, setGoogleReviewUrl] = useState(null);
  const [catOrderCustomer, setCatOrderCustomer] = useState([]);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null); // { code, discount_percent, label, id }
  const [promoError, setPromoError] = useState("");
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [menuWelcomeBg, setMenuWelcomeBg] = useState(null);
  const [menuHeaderBg, setMenuHeaderBg] = useState(null);
  const [menuBodyBg, setMenuBodyBg] = useState(null);
  const [estimatedReadyAt, setEstimatedReadyAt] = useState(null);
  const [orderCreatedAt, setOrderCreatedAt] = useState(null);
  const [orderStatus, setOrderStatus] = useState("PENDING");
  const [, setNowTick] = useState(0);

  const PENDING_STORAGE_KEY = `vg_pending_${slug}_t${tableNum}`;

  function clearPendingOrder() {
    try { localStorage.removeItem(PENDING_STORAGE_KEY); } catch {}
  }
  const [composeModal, setComposeModal] = useState(null); // null | { item, step, choices: {[groupName]: [{name,price}]} }
  const [lang, setLang] = useState(() => localStorage.getItem("vg_customer_lang") || "fr");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [ticketInfo, setTicketInfo] = useState(null); // { ticket_address, ticket_phone, ticket_tax_id, ticket_footer }
  const L = CT[lang] || CT.fr;
  const isRtl = lang === "ar";

  const [translCache, setTranslCache] = useState({}); // `${lang}:${id}` → {name, description}

  function changeLang(code) { setLang(code); localStorage.setItem("vg_customer_lang", code); setShowLangPicker(false); }

  // Translate menu items when language changes (unofficial Google Translate, no key needed)
  useEffect(() => {
    if (lang === "fr" || menuItems.length === 0) return;
    const uncached = menuItems.filter(i => !translCache[`${lang}:${i.id}`]);
    if (uncached.length === 0) return;
    (async () => {
      const results = {};
      await Promise.all(uncached.map(async (item) => {
        try {
          const [tName, tDesc] = await Promise.all(
            [item.name, item.description || ""].map(async (t) => {
              if (!t) return t;
              const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=${lang}&dt=t&q=${encodeURIComponent(t)}`);
              if (!res.ok) return t;
              const json = await res.json();
              return json?.[0]?.map(s => s[0]).join("") || t;
            })
          );
          results[`${lang}:${item.id}`] = { name: tName || item.name, description: tDesc || item.description };
        } catch { results[`${lang}:${item.id}`] = { name: item.name, description: item.description }; }
      }));
      setTranslCache(prev => ({ ...prev, ...results }));
    })();
  }, [lang, menuItems]);

  function tItem(item) {
    // Prefer stored translations (set by admin) over live API cache
    const stored = item.translations?.[lang];
    if (stored?.name) return { ...item, name: stored.name, description: stored.description || item.description };
    const t = translCache[`${lang}:${item.id}`];
    return t ? { ...item, name: t.name || item.name, description: t.description || item.description } : item;
  }

  function addToCart(item) {
    const groups = (item.supplements || []).filter(g => g.options?.length > 0);
    const extras = (item.extras || []).filter(e => e.name?.trim());
    if (groups.length > 0 || extras.length > 0) {
      setComposeModal({ item, step: 0, choices: {} });
    } else {
      setCart(p => { const e = p.find(i => i.id === item.id && !i._composed); return e ? p.map(i => i.id === item.id && !i._composed ? { ...i, qty: i.qty + 1 } : i) : [...p, { ...item, qty: 1, _choices: {} }]; });
    }
  }

  useEffect(() => {
    async function load() {
      try {
        // demo slug — use local data without Supabase
        if (slug === "demo") {
          setRestaurant(DEMO_RESTAURANT);
          setMenuItems(DEMO_MENU);
          setTableId(`demo-t${tableNum}`);
          setStep("ordertype");
          return;
        }
        // slug may be a UUID (durable QR) or a slug string (legacy)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        const { data: resto, error: restoErr } = await supabase.from("restaurants").select("*").eq(isUuid ? "id" : "slug", slug).single();
        if (restoErr || !resto) { setStep("error"); return; }
        setRestaurant(resto);
        const [tblRes, itemsRes] = await Promise.all([
          supabase.from("tables").select("id,label").eq("restaurant_id", resto.id).eq("number", tableNum).single(),
          supabase.from("menu_items").select("*").eq("restaurant_id", resto.id).eq("available", true).order("category").order("name"),
        ]);
        setTableId(tblRes.data?.id ?? null);
        setTableLabel(tblRes.data?.label ?? null);
        // deduplicate by id in case DB has duplicate rows
        const raw = itemsRes.data ?? [];
        const seen = new Set();
        const deduped = raw.filter(i => seen.has(i.id) ? false : seen.add(i.id));
        // Sort dishes within each category by custom sort_order (stable sort keeps category grouping logic intact)
        deduped.sort((a, b) => ((a.sort_order ?? 9999) - (b.sort_order ?? 9999)) || a.name.localeCompare(b.name));
        setMenuItems(deduped);
        // promos optional — table may not exist yet
        try {
          const { data: promos } = await supabase.from("promotions").select("*").eq("restaurant_id", resto.id).eq("active", true);
          setActivePromos(promos ?? []);
        } catch {}
        // Google review settings + category order
        try {
          const { data: sett } = await supabase.from("restaurant_settings").select("google_review_url,google_review_enabled,category_order,stripe_publishable_key,menu_background_url,menu_header_bg_url,menu_body_bg_url").eq("restaurant_id", resto.id).maybeSingle();
          if (sett?.google_review_enabled && sett?.google_review_url) setGoogleReviewUrl(sett.google_review_url);
          if (sett?.category_order?.length) setCatOrderCustomer(sett.category_order);
          if (sett?.stripe_publishable_key) setStripeEnabled(true);
          if (sett?.menu_background_url) setMenuWelcomeBg(sett.menu_background_url);
          if (sett?.menu_header_bg_url) setMenuHeaderBg(sett.menu_header_bg_url);
          if (sett?.menu_body_bg_url) setMenuBodyBg(sett.menu_body_bg_url);
        } catch {}
        // Ticket customization (separate query — columns may not exist yet)
        try {
          const { data: tk } = await supabase.from("restaurant_settings").select("ticket_address,ticket_phone,ticket_tax_id,ticket_footer").eq("restaurant_id", resto.id).maybeSingle();
          if (tk) setTicketInfo(tk);
        } catch {}
        // If the customer had a live order in progress (just refreshed the page),
        // restore them straight onto the tracking screen instead of the menu.
        try {
          const raw = localStorage.getItem(PENDING_STORAGE_KEY);
          if (raw) {
            const saved = JSON.parse(raw);
            const ageMs = Date.now() - (saved.savedAt || 0);
            if (saved.orderId && ageMs < 4 * 60 * 60 * 1000) {
              const { data: orderRow } = await supabase
                .from("orders")
                .select("status,estimated_ready_at,created_at")
                .eq("id", saved.orderId)
                .maybeSingle();
              const stillOpen = orderRow && !["DONE", "CANCELED", "REFUNDED"].includes(orderRow.status);
              if (stillOpen) {
                setOrderId(saved.orderId);
                if (Array.isArray(saved.cart)) setCart(saved.cart);
                setCustomerName(saved.customerName || "");
                setCustomerEmail(saved.customerEmail || "");
                setCustomerPhone(saved.customerPhone || "");
                if (saved.note) setNote(saved.note);
                if (saved.payMode) setPayMode(saved.payMode);
                if (saved.orderType) setOrderType(saved.orderType);
                setOrderStatus(orderRow.status || "PENDING");
                setEstimatedReadyAt(orderRow.estimated_ready_at || saved.estimatedReadyAt || null);
                setOrderCreatedAt(orderRow.created_at || saved.createdAt || null);
                setStep("done");
                return;
              }
              clearPendingOrder();
            } else {
              clearPendingOrder();
            }
          }
        } catch {}
        setStep("ordertype");
      } catch {
        setStep("error");
      }
    }
    load();
  }, [slug, tableNum]);

  // Re-render once a second on the "done" step so the countdown + progress bar update live
  useEffect(() => {
    if (step !== "done") return;
    const t = setInterval(() => setNowTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [step]);

  // Poll order status + estimated time every 4s when on "done" step,
  // plus a Supabase realtime subscription so "Prête" lands instantly,
  // plus an immediate poll when the tab regains focus/visibility.
  useEffect(() => {
    if (step !== "done" || !orderId || orderId.startsWith("demo-")) return;
    let cancelled = false;
    function poll() {
      supabase.from("orders").select("status,estimated_ready_at,created_at").eq("id", orderId).single()
        .then(({ data }) => {
          if (cancelled || !data) return;
          setOrderStatus(data.status);
          if (data.estimated_ready_at) setEstimatedReadyAt(data.estimated_ready_at);
          if (data.created_at && !orderCreatedAt) setOrderCreatedAt(data.created_at);
          if (["DONE", "CANCELED", "REFUNDED"].includes(data.status)) clearPendingOrder();
        }).catch(() => {});
    }
    poll();
    const t = setInterval(poll, 4000);
    const onVis = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", poll);
    const channel = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        ({ new: row }) => {
          if (!row) return;
          setOrderStatus(row.status);
          if (row.estimated_ready_at) setEstimatedReadyAt(row.estimated_ready_at);
          if (["DONE", "CANCELED", "REFUNDED"].includes(row.status)) clearPendingOrder();
        })
      .subscribe();
    return () => {
      cancelled = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", poll);
      supabase.removeChannel(channel);
    };
  }, [step, orderId]);

  // Ask for OS-level notification permission as soon as the customer lands
  // on the tracking screen — that way "Votre commande est prête" can reach
  // them even if they've switched apps or locked their phone. Chrome allows
  // this without a click; Safari/iOS need the explicit banner tap below.
  useEffect(() => {
    if (step !== "done" || !orderId || typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      subscribeToOrderReadyPush(orderId);
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then(perm => {
        if (perm === "granted") subscribeToOrderReadyPush(orderId);
      }).catch(() => {});
    }
  }, [step, orderId]);

  // Ring + keep ringing once the order flips to READY, so the customer is
  // alerted on their own phone screen — stops as soon as they tap the banner.
  const prevOrderStatusRef = useRef(null);
  const silencedCustomerOrders = useSilencedOrders();
  const customerAudioUnlocked = useOrderAudioUnlocked();
  useEffect(() => {
    // Order left the READY state (staff clicked "Servi" / DONE, or it was canceled)
    // → immediately kill any in-flight chime and mark the order silenced so the
    // 5s repeat loop can't fire again before its guard re-evaluates.
    if (prevOrderStatusRef.current === "READY" && orderStatus !== "READY") {
      if (orderId) silenceOrder(orderId);
      stopAllOrderAudio();
    }
    if (orderStatus === "READY" && prevOrderStatusRef.current && prevOrderStatusRef.current !== "READY") {
      playCustomerReadyChime();
      // Vibration doesn't depend on the ringer/silent switch the way audio
      // does, so it fires regardless — the one channel guaranteed to work
      // for someone who keeps their phone on vibrate.
      if (navigator.vibrate) { try { navigator.vibrate([300, 150, 300, 150, 300]); } catch {} }
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification("✅ Votre commande est prête !", {
            body: `${restaurant?.name || "Le restaurant"} — vous pouvez venir la récupérer.`,
            tag: orderId || "order-ready",
          });
        } catch {}
      }
    }
    prevOrderStatusRef.current = orderStatus;
  }, [orderStatus, orderId, restaurant]);
  useEffect(() => {
    if (orderStatus !== "READY" || !orderId || silencedCustomerOrders.has(orderId)) return;
    const id = setInterval(() => {
      playCustomerReadyChime();
      if (navigator.vibrate) { try { navigator.vibrate([300, 150, 300]); } catch {} }
    }, 5000);
    return () => clearInterval(id);
  }, [orderStatus, orderId, silencedCustomerOrders]);

  const tableDisplay = tableLabel || `${L.table} ${tableNum}`;
  const rawCats = Array.from(new Set(menuItems.map(i => i.category)));
  const sortedCats = catOrderCustomer.length
    ? [...catOrderCustomer.filter(c => rawCats.includes(c)), ...rawCats.filter(c => !catOrderCustomer.includes(c))]
    : rawCats;
  const cats = ["__ALL__", ...sortedCats];
  const isAll = activeCat === "__ALL__";
  const filtered = isAll ? menuItems : menuItems.filter(i => i.category === activeCat);
  const filteredSorted = isAll
    ? [...filtered].sort((a, b) => {
        const ai = sortedCats.indexOf(a.category);
        const bi = sortedCats.indexOf(b.category);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
    : filtered;
  // Apply best active promo discount to all items
  const bestDiscount = activePromos.reduce((max, p) => Math.max(max, p.discount_percent || 0), 0);
  const filteredWithPromo = filteredSorted.map(item => {
    const translated = tItem(item);
    return bestDiscount > 0 ? { ...translated, _originalPrice: translated.price, price: +(translated.price * (1 - bestDiscount / 100)).toFixed(2) } : translated;
  });
  const rawTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const promoDiscount = appliedPromo ? +(rawTotal * appliedPromo.discount_percent / 100).toFixed(2) : 0;
  const total = +(rawTotal - promoDiscount).toFixed(2);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  async function applyPromoCode() {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    setCheckingPromo(true); setPromoError("");
    if (restaurant.id === "demo") { setPromoError("Codes promo indisponibles en mode démo"); setCheckingPromo(false); return; }
    const { data, error } = await supabase.from("promo_codes")
      .select("*").eq("restaurant_id", restaurant.id).eq("code", code).eq("active", true).maybeSingle();
    if (error || !data) { setPromoError("Code invalide ou inactif"); setCheckingPromo(false); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setPromoError("Ce code a expiré"); setCheckingPromo(false); return; }
    if (data.max_uses && data.use_count >= data.max_uses) { setPromoError("Ce code a atteint son nombre maximum d'utilisations"); setCheckingPromo(false); return; }
    setAppliedPromo({ id: data.id, code: data.code, discount_percent: data.discount_percent, label: data.label });
    setPromoCodeInput("");
    setCheckingPromo(false);
  }

  const add = item => setCart(p => { const e = p.find(i => i.id === item.id); return e ? p.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) : [...p, { ...item, qty: 1, supplements: [] }]; });
  const rem = id => setCart(p => { const e = p.find(i => i.id === id); return e.qty === 1 ? p.filter(i => i.id !== id) : p.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i); });

  async function confirm(paymentMethod = "cash") {
    setConfirming(true); setConfirmError("");
    // Demo mode: simulate order without Supabase
    if (restaurant.id === "demo") {
      await new Promise(r => setTimeout(r, 1200));
      setOrderId("demo-" + Date.now().toString(36).toUpperCase());
      setPayMode(paymentMethod === "cash" ? null : "card");
      setStep("done");
      setConfirming(false);
      return;
    }
    try {
      // Auto-create table if not found
      let tid = tableId;
      if (!tid) {
        const { data: newTbl } = await supabase.from("tables")
          .insert({ restaurant_id: restaurant.id, number: tableNum, qr_url: `${window.location.origin}${BASE_PATH}/r/${restaurant.id}/t/${tableNum}` })
          .select("id").single();
        tid = newTbl?.id ?? null;
      }

      let { data: order, error } = await supabase.from("orders")
        .insert({ restaurant_id: restaurant.id, table_id: tid, note, total, status: "PENDING", payment_method: paymentMethod, customer_name: customerName.trim() || null, customer_email: customerEmail.trim() || null, paid: paymentMethod !== "cash", order_type: orderType || "dine_in" })
        .select().single();

      // Fallback 0: without paid column (not migrated yet)
      if (error && error.message?.includes("paid")) {
        ({ data: order, error } = await supabase.from("orders")
          .insert({ restaurant_id: restaurant.id, table_id: tid, note, total, status: "PENDING", payment_method: paymentMethod, customer_name: customerName.trim() || null, customer_email: customerEmail.trim() || null })
          .select().single());
      }
      // Fallback 1: without customer fields
      if (error) {
        ({ data: order, error } = await supabase.from("orders")
          .insert({ restaurant_id: restaurant.id, table_id: tid, note, total, status: "PENDING", payment_method: paymentMethod })
          .select().single());
      }
      // Fallback 2: without payment_method either
      if (error) {
        ({ data: order, error } = await supabase.from("orders")
          .insert({ restaurant_id: restaurant.id, table_id: tid, note, total, status: "PENDING" })
          .select().single());
      }

      if (error || !order) { setConfirmError("Erreur lors de la commande : " + (error?.message || "réessayez")); setConfirming(false); return; }

      const orderItems = cart.map(i => {
        const choices = i._choices || {};
        const parts = Object.entries(choices).filter(([, v]) => v.length > 0).map(([k, v]) => k === "__extras__" ? "+" + v.map(o => o.name).join(", ") : v.map(o => o.name).join(", "));
        return { order_id: order.id, menu_item_id: i.id, quantity: i.qty, detail: parts.join(" · ") };
      });
      await supabase.from("order_items").insert(orderItems);

      // Increment promo code use count
      if (appliedPromo?.id) {
        try { await supabase.rpc("increment_promo_use", { promo_id: appliedPromo.id }); } catch {}
      }

      for (const item of cart) {
        if (item.stock != null && item.stock > 0) {
          const newStock = Math.max(0, item.stock - item.qty);
          await supabase.from("menu_items").update({ stock: newStock, available: newStock > 0 }).eq("id", item.id);
        }
      }
      // Decrement ingredient stocks via recipes
      try {
        const itemIds = cart.map(i => i.id);
        const { data: recipeLines } = await supabase.from("recipe_items").select("ingredient_id, qty_per_portion, menu_item_id").in("menu_item_id", itemIds);
        if (recipeLines?.length) {
          const deltas = {};
          for (const r of recipeLines) {
            const cartItem = cart.find(ci => ci.id === r.menu_item_id);
            if (cartItem) deltas[r.ingredient_id] = (deltas[r.ingredient_id] || 0) + r.qty_per_portion * cartItem.qty;
          }
          const ingIds = Object.keys(deltas);
          const { data: ings } = await supabase.from("ingredients").select("id, stock").in("id", ingIds);
          for (const ing of ings ?? []) {
            const newStock = Math.max(0, +(ing.stock - deltas[ing.id]).toFixed(3));
            await supabase.from("ingredients").update({ stock: newStock }).eq("id", ing.id);
          }
        }
      } catch {}
      setOrderId(order.id);
      const createdAtIso = new Date().toISOString();
      setOrderCreatedAt(createdAtIso);
      // Set default estimated ready time (15 min from now)
      const etaIso = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      setEstimatedReadyAt(etaIso);
      try {
        await supabase.from("orders").update({ estimated_ready_at: etaIso }).eq("id", order.id);
      } catch {}
      setStep("done");
      // Persist so a page refresh keeps the customer on the tracking screen instead of dumping them back to the menu
      try {
        localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify({
          orderId: order.id,
          cart,
          customerName, customerEmail, customerPhone,
          note, total,
          payMode: paymentMethod === "cash" ? null : paymentMethod,
          orderType,
          createdAt: createdAtIso,
          estimatedReadyAt: etaIso,
          savedAt: Date.now(),
        }));
      } catch {}
      // Upsert customer profile + send receipt email
      try {
        if (customerEmail.trim()) {
          await supabase.from("customers").upsert({
            restaurant_id: restaurant.id,
            email: customerEmail.trim().toLowerCase(),
            first_name: customerName.trim() || "Client",
            phone: customerPhone.trim() || "",
            last_visit: new Date().toISOString().split("T")[0],
            last_order_total: total,
          }, { onConflict: "restaurant_id,email", ignoreDuplicates: false });

          // Send receipt email immediately only for paid (card) orders.
          // Cash orders: the cashier triggers the PAYÉ receipt from the live orders view.
          if (paymentMethod !== "cash") {
          const payLabelMap = { cash: "Espèces", card: "Carte bancaire", apple_pay: "Apple Pay", google_pay: "Google Pay" };
          const itemsHtml = cart.map(i => `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;">${i.emoji} ${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;font-size:14px;">${(i.price * i.qty).toFixed(2)} €</td></tr>`).join("");
          const isPaid = paymentMethod && paymentMethod !== "cash";
          const headerInfo = [
            ticketInfo?.ticket_address,
            ticketInfo?.ticket_phone ? `Tél : ${ticketInfo.ticket_phone}` : "",
            ticketInfo?.ticket_tax_id,
          ].filter(Boolean).map(l => `<p style="color:rgba(255,255,255,0.55);margin:2px 0 0;font-size:11px;">${l}</p>`).join("");
          const statusHtml = isPaid
            ? `<div style="border:2px solid #34C759;border-radius:10px;padding:10px;text-align:center;margin-top:12px;"><span style="color:#34C759;font-weight:900;font-size:16px;letter-spacing:.04em;">✓ PAYÉ</span></div>`
            : `<div style="border:2px solid #FF9F0A;background:#FF9F0A10;border-radius:10px;padding:10px;text-align:center;margin-top:12px;"><span style="color:#C77700;font-weight:900;font-size:16px;letter-spacing:.04em;">💵 À PAYER À LA CAISSE</span><br/><span style="color:#C77700;font-size:12px;font-weight:600;">Présentez ce ticket au comptoir</span></div>`;
          const receiptHtml = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;color:#1d1d1f;"><div style="text-align:center;background:#1d1d1f;padding:24px;border-radius:16px 16px 0 0;"><h2 style="color:#fff;margin:0;font-size:22px;">${restaurant.name}</h2>${headerInfo}<p style="color:rgba(255,255,255,0.6);margin:8px 0 0;font-size:13px;">Table ${tableNum} · ${new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}</p></div><div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:24px;border-radius:0 0 16px 16px;"><p style="font-size:11px;color:#888;letter-spacing:.06em;margin:0 0 4px;">N° COMMANDE</p><p style="font-family:monospace;font-size:15px;font-weight:700;margin:0 0 20px;">#${order.id.slice(0,8).toUpperCase()}</p>${customerName ? `<p style="font-size:11px;color:#888;letter-spacing:.06em;margin:0 0 4px;">CLIENT</p><p style="font-size:15px;font-weight:600;margin:0 0 20px;">${customerName}</p>` : ""}<p style="font-size:11px;color:#888;letter-spacing:.06em;margin:0 0 8px;">ARTICLES</p><table style="width:100%;border-collapse:collapse;">${itemsHtml}</table><div style="display:flex;justify-content:space-between;align-items:center;background:#f5f5f7;border-radius:10px;padding:14px 16px;margin-top:16px;"><span style="font-size:16px;font-weight:700;">Total</span><span style="font-size:20px;font-weight:900;">${total.toFixed(2)} €</span></div><p style="font-size:12px;color:#888;margin:8px 0 0;">Paiement : ${payLabelMap[paymentMethod] ?? "Espèces"}</p>${statusHtml}<p style="text-align:center;font-size:13px;color:#888;margin-top:24px;font-style:italic;">${ticketInfo?.ticket_footer || "Merci de votre visite ! 🙏"}</p></div></body></html>`;
          supabase.functions.invoke("send-receipt-email", {
            body: { restaurant_id: restaurant.id, to_email: customerEmail.trim(), subject: `Votre reçu — ${restaurant.name}`, html_body: receiptHtml }
          }).catch(() => {});
          }
        }
      } catch {}
    } catch (e) {
      setConfirmError("Une erreur inattendue est survenue. Veuillez réessayer.");
    } finally {
      setConfirming(false);
    }
  }

  async function sendChat(directText) {
    const text = (typeof directText === "string" ? directText : chatInput).trim();
    if (!text || chatLoading) return;
    const userMsg = { role: "user", content: text };
    const next = [...chatMsgs, userMsg];
    setChatMsgs(next); setChatInput(""); setChatLoading(true);
    try {
      const menuSummary = menuItems.map(i => `${i.emoji} ${i.name} (${i.category}) — ${i.description || "sans description"}`).join("\n");
      const ctx = `Restaurant : ${restaurant?.name}\nTable : ${tableNum}\n\nMenu disponible :\n${menuSummary}`;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ messages: next, context: ctx, mode: "customer" }),
      });
      const { content } = await res.json();
      setChatMsgs(p => [...p, { role: "assistant", content: content || "Désolé, je n'ai pas pu répondre." }]);
    } catch { setChatMsgs(p => [...p, { role: "assistant", content: "Désolé, une erreur est survenue." }]); }
    setChatLoading(false);
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

      {step === "ordertype" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "32px 24px", gap: 24, position: "relative", ...(menuWelcomeBg ? { backgroundImage: `url(${menuWelcomeBg})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }}>
          <div style={{ position: "absolute", top: 16, right: 16, zIndex: 50 }}>
            <button onClick={() => setShowLangPicker(p => !p)}
              style={{ background: "rgba(0,0,0,0.08)", border: "none", borderRadius: 20, padding: "7px 12px", color: C.dark, fontSize: 16, cursor: "pointer", lineHeight: 1 }}>
              {CUSTOMER_LANGS.find(l => l.code === lang)?.flag || "🌐"}
            </button>
            {showLangPicker && (
              <div style={{ position: "absolute", right: 0, top: 40, background: C.white, borderRadius: 14, boxShadow: "0 8px 30px rgba(0,0,0,0.18)", padding: 6, zIndex: 200, minWidth: 140 }}>
                {CUSTOMER_LANGS.map(l => (
                  <button key={l.code} onClick={() => changeLang(l.code)}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: l.code === lang ? C.bg : "transparent", border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer", color: C.dark, fontWeight: l.code === lang ? 700 : 400, ...FF }}>
                    <span>{l.flag}</span><span>{l.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {restaurant?.logo_url && <img src={restaurant.logo_url} alt="logo" style={{ width: 80, height: 80, borderRadius: 20, objectFit: "cover", marginBottom: 8 }} />}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.dark, marginBottom: 6 }}>{restaurant?.name || "Bienvenue"}</div>
            <div style={{ fontSize: 15, color: C.textSecondary }}>{L.orderTypeTitle}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 340 }}>
            {[
              { key: "dine_in", icon: "🍽️", label: L.dineIn, sub: L.dineInSub },
              { key: "takeaway", icon: "🥡", label: L.takeaway, sub: L.takeawaySub },
            ].map(opt => (
              <button key={opt.key} onClick={() => setOrderType(opt.key)}
                style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 22px", background: orderType === opt.key ? C.dark : C.white, border: `2px solid ${orderType === opt.key ? C.dark : C.border}`, borderRadius: 18, cursor: "pointer", textAlign: "left", transition: "all 0.15s", ...FF }}>
                <span style={{ fontSize: 32 }}>{opt.icon}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: orderType === opt.key ? C.white : C.dark }}>{opt.label}</div>
                  <div style={{ fontSize: 13, color: orderType === opt.key ? "rgba(255,255,255,0.7)" : C.textSecondary, marginTop: 2 }}>{opt.sub}</div>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => { if (orderType) setStep("menu"); }} disabled={!orderType}
            style={{ width: "100%", maxWidth: 340, padding: 16, background: orderType ? C.dark : C.border, color: C.white, border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: orderType ? "pointer" : "not-allowed", ...FF, transition: "background 0.2s" }}>
            {L.orderTypeConfirm}
          </button>
        </div>
      )}

      {step === "error" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <p style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Restaurant introuvable</p>
          <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 16 }}>Ce QR code n'est plus valide.</p>
          <p style={{ color: C.textTertiary, fontSize: 11, wordBreak: "break-all", background: "#f5f5f7", padding: "8px 12px", borderRadius: 8, maxWidth: 320 }}>{window.location.href}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: "10px 24px", background: C.dark, color: C.white, border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer", ...FF }}>Réessayer</button>
        </div>
      )}

      {step === "menu" && (
        <>
          <div style={{ padding: "52px 20px 16px", background: menuHeaderBg ? "transparent" : C.dark, ...(menuHeaderBg ? { backgroundImage: `url(${menuHeaderBg})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  {restaurant.logo_url
                    ? <img src={restaurant.logo_url} alt={restaurant.name} style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} />
                    : <span style={{ fontSize: 22 }}>{restaurant.emoji || restaurant.logo_emoji}</span>}
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{restaurant.name}</p>
                </div>
                <p style={{ fontSize: 26, fontWeight: 800, color: C.white, letterSpacing: "-0.03em" }}>{tableDisplay}</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* Language picker */}
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowLangPicker(p => !p)}
                    style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 20, padding: "7px 12px", color: C.white, fontSize: 16, cursor: "pointer", lineHeight: 1 }}>
                    {CUSTOMER_LANGS.find(l => l.code === lang)?.flag || "🌐"}
                  </button>
                  {showLangPicker && (
                    <div style={{ position: "absolute", right: 0, top: 40, background: C.white, borderRadius: 14, boxShadow: "0 8px 30px rgba(0,0,0,0.18)", padding: 6, zIndex: 200, minWidth: 140 }}>
                      {CUSTOMER_LANGS.map(l => (
                        <button key={l.code} onClick={() => changeLang(l.code)}
                          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: l.code === lang ? C.bg : "transparent", border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer", color: C.dark, fontWeight: l.code === lang ? 700 : 400, ...FF }}>
                          <span>{l.flag}</span><span>{l.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {count > 0 && <button onClick={() => setStep("cart")} style={{ background: C.accent, border: "none", borderRadius: 20, padding: "10px 18px", color: C.white, fontWeight: 700, fontSize: 14, cursor: "pointer", ...FF }}>🛒 {count} · {total.toFixed(2)}€</button>}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto", background: C.dark, scrollbarWidth: "none" }}>
            {cats.map(c => <button key={c} onClick={() => setActiveCat(c)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 20, border: "none", background: activeCat === c ? C.white : "rgba(255,255,255,0.1)", color: activeCat === c ? C.dark : "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: 12, cursor: "pointer", ...FF }}>{c === "__ALL__" ? L.all : c}</button>)}
          </div>
          {activePromos.length > 0 && (
            <div style={{ padding: "8px 16px", display: "flex", gap: 8, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              {activePromos.map(p => (
                <div key={p.id} style={{
                  flexShrink: 0, background: p.color + "15", border: `1px solid ${p.color}30`,
                  borderRadius: 20, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6
                }}>
                  <span style={{ fontSize: 16 }}>{p.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{p.name}</span>
                  {p.discount_percent > 0 && <span style={{ fontSize: 11, fontWeight: 800, color: p.color }}>−{p.discount_percent}%</span>}
                </div>
              ))}
            </div>
          )}
          <div style={menuBodyBg ? { backgroundImage: `url(${menuBodyBg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "local" } : {}}>
            {filteredWithPromo.map(item => {
              const inCart = cart.find(i => i.id === item.id);
              return (
                <div key={item.id} style={{ display: "flex", gap: 12, padding: "16px", borderBottom: `1px solid ${C.border}`, background: menuBodyBg ? "rgba(255,255,255,0.82)" : "transparent" }}>
                  <div style={{ width: 60, height: 60, borderRadius: 14, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0, overflow: "hidden" }}>
                    {item.photo_url ? <img src={item.photo_url} alt={item.name} style={{ width: 60, height: 60, objectFit: "cover" }} /> : item.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{item.name}</p>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 3 }}>
                          {item.is_menu && <span style={{ background: "#0071E315", color: "#0071E3", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, display: "inline-block" }}>{L.menuBadge}</span>}
                          {item.is_popular && <span style={{ background: C.accent + "15", color: C.accent, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, display: "inline-block" }}>{L.popular}</span>}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, marginLeft: 8, textAlign: "right" }}>
                        {item._originalPrice && <p style={{ fontSize: 12, color: C.textTertiary, textDecoration: "line-through" }}>{Number(item._originalPrice).toFixed(2)}€</p>}
                        <p style={{ fontWeight: 800, fontSize: 16, color: item._originalPrice ? C.accentGreen : C.dark }}>{Number(item.price).toFixed(2)}€</p>
                      </div>
                    </div>
                    {item.description && <p style={{ color: C.textSecondary, fontSize: 13, margin: "5px 0 10px", lineHeight: 1.4 }}>{item.description}</p>}
                    {inCart ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={() => rem(item.id)} style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${C.borderStrong}`, background: C.white, fontWeight: 900, cursor: "pointer", fontSize: 18, ...FF }}>−</button>
                        <span style={{ fontWeight: 800, fontSize: 16 }}>{inCart.qty}</span>
                        <button onClick={() => addToCart(item)} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: C.dark, color: C.white, fontWeight: 900, cursor: "pointer", fontSize: 18, ...FF }}>+</button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(item)} style={{ padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${C.borderStrong}`, background: C.white, color: C.dark, fontWeight: 600, fontSize: 13, cursor: "pointer", ...FF }}>{L.add}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {count > 0 && (
            <div style={{ position: "sticky", bottom: 0, padding: "12px 16px", background: C.white, borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setStep("cart")} style={{ width: "100%", padding: 16, background: C.dark, color: C.white, border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "space-between", ...FF }}>
                <span>🛒 {L.cart} ({count})</span><span>{total.toFixed(2)}€</span>
              </button>
            </div>
          )}
        </>
      )}

      {step === "cart" && (
        <div style={{ padding: "40px 20px 24px" }}>
          <button onClick={() => setStep("menu")} style={{ background: "none", border: "none", color: C.accent, fontWeight: 600, fontSize: 15, cursor: "pointer", padding: 0, marginBottom: 20, ...FF }}>{L.back}</button>
          <p style={{ fontSize: 28, fontWeight: 800, color: C.dark, letterSpacing: "-0.04em", marginBottom: 24 }}>🛒 {L.cart}</p>
          {cart.map((item, ci) => (
            <div key={ci} style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ fontSize: 26, marginTop: 2 }}>{item.emoji}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: C.dark }}>{item.name}</p>
                  {item._choices && Object.keys(item._choices).length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {Object.entries(item._choices).map(([grpName, opts]) => opts.length > 0 && (
                        <div key={grpName} style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.textTertiary }}>{grpName} :</span>
                          {opts.map(o => (
                            <span key={o.name} style={{ fontSize: 11, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "1px 8px", color: C.dark, fontWeight: 500 }}>{o.name}</span>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  <p style={{ color: C.textSecondary, fontSize: 13, marginTop: 4 }}>{Number(item.price).toFixed(2)}€/u</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => rem(item.id)} style={{ width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${C.border}`, background: C.white, fontWeight: 900, cursor: "pointer", fontSize: 16, ...FF }}>−</button>
                  <span style={{ fontWeight: 800, fontSize: 16, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                  {!item._composed && <button onClick={() => add(item)} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: C.dark, color: C.white, fontWeight: 900, cursor: "pointer", fontSize: 16, ...FF }}>+</button>}
                  {item._composed && <div style={{ width: 30 }} />}
                </div>
                <p style={{ fontWeight: 800, color: C.dark, minWidth: 52, textAlign: "right" }}>{(Number(item.price) * item.qty).toFixed(2)}€</p>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <label style={{ color: C.textSecondary, fontSize: 13, fontWeight: 500, display: "block", marginBottom: 8 }}>{L.note}</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={L.notePlaceholder} rows={3} style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "12px 14px", fontSize: 14, color: C.dark, resize: "none", outline: "none", ...FF }} />
          </div>
          {/* Promo code */}
          <div style={{ marginTop: 16, background: C.bg, borderRadius: 16, padding: "16px 18px" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 10 }}>🏷️ Code promo</p>
            {appliedPromo ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.accentGreen + "12", border: `1.5px solid ${C.accentGreen}30`, borderRadius: 12, padding: "12px 14px" }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 15, color: C.accentGreen }}>−{appliedPromo.discount_percent}% appliqué ✓</p>
                  {appliedPromo.label && <p style={{ fontSize: 12, color: C.accentGreen, opacity: 0.8 }}>{appliedPromo.label}</p>}
                  <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>Code : <strong>{appliedPromo.code}</strong> · Économie : {promoDiscount.toFixed(2)}€</p>
                </div>
                <button onClick={() => { setAppliedPromo(null); setPromoCodeInput(""); }} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.textTertiary, lineHeight: 1 }}>✕</button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={promoCodeInput}
                    onChange={e => { setPromoCodeInput(e.target.value.toUpperCase()); setPromoError(""); }}
                    onKeyDown={e => e.key === "Enter" && applyPromoCode()}
                    placeholder="VOTRECODE"
                    style={{ flex: 1, padding: "11px 14px", border: `1.5px solid ${promoError ? C.accent : C.border}`, borderRadius: 12, fontSize: 14, fontFamily: "monospace", fontWeight: 600, letterSpacing: "0.05em", outline: "none", ...FF }}
                  />
                  <button onClick={applyPromoCode} disabled={checkingPromo || !promoCodeInput.trim()}
                    style={{ padding: "11px 18px", background: promoCodeInput.trim() ? C.dark : C.border, color: C.white, border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: promoCodeInput.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap", ...FF }}>
                    {checkingPromo ? "…" : "Appliquer"}
                  </button>
                </div>
                {promoError && <p style={{ fontSize: 12, color: C.accent, marginTop: 6, fontWeight: 600 }}>⚠ {promoError}</p>}
              </>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "16px 0" }}>
            {appliedPromo && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: C.textSecondary }}>Sous-total</span>
                <span style={{ fontSize: 14, color: C.textSecondary }}>{rawTotal.toFixed(2)}€</span>
              </div>
            )}
            {appliedPromo && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: C.accentGreen, fontWeight: 600 }}>Réduction ({appliedPromo.discount_percent}%)</span>
                <span style={{ fontSize: 14, color: C.accentGreen, fontWeight: 700 }}>−{promoDiscount.toFixed(2)}€</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: appliedPromo ? `1px solid ${C.border}` : "none", paddingTop: appliedPromo ? 10 : 0 }}>
              <span style={{ fontWeight: 700, fontSize: 18, color: C.dark }}>{L.total}</span>
              <span style={{ fontWeight: 900, fontSize: 24, color: C.dark, letterSpacing: "-0.03em" }}>{total.toFixed(2)}€</span>
            </div>
          </div>
          <button onClick={() => total === 0 ? confirm("free") : setStep("profile")} style={{ width: "100%", padding: 16, background: C.dark, color: C.white, border: "none", borderRadius: 14, fontSize: 17, fontWeight: 700, cursor: "pointer", ...FF }}>
            {total === 0 ? "✓ Commander gratuitement" : L.payment}
          </button>
        </div>
      )}

      {step === "profile" && (
        <div style={{ padding: "40px 20px 100px", minHeight: "100vh", background: "#fff" }}>
          <button onClick={() => setStep("cart")} style={{ background: "none", border: "none", color: C.accent, fontWeight: 600, fontSize: 15, cursor: "pointer", padding: 0, marginBottom: 24, ...FF }}>← Retour</button>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎟️</div>
            <p style={{ fontSize: 24, fontWeight: 800, color: C.dark, letterSpacing: "-0.03em", marginBottom: 8 }}>Votre ticket numérique</p>
            <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6 }}>Recevez votre ticket de caisse par email et profitez des offres et avantages exclusifs du restaurant.</p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Prénom *</label>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Votre prénom" style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 16, outline: "none", ...FF }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Email *</label>
            <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="votre@email.fr" style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 16, outline: "none", ...FF }} />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Téléphone <span style={{ fontWeight: 400, color: C.textTertiary }}>(optionnel)</span></label>
            <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="06 XX XX XX XX" style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 16, outline: "none", ...FF }} />
          </div>
          <button
            onClick={() => { if (!customerEmail.trim()) return; total === 0 ? confirm("free") : setStep("payment"); }}
            disabled={!customerEmail.trim()}
            style={{ width: "100%", padding: "16px", background: customerEmail.trim() ? C.dark : C.textTertiary, color: "#fff", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: customerEmail.trim() ? "pointer" : "not-allowed", marginBottom: 12, ...FF }}>
            {total === 0 ? "✓ Confirmer la commande gratuite" : "Continuer vers le paiement →"}
          </button>
          <button onClick={() => { setProfileSkipped(true); total === 0 ? confirm("free") : setStep("payment"); }} style={{ width: "100%", padding: "12px", background: "none", color: C.textTertiary, border: "none", fontSize: 14, cursor: "pointer", ...FF }}>
            Passer cette étape
          </button>
          <p style={{ fontSize: 11, color: C.textTertiary, textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
            🔒 Vos données sont protégées et utilisées uniquement pour votre ticket et les offres du restaurant.
          </p>
        </div>
      )}

      {step === "payment" && total === 0 && !confirming && (() => { confirm("free"); return null; })()}

      {step === "payment" && (
        <div style={{ padding: "40px 20px 24px" }}>
          {confirming ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16 }}>
              <div style={{ width: 40, height: 40, border: `3px solid ${C.dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ring 0.8s linear infinite" }} />
              <p style={{ fontSize: 15, color: C.textSecondary, fontWeight: 500 }}>{L.confirming}</p>
            </div>
          ) : (
            <>
              <button onClick={() => payMode ? setPayMode(null) : setStep("cart")} style={{ background: "none", border: "none", color: C.accent, fontWeight: 600, fontSize: 15, cursor: "pointer", padding: 0, marginBottom: 20, ...FF }}>← Retour</button>
              <p style={{ fontSize: 28, fontWeight: 800, color: C.dark, letterSpacing: "-0.04em", marginBottom: 6 }}>{L.payTitle}</p>
              <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: restaurant?.id === "demo" ? 12 : 24 }}>{tableDisplay} · {restaurant?.name}</p>
              {restaurant?.id === "demo" && (
                <div style={{ background: "#FFF9E6", border: "1.5px solid #F5C542", borderRadius: 12, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🎭</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#92700A", margin: 0 }}>Mode démo — paiement fictif</p>
                    <p style={{ fontSize: 12, color: "#B8860B", margin: 0 }}>Aucun prélèvement ne sera effectué.</p>
                  </div>
                </div>
              )}
              {confirmError && (
                <div style={{ background: "#FFF0F3", border: `1.5px solid ${C.accent}30`, borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 14, color: C.accent, fontWeight: 500 }}>
                  ⚠️ {confirmError}
                </div>
              )}
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
                  {stripeEnabled && [{ icon: "💳", l: "Carte bancaire", s: "Visa, Mastercard, Amex" }, { icon: "📱", l: "Apple Pay / Google Pay", s: "Paiement instantané" }].map(m => (
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
                    <div style={{ flex: 1 }}><p style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{L.cashBtn}</p><p style={{ color: C.textSecondary, fontSize: 13 }}>{L.table}</p></div>
                    <span style={{ color: C.textTertiary, fontSize: 20 }}>›</span>
                  </div>
                </>
              ) : (
                <CardPaymentForm total={total} onSuccess={confirm} onCancel={() => setPayMode(null)} restaurant={restaurant} />
              )}
            </>
          )}
        </div>
      )}

      {step === "done" && (() => {
        const orderDate = new Date();
        const shortId = orderId ? orderId.slice(0, 8).toUpperCase() : "--------";
        const payLabel = { cash: "Espèces", card: "Carte bancaire", apple_pay: "Apple Pay", google_pay: "Google Pay" };
        const isPaid = payMode && payMode !== "cash";
        function downloadTicketPdf() {
          const headerInfo = [
            ticketInfo?.ticket_address,
            ticketInfo?.ticket_phone ? `Tél : ${ticketInfo.ticket_phone}` : "",
            ticketInfo?.ticket_tax_id,
          ].filter(Boolean).map(l => `<p style="margin:1px 0;color:#666;font-size:11px;">${l}</p>`).join("");
          const itemsHtml = cart.map(i => {
            const choicesHtml = i._choices ? Object.entries(i._choices).filter(([, v]) => v.length > 0).map(([k, v]) =>
              `<p style="margin:1px 0 0;font-size:10px;color:#888;">${k === "__extras__" ? "+ " : k + " : "}${v.map(o => o.name).join(", ")}</p>`).join("") : "";
            return `<tr><td style="padding:5px 0;border-bottom:1px dashed #ddd;font-size:12px;">${i.qty}× ${i.name}${choicesHtml}</td><td style="padding:5px 0;border-bottom:1px dashed #ddd;text-align:right;font-weight:700;font-size:12px;vertical-align:top;">${(Number(i.price) * i.qty).toFixed(2)} €</td></tr>`;
          }).join("");
          const statusHtml = isPaid
            ? `<div style="border:2px solid #34C759;border-radius:8px;padding:8px;text-align:center;margin:12px 0;"><span style="color:#34C759;font-weight:900;font-size:15px;letter-spacing:.05em;">✓ PAYÉ</span></div>`
            : `<div style="border:2px solid #FF9F0A;border-radius:8px;padding:8px;text-align:center;margin:12px 0;"><span style="color:#C77700;font-weight:900;font-size:15px;letter-spacing:.05em;">💵 À PAYER À LA CAISSE</span><br/><span style="color:#C77700;font-size:11px;font-weight:600;">Présentez ce ticket au comptoir</span></div>`;
          const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket #${shortId}</title>
<style>@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { margin: 8mm; size: 80mm auto; } }</style></head>
<body style="font-family:'Courier New',monospace;max-width:300px;margin:0 auto;padding:16px;color:#1d1d1f;">
<p style="text-align:center;font-weight:900;font-size:16px;margin:0 0 2px;">${restaurant?.name || ""}</p>
<div style="text-align:center;">${headerInfo}</div>
<p style="text-align:center;font-size:11px;color:#666;margin:6px 0;">Table ${tableNum} · ${orderDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })} ${orderDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
<p style="text-align:center;font-size:11px;margin:0 0 10px;">Commande <b style="font-size:13px;">#${shortId}</b>${customerName ? ` · ${customerName}` : ""}</p>
<table style="width:100%;border-collapse:collapse;border-top:1px dashed #999;">${itemsHtml}</table>
<table style="width:100%;margin-top:8px;"><tr><td style="font-weight:900;font-size:14px;">TOTAL</td><td style="text-align:right;font-weight:900;font-size:16px;">${total.toFixed(2)} €</td></tr></table>
<p style="font-size:11px;color:#666;margin:4px 0 0;">Paiement : ${payLabel[payMode] ?? "Espèces"}</p>
${statusHtml}
<p style="text-align:center;font-size:11px;font-style:italic;color:#666;margin-top:10px;">${ticketInfo?.ticket_footer || "Merci de votre visite ! 🙏"}</p>
<script>window.onload = function(){ window.print(); };</script></body></html>`;
          const w = window.open("", "_blank");
          if (w) { w.document.write(html); w.document.close(); }
        }
        return (
          <div style={{ padding: "40px 20px 60px", background: "#f8f8f8", minHeight: "100vh" }}>
            {/* Sound for the "order ready" alert also needs an explicit tap to
                unlock per browser autoplay rules — show until confirmed, and
                also ask for notification permission on the same tap (Safari/iOS
                require notification permission requests to come from a gesture). */}
            {orderStatus !== "READY" && !customerAudioUnlocked && (
              <div onClick={() => {
                  unlockOrderAudio();
                  if (typeof Notification === "undefined") return;
                  if (Notification.permission === "granted") { subscribeToOrderReadyPush(orderId); return; }
                  if (Notification.permission === "default") {
                    Notification.requestPermission().then(perm => { if (perm === "granted") subscribeToOrderReadyPush(orderId); }).catch(() => {});
                  }
                }}
                style={{ background: "#FF3B30", color: "#fff", textAlign: "center", padding: "14px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer", borderRadius: 14, marginBottom: 20 }}>
                🔔 Cliquez ici pour être alerté(e) quand votre commande est prête
              </div>
            )}
            {/* Success banner */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.accentGreen + "20", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 30 }}>✅</div>
              <p style={{ fontSize: 24, fontWeight: 900, color: C.dark, letterSpacing: "-0.03em", marginBottom: 6 }}>Commande envoyée !</p>
              <p style={{ color: C.textSecondary, fontSize: 14 }}>Votre commande est en cuisine · {tableDisplay}</p>
            </div>

            {/* ETA banner */}
            {(() => {
              if (["DONE", "done", "served", "CANCELED", "REFUNDED"].includes(orderStatus)) {
                return (
                  <div style={{ background: C.accentGreen + "15", border: `1.5px solid ${C.accentGreen}40`, borderRadius: 16, padding: "16px 20px", marginBottom: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>🙏</div>
                    <p style={{ fontSize: 18, fontWeight: 800, color: C.accentGreen, marginBottom: 2 }}>Merci pour votre commande !</p>
                    <p style={{ fontSize: 13, color: C.textSecondary }}>Bon appétit.</p>
                  </div>
                );
              }
              if (orderStatus === "READY" || orderStatus === "ready") {
                return (
                  <div onClick={() => orderId && silenceOrder(orderId)} style={{ background: C.accentGreen + "15", border: `1.5px solid ${C.accentGreen}40`, borderRadius: 16, padding: "16px 20px", marginBottom: 20, textAlign: "center", cursor: "pointer" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
                    <p style={{ fontSize: 18, fontWeight: 800, color: C.accentGreen, marginBottom: 2 }}>Votre commande est prête !</p>
                    <p style={{ fontSize: 13, color: C.textSecondary }}>Vous pouvez aller récupérer votre commande.</p>
                  </div>
                );
              }
              if (!estimatedReadyAt) return null;
              const eta = new Date(estimatedReadyAt);
              const now = new Date();
              const created = orderCreatedAt ? new Date(orderCreatedAt) : new Date(eta.getTime() - 15 * 60 * 1000);
              const diffMs = eta - now;
              const totalMs = Math.max(60 * 1000, eta - created);
              const elapsedMs = Math.max(0, now - created);
              const progressPct = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
              const isLate = diffMs < 0;
              const remainMin = Math.floor(Math.max(0, diffMs) / 60000);
              const remainSec = Math.floor((Math.max(0, diffMs) % 60000) / 1000);
              const etaStr = eta.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
              return (
                <div style={{ background: isLate ? C.accent + "12" : "#FFF8E7", border: `1.5px solid ${isLate ? C.accent + "40" : "#FFD60A40"}`, borderRadius: 16, padding: "18px 20px", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 26 }}>{isLate ? "⏰" : "🍳"}</div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.textSecondary }}>{isLate ? "Bientôt prête…" : "Préparation en cours"}</p>
                    </div>
                    {!isLate && (
                      <p style={{ fontSize: 22, fontWeight: 900, color: "#7A5C00", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                        {String(remainMin).padStart(2, "0")}:{String(remainSec).padStart(2, "0")}
                      </p>
                    )}
                  </div>
                  <div style={{ height: 10, background: "rgba(0,0,0,0.06)", borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{
                      width: `${progressPct}%`, height: "100%",
                      background: isLate ? C.accent : "linear-gradient(90deg, #FFD60A, #FF9F0A)",
                      borderRadius: 999, transition: "width 0.6s linear",
                    }} />
                  </div>
                  <p style={{ fontSize: 12, color: C.textSecondary, textAlign: "right" }}>
                    {isLate ? "Le restaurant finalise votre commande" : `Prête vers ${etaStr}`}
                  </p>
                </div>
              );
            })()}

            {/* Ticket */}
            <div id="ticket-receipt" style={{ background: C.white, borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", marginBottom: 20 }}>
              {/* Ticket header */}
              <div style={{ background: C.dark, padding: "20px 20px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  {restaurant?.logo_url
                    ? <img src={restaurant.logo_url} alt={restaurant.name} style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} />
                    : <span style={{ fontSize: 24 }}>{restaurant?.logo_emoji}</span>}
                  <p style={{ fontSize: 17, fontWeight: 800, color: C.white, letterSpacing: "-0.02em" }}>{restaurant?.name}</p>
                </div>
                {ticketInfo?.ticket_address && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", margin: "0 0 1px" }}>{ticketInfo.ticket_address}</p>}
                {ticketInfo?.ticket_phone && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", margin: "0 0 1px" }}>Tél : {ticketInfo.ticket_phone}</p>}
                {ticketInfo?.ticket_tax_id && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", margin: "0 0 4px" }}>{ticketInfo.ticket_tax_id}</p>}
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{tableDisplay} · {orderDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} à {orderDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>

              <div style={{ padding: "16px 20px" }}>
                {/* Order ID */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 14, borderBottom: `1px dashed ${C.border}` }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, letterSpacing: "0.08em" }}>N° COMMANDE</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: C.dark, fontFamily: "monospace" }}>#{shortId}</p>
                </div>

                {/* Customer info */}
                {(customerName || customerEmail) && (
                  <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: `1px dashed ${C.border}` }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, letterSpacing: "0.08em", marginBottom: 8 }}>CLIENT</p>
                    {customerName && <p style={{ fontSize: 14, fontWeight: 600, color: C.dark, marginBottom: 3 }}>{customerName}</p>}
                    {customerEmail && <p style={{ fontSize: 13, color: C.textSecondary }}>{customerEmail}</p>}
                  </div>
                )}

                {/* Items */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, letterSpacing: "0.08em", marginBottom: 10 }}>DÉTAIL</p>
                  {cart.map((i, ci) => (
                    <div key={ci} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px dashed ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1 }}>
                          <span style={{ fontSize: 18 }}>{i.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: C.dark, lineHeight: 1.2 }}>{i.name} <span style={{ fontWeight: 400, color: C.textTertiary }}>×{i.qty}</span></p>
                            {i._choices && Object.entries(i._choices).map(([grpName, opts]) => opts.length > 0 && (
                              <p key={grpName} style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                                <span style={{ fontWeight: 600 }}>{grpName} :</span> {opts.map(o => o.name).join(", ")}
                              </p>
                            ))}
                          </div>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, flexShrink: 0, marginLeft: 8 }}>{(Number(i.price) * i.qty).toFixed(2)}€</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div style={{ background: C.bg, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>Total</p>
                    <p style={{ fontSize: 20, fontWeight: 900, color: C.dark }}>{total.toFixed(2)}€</p>
                  </div>
                  <p style={{ fontSize: 12, color: C.textTertiary, marginTop: 4 }}>Paiement : {payLabel[payMode] ?? "Espèces"}</p>
                </div>

                {/* Payment status badge — tap to download PDF */}
                {isPaid ? (
                  <div onClick={downloadTicketPdf} style={{ border: `2px solid ${C.accentGreen}`, borderRadius: 12, padding: "10px 16px", marginBottom: 14, textAlign: "center", cursor: "pointer" }}>
                    <p style={{ fontSize: 16, fontWeight: 900, color: C.accentGreen, letterSpacing: "0.04em", margin: 0 }}>✓ PAYÉ</p>
                    <p style={{ fontSize: 11, color: C.accentGreen, margin: "3px 0 0", fontWeight: 600 }}>Touchez pour télécharger le ticket PDF</p>
                  </div>
                ) : (
                  <div onClick={downloadTicketPdf} style={{ border: "2px solid #FF9F0A", background: "#FF9F0A10", borderRadius: 12, padding: "10px 16px", marginBottom: 14, textAlign: "center", cursor: "pointer" }}>
                    <p style={{ fontSize: 16, fontWeight: 900, color: "#C77700", letterSpacing: "0.04em", margin: 0 }}>💵 À PAYER À LA CAISSE</p>
                    <p style={{ fontSize: 12, color: "#C77700", margin: "3px 0 0", fontWeight: 600 }}>Présentez ce ticket au comptoir · Touchez pour le PDF</p>
                  </div>
                )}

                {/* Footer */}
                <p style={{ fontSize: 13, color: C.textTertiary, textAlign: "center", fontStyle: "italic" }}>{ticketInfo?.ticket_footer || "Merci de votre visite ! 🙏"}</p>
              </div>

              {/* Decorative zigzag bottom */}
              <div style={{ height: 12, background: `repeating-linear-gradient(90deg, #f8f8f8 0px, #f8f8f8 8px, ${C.white} 8px, ${C.white} 16px)` }} />
            </div>

            {/* Download PDF */}
            <button onClick={downloadTicketPdf} style={{ width: "100%", padding: 15, background: C.dark, color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 16, ...FF }}>
              📄 Télécharger le ticket (PDF)
            </button>

            {/* Rating */}
            <div style={{ background: C.white, borderRadius: 16, padding: "18px 20px", marginBottom: 16, textAlign: "center" }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: C.dark, marginBottom: 12 }}>Comment s'est passée votre expérience ?</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                {[1,2,3,4,5].map(s => <button key={s} onClick={() => setRating(s)} style={{ fontSize: 30, background: "none", border: "none", cursor: "pointer", transform: rating >= s ? "scale(1.2)" : "scale(1)", transition: "transform 0.15s", filter: rating >= s ? "none" : "grayscale(1)" }}>⭐</button>)}
              </div>
              {rating > 0 && <p style={{ color: C.accentGreen, fontWeight: 600, fontSize: 14 }}>Merci pour votre avis ! 🙏</p>}
            </div>

            {/* Google Review CTA */}
            {googleReviewUrl && (
              <div style={{ background: C.white, borderRadius: 16, padding: "20px", marginBottom: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <p style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>Laissez-nous un avis Google</p>
                  </div>
                  <p style={{ fontSize: 13, color: C.textSecondary, textAlign: "center", margin: 0 }}>Votre avis aide d'autres clients à nous découvrir. Ça prend 30 secondes ! 🙏</p>
                  <a href={googleReviewUrl} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "13px 20px", background: "#4285F4", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", textDecoration: "none", justifyContent: "center", fontFamily: "'Figtree', -apple-system, sans-serif" }}>
                    ⭐ Laisser un avis sur Google
                  </a>
                </div>
              </div>
            )}

            <button onClick={() => { clearPendingOrder(); setOrderId(null); setOrderCreatedAt(null); setEstimatedReadyAt(null); setOrderStatus("PENDING"); setStep("menu"); setCart([]); setNote(""); setRating(0); setCustomerName(""); setCustomerEmail(""); setCustomerPhone(""); setProfileSkipped(false); setPayMode(null); }} style={{ width: "100%", padding: 16, background: C.white, color: C.dark, border: `1.5px solid ${C.border}`, borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", ...FF }}>Commander autre chose</button>
          </div>
        );
      })()}

      {/* Allergen chat — visible on menu and cart steps */}
      {(step === "menu" || step === "cart" || step === "payment" || step === "profile") && (
        <CustomerChat
          open={chatOpen}
          onOpen={() => setChatOpen(true)}
          onClose={() => setChatOpen(false)}
          msgs={chatMsgs}
          onSend={sendChat}
          input={chatInput}
          onInput={e => setChatInput(e.target.value)}
          loading={chatLoading}
        />
      )}

      {/* Garnitures composition tunnel */}
      {composeModal && (() => {
        const { item, step, choices } = composeModal;
        const groups = (item.supplements || []).filter(g => g.options?.length > 0);
        const itemExtras = (item.extras || []).filter(e => e.name?.trim());
        const hasExtras = itemExtras.length > 0;
        const totalSteps = groups.length + (hasExtras ? 1 : 0);
        const isExtrasStep = hasExtras && step === groups.length;
        const grp = !isExtrasStep ? groups[step] : null;
        if (!grp && !isExtrasStep) return null;
        const selected = grp ? (choices[grp.groupName] || []) : (choices["__extras__"] || []);
        const canNext = isExtrasStep ? true : (!grp.required || selected.length > 0);
        const isLast = step === totalSteps - 1;
        function toggleOpt(opt) {
          if (isExtrasStep) {
            const already = selected.some(s => s.name === opt.name);
            const next = already ? selected.filter(s => s.name !== opt.name) : [...selected, { name: opt.name, price: parseFloat(opt.price) || 0 }];
            setComposeModal(p => ({ ...p, choices: { ...p.choices, "__extras__": next } }));
          } else {
            const already = selected.some(s => s.name === opt.name);
            let next;
            if (already) { next = selected.filter(s => s.name !== opt.name); }
            else if (selected.length < (grp.maxChoices || 1)) { next = [...selected, { name: opt.name, price: parseFloat(opt.price) || 0 }]; }
            else if (grp.maxChoices === 1) { next = [{ name: opt.name, price: parseFloat(opt.price) || 0 }]; }
            else { next = selected; }
            setComposeModal(p => ({ ...p, choices: { ...p.choices, [grp.groupName]: next } }));
          }
        }
        function nextStep() {
          if (!canNext) return;
          if (isLast) {
            const allChoices = isExtrasStep
              ? { ...choices, "__extras__": selected }
              : { ...choices, [grp.groupName]: selected };
            const extraPrice = Object.entries(allChoices)
              .filter(([k]) => k !== "__extras__")
              .flatMap(([, v]) => v)
              .reduce((s, o) => s + (o.price || 0), 0)
              + (allChoices["__extras__"] || []).reduce((s, o) => s + (o.price || 0), 0);
            const cartItem = { ...item, _composed: true, _choices: allChoices, price: item.price + extraPrice, qty: 1 };
            setCart(p => [...p, cartItem]);
            setComposeModal(null);
          } else {
            if (!isExtrasStep) {
              setComposeModal(p => ({ ...p, step: p.step + 1, choices: { ...p.choices, [grp.groupName]: selected } }));
            } else {
              setComposeModal(p => ({ ...p, step: p.step + 1 }));
            }
          }
        }
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ background: C.white, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 520, maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ padding: "20px 20px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, letterSpacing: "0.08em", marginBottom: 4 }}>
                      {L.compose} {step + 1} {L.of} {totalSteps} · {item.emoji} {item.name}
                    </p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: C.dark }}>{isExtrasStep ? L.extrasTitle : grp.groupName}</p>
                    <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
                      {isExtrasStep ? L.extrasDesc : (grp.required ? L.required : L.optional) + " · " + (grp.maxChoices === 1 ? L.maxChoice : L.maxChoices.replace("%n", grp.maxChoices))}
                    </p>
                  </div>
                  <button onClick={() => setComposeModal(null)} style={{ background: C.bg, border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: 18, cursor: "pointer", color: C.textSecondary }}>×</button>
                </div>
                {/* Progress bar */}
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= step ? C.dark : C.border, transition: "background 0.2s" }} />
                  ))}
                </div>
              </div>
              {/* Options */}
              <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
                {(isExtrasStep ? itemExtras : grp.options).map((opt, oi) => {
                  const isSelected = selected.some(s => s.name === opt.name);
                  return (
                    <div key={oi} onClick={() => toggleOpt(opt)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 14, marginBottom: 8, background: isSelected ? C.dark : C.bg, border: `1.5px solid ${isSelected ? C.dark : C.border}`, cursor: "pointer", transition: "all 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSelected ? C.white : C.border}`, background: isSelected ? C.white : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {isSelected && <div style={{ width: 10, height: 10, borderRadius: 3, background: C.dark }} />}
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 600, color: isSelected ? C.white : C.dark }}>{opt.name}</span>
                      </div>
                      {parseFloat(opt.price) > 0 && (
                        <span style={{ fontSize: 14, fontWeight: 700, color: isSelected ? C.white : C.textSecondary }}>+{Number(opt.price).toFixed(2)}€</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Footer */}
              <div style={{ padding: "16px 20px 32px" }}>
                {step > 0 && (
                  <button onClick={() => setComposeModal(p => ({ ...p, step: p.step - 1 }))}
                    style={{ background: "none", border: "none", color: C.textSecondary, fontSize: 14, cursor: "pointer", marginBottom: 8, padding: 0, ...FF }}>
                    {L.prev}
                  </button>
                )}
                <button onClick={nextStep} disabled={!canNext}
                  style={{ width: "100%", padding: 16, background: canNext ? C.dark : C.border, color: C.white, border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: canNext ? "pointer" : "not-allowed", transition: "background 0.2s", ...FF }}>
                  {isLast ? L.addCart : L.next}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI CHART — SVG bar chart (no external deps)
// ─────────────────────────────────────────────────────────────────────────────
function MiniChart({ data, color = C.accentBlue, height = 80 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 100 / data.length;
  return (
    <svg width="100%" height={height} style={{ display: "block" }}>
      {data.map((d, i) => (
        <rect key={i}
          x={`${i * w + 0.5}%`} width={`${w - 1}%`}
          y={height - (d.value / max) * (height - 4)}
          height={(d.value / max) * (height - 4)}
          fill={color} rx={3} opacity={0.8}
        />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHART PRIMITIVES — pixel-accurate, ResizeObserver-driven, no viewBox tricks
// ─────────────────────────────────────────────────────────────────────────────
function useContainerWidth(ref, fallback = 560) {
  const [w, setW] = useState(fallback);
  useEffect(() => {
    if (!ref.current) return;
    setW(ref.current.getBoundingClientRect().width || fallback);
    const ro = new ResizeObserver(entries => setW(entries[0].contentRect.width || fallback));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return w;
}

function fmtVal(v, unit) {
  if (unit === "€") {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1).replace(".0", "")}k €`;
    return `${v.toFixed(2)} €`;
  }
  if (unit === "%") return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1).replace(".0", "")}k`;
  return String(Math.round(v));
}

function niceRange(min, max) {
  const raw = max - min || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  const step = nice * mag / 5;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 1e9) / 1e9);
  return ticks;
}

function smoothPath(coords) {
  if (coords.length < 2) return "";
  let d = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 1; i < coords.length; i++) {
    const cpx = (coords[i - 1].x + coords[i].x) / 2;
    d += ` C ${cpx.toFixed(1)},${coords[i - 1].y.toFixed(1)} ${cpx.toFixed(1)},${coords[i].y.toFixed(1)} ${coords[i].x.toFixed(1)},${coords[i].y.toFixed(1)}`;
  }
  return d;
}

function LineChart({ data, color = C.accentBlue, height = 200, unit = "", multiSeries }) {
  const ref = useRef(null);
  const width = useContainerWidth(ref);
  const [hoverIdx, setHoverIdx] = useState(null);

  const PAD = { t: 20, r: 16, b: 40, l: 62 };
  const W = Math.max(width - PAD.l - PAD.r, 10);
  const H = Math.max(height - PAD.t - PAD.b, 10);

  const series = multiSeries || [{ data, color, label: "" }];
  const allVals = series.flatMap(s => s.data.map(d => d.value));
  const ticks = niceRange(Math.min(...allVals, unit === "%" ? -5 : 0), Math.max(...allVals, 1));
  const lo = ticks[0], hi = ticks[ticks.length - 1], range = hi - lo || 1;
  const n = series[0].data.length;

  const xOf = i => PAD.l + (i / Math.max(n - 1, 1)) * W;
  const yOf = v => PAD.t + (1 - (v - lo) / range) * H;

  const xStep = Math.ceil(n / 7);

  function handleMove(e) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = e.clientX - rect.left - PAD.l;
    const idx = Math.max(0, Math.min(n - 1, Math.round((px / W) * (n - 1))));
    setHoverIdx(idx);
  }

  const tipX = hoverIdx !== null ? xOf(hoverIdx) : 0;
  const tipLeft = hoverIdx !== null ? Math.min(tipX + 14, width - 170) : 0;

  return (
    <div ref={ref} style={{ position: "relative", userSelect: "none" }}
      onMouseMove={handleMove} onMouseLeave={() => setHoverIdx(null)}>
      <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
        {/* Y grid + labels */}
        {ticks.map((v, i) => {
          const y = yOf(v);
          return (
            <g key={i}>
              <line x1={PAD.l} x2={PAD.l + W} y1={y} y2={y}
                stroke={v === 0 ? "#C7C7CC" : "#F2F2F7"} strokeWidth={v === 0 ? 1.5 : 1} />
              <text x={PAD.l - 8} y={y} textAnchor="end" dominantBaseline="middle"
                style={{ fontSize: 11, fill: "#8E8E93", fontFamily: "system-ui, -apple-system" }}>
                {fmtVal(v, unit)}
              </text>
            </g>
          );
        })}
        {/* Area fills */}
        {series.map((s, si) => {
          const pts = s.data.map((d, i) => ({ x: xOf(i), y: yOf(d.value) }));
          const base = yOf(Math.max(lo, 0));
          const area = smoothPath(pts) + ` L ${xOf(n - 1).toFixed(1)},${base.toFixed(1)} L ${xOf(0).toFixed(1)},${base.toFixed(1)} Z`;
          return <path key={si} d={area} fill={s.color} opacity={0.1 - si * 0.02} />;
        })}
        {/* Lines */}
        {series.map((s, si) => {
          const pts = s.data.map((d, i) => ({ x: xOf(i), y: yOf(d.value) }));
          return <path key={si} d={smoothPath(pts)} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" />;
        })}
        {/* X labels */}
        {series[0].data.map((d, i) => {
          if (i % xStep !== 0 && i !== n - 1) return null;
          return (
            <text key={i} x={xOf(i)} y={height - 8} textAnchor="middle"
              style={{ fontSize: 11, fill: "#8E8E93", fontFamily: "system-ui, -apple-system" }}>
              {d.label}
            </text>
          );
        })}
        {/* Hover */}
        {hoverIdx !== null && (
          <>
            <line x1={tipX} x2={tipX} y1={PAD.t} y2={PAD.t + H}
              stroke="#C7C7CC" strokeWidth={1.5} strokeDasharray="4,3" />
            {series.map((s, si) => {
              const val = s.data[hoverIdx]?.value ?? 0;
              return <circle key={si} cx={tipX} cy={yOf(val)} r={5} fill={s.color} stroke="white" strokeWidth={2.5} />;
            })}
          </>
        )}
      </svg>
      {/* Tooltip */}
      {hoverIdx !== null && (
        <div style={{ position: "absolute", top: 0, left: tipLeft, background: "#1C1C1E", color: "#fff", borderRadius: 12, padding: "10px 14px", fontSize: 12, pointerEvents: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.28)", zIndex: 20, minWidth: 130, ...FF }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8, fontWeight: 500 }}>
            {series[0].data[hoverIdx]?.label}
          </div>
          {series.map((s, si) => (
            <div key={si} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: si < series.length - 1 ? 5 : 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              {series.length > 1 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", flex: 1 }}>{s.label}</span>}
              <span style={{ fontWeight: 800, fontSize: 13 }}>{fmtVal(s.data[hoverIdx]?.value ?? 0, unit)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BarChart({ data, color = C.accentBlue, height = 160, unit = "" }) {
  const ref = useRef(null);
  const width = useContainerWidth(ref);
  const [hoverIdx, setHoverIdx] = useState(null);

  const PAD = { t: 20, r: 16, b: 36, l: 54 };
  const W = Math.max(width - PAD.l - PAD.r, 10);
  const H = Math.max(height - PAD.t - PAD.b, 10);

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const ticks = niceRange(0, maxVal);
  const hi = ticks[ticks.length - 1] || 1;
  const barW = W / data.length;
  const GAP = Math.max(barW * 0.28, 4);
  const bw = barW - GAP;

  return (
    <div ref={ref} style={{ position: "relative", userSelect: "none" }}>
      <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
        {/* Y grid */}
        {ticks.map((v, i) => {
          const y = PAD.t + (1 - v / hi) * H;
          return (
            <g key={i}>
              <line x1={PAD.l} x2={PAD.l + W} y1={y} y2={y} stroke="#F2F2F7" strokeWidth={1} />
              {i % 2 === 0 && (
                <text x={PAD.l - 8} y={y} textAnchor="end" dominantBaseline="middle"
                  style={{ fontSize: 11, fill: "#8E8E93", fontFamily: "system-ui" }}>
                  {fmtVal(v, unit)}
                </text>
              )}
            </g>
          );
        })}
        {/* Bars */}
        {data.map((d, i) => {
          const x = PAD.l + i * barW + GAP / 2;
          const bh = Math.max((d.value / hi) * H, 2);
          const y = PAD.t + H - bh;
          const isH = hoverIdx === i;
          return (
            <g key={i} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} style={{ cursor: "default" }}>
              <rect x={x} y={y} width={bw} height={bh} fill={color} opacity={isH ? 1 : 0.72} rx={4} />
              {isH && (
                <text x={x + bw / 2} y={y - 6} textAnchor="middle"
                  style={{ fontSize: 11, fill: color, fontWeight: 700, fontFamily: "system-ui" }}>
                  {fmtVal(d.value, unit)}
                </text>
              )}
              <text x={x + bw / 2} y={height - 5} textAnchor="middle"
                style={{ fontSize: 10, fill: "#8E8E93", fontFamily: "system-ui" }}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHART MODAL — fullscreen chart expansion
// ─────────────────────────────────────────────────────────────────────────────
function ChartModal({ title, subtitle, kpis, children, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", ...FF }}
      onClick={onClose}>
      <div style={{ background: C.white, borderRadius: 24, width: "100%", maxWidth: 1000, maxHeight: "92vh", overflow: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: "22px 28px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: C.dark, letterSpacing: "-0.03em" }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: `1.5px solid ${C.border}`, background: "transparent", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSecondary }}>×</button>
        </div>
        {kpis && (
          <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}` }}>
            {kpis.map((k, i) => (
              <div key={i} style={{ flex: 1, padding: "16px 24px", borderRight: i < kpis.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.dark, letterSpacing: "-0.03em" }}>{k.value}</div>
                {k.trend && <div style={{ fontSize: 12, color: k.trendColor || C.accentGreen, fontWeight: 600, marginTop: 3 }}>{k.trend}</div>}
              </div>
            ))}
          </div>
        )}
        <div style={{ padding: "28px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FRANCHISE DASHBOARD — multi-restaurant group view
// ─────────────────────────────────────────────────────────────────────────────
function FranchiseDashboard({ user, group, onBack, onRestaurant, onHome, onGroupUpdate }) {
  const isMobile = useIsMobile();
  const store = useContext(StoreCtx);
  const isDemo = user.id === "demo";
  const [tab, setTab] = useState("overview");
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState("ca_7j");
  const [sortDir, setSortDir] = useState("desc");
  // Campaign form
  const [campSubject, setCampSubject] = useState("");
  const [campBody, setCampBody] = useState("");
  const [campSegment, setCampSegment] = useState("all");
  const [campTarget, setCampTarget] = useState("all");
  const [campSelected, setCampSelected] = useState([]);
  const [campSendToClients, setCampSendToClients] = useState(true);
  const [campSendToEstabs, setCampSendToEstabs] = useState(false);
  const [campSending, setCampSending] = useState(false);
  const [campGenLoading, setCampGenLoading] = useState(false);
  // Modals
  const [editResto, setEditResto] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", logo_emoji: "🍽️", region: "", manager_email: "" });
  const [deleteResto, setDeleteResto] = useState(null);
  const [deleteRestoInput, setDeleteRestoInput] = useState("");
  const [deletingResto, setDeletingResto] = useState(false);
  const [showCreateResto, setShowCreateResto] = useState(false);
  const [createRestoForm, setCreateRestoForm] = useState({ name: "", logo_emoji: "🍽️", address: "", tables_count: 8 });
  const [creatingResto, setCreatingResto] = useState(false);
  const [staffResto, setStaffResto] = useState(null); // restaurant being managed for staff
  const [staffList, setStaffList] = useState([]); // staff of current staffResto
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState("manager");
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffAdding, setStaffAdding] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "manager" });
  const [inviting, setInviting] = useState(false);
  // Group settings
  const [groupForm, setGroupForm] = useState({ name: group?.name || "", logo_emoji: group?.logo_emoji || "🏢", logo_url: group?.logo_url || "" });
  const [savingGroup, setSavingGroup] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  // Analytics expand
  const [expandChart, setExpandChart] = useState(null);
  // AI alert explanation
  const [alertExplain, setAlertExplain] = useState(null); // { restaurant, stat }

  useEffect(() => {
    if (!group) return;
    if (isDemo) {
      setRestaurants(DEMO_FRANCHISE_RESTAURANTS);
      setStats(DEMO_FRANCHISE_STATS);
      setCampaigns([
        { id: "c1", subject: "Offre spéciale été", segment: "top_clients", status: "sent", sent_at: new Date(Date.now() - 86400000 * 3).toISOString(), created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
        { id: "c2", subject: "Nouveautés menu automne", segment: "all", status: "draft", sent_at: null, created_at: new Date(Date.now() - 86400000).toISOString() },
      ]);
      setMembers([
        { id: "m1", email: "owner@demo.fr", role: "owner", regions: [] },
        { id: "m2", email: "directeur@demo.fr", role: "director", regions: ["Île-de-France", "PACA"] },
        { id: "m3", email: "regional@demo.fr", role: "regional", regions: ["Auvergne-Rhône"] },
      ]);
      setLoading(false);
      return;
    }
    // Refresh group from Supabase silently — only update parent state, NOT the form (would overwrite user's edits)
    supabase.from("franchise_groups").select("*").eq("id", group.id).maybeSingle().then(({ data }) => {
      if (data && onGroupUpdate) onGroupUpdate(data);
    });
    Promise.all([
      supabase.from("restaurants").select("*").eq("owner_id", user.id).order("name"),
      supabase.from("group_campaigns").select("*").eq("group_id", group.id).order("created_at", { ascending: false }),
      supabase.from("group_members").select("*").eq("group_id", group.id),
    ]).then(([restoRes, campRes, memRes]) => {
      const restos = restoRes.data ?? [];
      setRestaurants(restos);
      setCampaigns(campRes.data ?? []);
      setMembers(memRes.data ?? []);
      if (restos.length > 0) {
        const ids = restos.map(r => r.id);
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const today = new Date(); today.setHours(0, 0, 0, 0);
        supabase.from("orders").select("restaurant_id, total, created_at")
          .in("restaurant_id", ids).eq("status", "DONE").gte("created_at", sevenDaysAgo)
          .then(({ data: orders }) => {
            const computed = restos.map(r => {
              const rOrders = (orders || []).filter(o => o.restaurant_id === r.id);
              const todayOrders = rOrders.filter(o => new Date(o.created_at) >= today);
              const ca7j = rOrders.reduce((s, o) => s + Number(o.total || 0), 0);
              const caToday = todayOrders.reduce((s, o) => s + Number(o.total || 0), 0);
              return {
                restaurant_id: r.id,
                ca_today: caToday, ca_7j: ca7j,
                orders_today: todayOrders.length, orders_7j: rOrders.length,
                avg_basket: rOrders.length > 0 ? ca7j / rOrders.length : 0,
                growth: 0,
              };
            });
            setStats(computed);
          });
      }
      setLoading(false);
    });
  }, [group, isDemo]);

  function getStat(restoId) {
    return stats.find(s => s.restaurant_id === restoId) || { ca_today: 0, ca_7j: 0, orders_today: 0, orders_7j: 0, avg_basket: 0, growth: 0 };
  }

  const totalCaToday = stats.reduce((s, r) => s + r.ca_today, 0);
  const totalCa7j = stats.reduce((s, r) => s + r.ca_7j, 0);
  const totalOrdersToday = stats.reduce((s, r) => s + r.orders_today, 0);
  const avgBasket = stats.length > 0 ? stats.reduce((s, r) => s + r.avg_basket, 0) / stats.length : 0;
  const alerts = stats.filter(s => s.growth < -10);

  const sortedRestos = [...restaurants].sort((a, b) => {
    const sa = getStat(a.id), sb = getStat(b.id);
    const va = sa[sortCol] ?? 0, vb = sb[sortCol] ?? 0;
    if (sortCol === "name") { return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name); }
    return sortDir === "asc" ? va - vb : vb - va;
  });

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  }

  async function saveCampaign(send = false) {
    if (!campSubject.trim() || !campBody.trim()) return;
    setCampSending(true);
    const targets = campTarget === "all" ? restaurants.map(r => r.id) : campSelected;
    const recipients = [];
    if (campSendToClients) recipients.push(`clients:${campSegment}`);
    if (campSendToEstabs) recipients.push(`establishments:${campTarget}`);
    if (!isDemo) {
      const { data: newCamp } = await supabase.from("group_campaigns").insert({
        group_id: group.id, created_by: user.id,
        subject: campSubject, html_body: campBody,
        segment: campSegment, target: campTarget,
        restaurant_ids: targets,
        send_to_clients: campSendToClients,
        send_to_establishments: campSendToEstabs,
        status: send ? "sent" : "draft",
        sent_at: send ? new Date().toISOString() : null,
      }).select().single();
      if (send && newCamp) {
        for (const rId of targets) {
          await supabase.functions.invoke("send-campaign", { body: { campaign_id: newCamp.id, restaurant_id: rId, send_to_clients: campSendToClients, send_to_establishments: campSendToEstabs } }).catch(() => {});
        }
      }
    }
    setCampaigns(prev => [{
      id: "new_" + Date.now(), subject: campSubject, segment: campSegment,
      send_to_clients: campSendToClients, send_to_establishments: campSendToEstabs,
      recipients,
      status: send ? "sent" : "draft", sent_at: send ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
    }, ...prev]);
    setCampSubject(""); setCampBody(""); setCampSending(false);
  }

  async function generateAI() {
    setCampGenLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setCampBody(`<h2>🎉 Offre exclusive pour nos clients fidèles !</h2>
<p>Cher(e) client(e),</p>
<p>Nous avons le plaisir de vous annoncer une <strong>offre spéciale</strong> dans nos établissements du réseau <em>${group.name}</em>.</p>
<p>🍽️ Profitez de <strong>-20% sur votre prochain repas</strong> en mentionnant ce message.</p>
<p>À très bientôt,<br/>L'équipe ${group.name}</p>`);
    setCampGenLoading(false);
  }

  async function uploadGroupLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    if (isDemo) {
      const url = URL.createObjectURL(file);
      setGroupForm(p => ({ ...p, logo_url: url }));
      setUploadingLogo(false);
      return;
    }
    const ext = file.name.split(".").pop();
    const path = `group-logos/${group.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from("assets").upload(path, file, { upsert: true });
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from("assets").getPublicUrl(path);
      setGroupForm(p => ({ ...p, logo_url: publicUrl }));
    }
    setUploadingLogo(false);
  }

  async function saveGroupSettings() {
    setSavingGroup(true);
    const payload = { name: groupForm.name, logo_emoji: groupForm.logo_emoji, logo_url: groupForm.logo_url };
    if (isDemo) {
      const updated = { ...group, ...payload };
      if (onGroupUpdate) onGroupUpdate(updated);
      setSavingGroup(false);
      return;
    }
    const { data: saved, error } = await supabase.from("franchise_groups")
      .update(payload).eq("id", group.id).select().single();
    if (error) {
      store.pushNotif("Erreur : " + error.message, "warning");
      setSavingGroup(false);
      return;
    }
    const updated = saved || { ...group, ...payload };
    if (onGroupUpdate) onGroupUpdate(updated);
    store.pushNotif("✅ Groupe mis à jour", "success");
    setSavingGroup(false);
  }

  async function inviteMember() {
    if (!inviteForm.email.trim()) return;
    setInviting(true);
    if (!isDemo) {
      await supabase.from("group_members").insert({ group_id: group.id, email: inviteForm.email, role: inviteForm.role, user_id: null }).catch(() => {});
    }
    setMembers(prev => [...prev, { id: "m_" + Date.now(), email: inviteForm.email, role: inviteForm.role, regions: [] }]);
    setInviteForm({ email: "", role: "manager" });
    setShowInvite(false);
    setInviting(false);
  }

  async function saveEditResto() {
    if (!editResto) return;
    if (!isDemo) {
      await supabase.from("restaurants").update({ name: editForm.name, logo_emoji: editForm.logo_emoji, region: editForm.region, manager_email: editForm.manager_email }).eq("id", editResto.id);
    }
    setRestaurants(prev => prev.map(r => r.id === editResto.id ? { ...r, ...editForm } : r));
    setEditResto(null);
  }

  async function confirmDeleteResto() {
    if (!deleteResto) return;
    if (deleteRestoInput.trim().toLowerCase() !== "supprimer") return;
    setDeletingResto(true);
    if (!isDemo) {
      await supabase.from("restaurants").delete().eq("id", deleteResto.id);
    }
    setRestaurants(prev => prev.filter(r => r.id !== deleteResto.id));
    setDeleteResto(null); setDeleteRestoInput(""); setDeletingResto(false);
  }

  async function createResto(e) {
    e.preventDefault();
    if (restaurants.length >= 5) return;
    setCreatingResto(true);
    if (!isDemo) {
      const slug = createRestoForm.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
      const { data } = await supabase.from("restaurants").insert({ ...createRestoForm, owner_id: user.id, group_id: group.id, slug, tables_count: Number(createRestoForm.tables_count) }).select().single();
      if (data) setRestaurants(prev => [...prev, data]);
    } else {
      setRestaurants(prev => [...prev, { id: `demo-new-${Date.now()}`, ...createRestoForm, region: "", manager_email: "" }]);
    }
    setShowCreateResto(false);
    setCreateRestoForm({ name: "", logo_emoji: "🍽️", address: "", tables_count: 8 });
    setCreatingResto(false);
  }

  async function openStaffModal(r) {
    setStaffResto(r);
    setStaffEmail(""); setStaffRole("manager");
    setStaffLoading(true);
    if (!isDemo) {
      const { data } = await supabase.from("restaurant_staff").select("*").eq("restaurant_id", r.id).order("invited_at");
      setStaffList(data ?? []);
    } else {
      setStaffList([{ id: "s1", email: "chef@baoma.fr", role: "manager", invited_at: new Date().toISOString() }]);
    }
    setStaffLoading(false);
  }

  async function addStaff(e) {
    e.preventDefault();
    if (!staffEmail.trim()) return;
    setStaffAdding(true);
    if (!isDemo) {
      const { data, error } = await supabase.from("restaurant_staff")
        .insert({ restaurant_id: staffResto.id, email: staffEmail.trim().toLowerCase(), role: staffRole })
        .select().single();
      if (data) setStaffList(p => [...p, data]);
    } else {
      setStaffList(p => [...p, { id: Date.now(), email: staffEmail, role: staffRole, invited_at: new Date().toISOString() }]);
    }
    setStaffEmail("");
    setStaffAdding(false);
  }

  async function removeStaff(id) {
    if (!isDemo) await supabase.from("restaurant_staff").delete().eq("id", id);
    setStaffList(p => p.filter(s => s.id !== id));
  }

  function generateAlertExplanation(r, s) {
    const lines = [];
    const drop = Math.abs(s.growth);
    lines.push(`**${r.logo_emoji} ${r.name}** affiche une baisse de **${drop}%** du chiffre d'affaires sur 7 jours.`);
    lines.push("");
    if (s.avg_basket < 12) lines.push(`🔸 **Panier moyen bas (${s.avg_basket.toFixed(2)} €)** : les clients commandent peu ou optent pour les articles les moins chers. Envisagez des offres combinées ou des suggestions de compléments.`);
    if (s.orders_7j < 20) lines.push(`🔸 **Volume de commandes faible (${s.orders_7j} cmds / 7j)** : le trafic entrant est insuffisant. Une campagne de relance ciblée ou une promotion de lancement de semaine pourrait aider.`);
    if (drop > 20) lines.push(`🔸 **Baisse sévère (>${drop}%)** : une chute aussi marquée suggère un événement ponctuel — fermeture imprévue, problème de qualité signalé, ou forte concurrence locale. Vérifiez les avis clients récents.`);
    if (drop > 10 && drop <= 20) lines.push(`🔸 **Baisse modérée** : tendance qui s'installe sur la semaine. Comparez les plages horaires : la baisse est-elle concentrée le soir ou le midi ?`);
    if (s.avg_basket >= 15 && s.orders_7j < 30) lines.push(`🔸 **Panier solide mais trafic en berne** : vos clients habituels restent fidèles mais vous perdez de nouveaux visiteurs. Activez une campagne d'acquisition (QR codes, réseaux sociaux).`);
    lines.push("");
    lines.push("**Recommandations immédiates :**");
    lines.push("1. Lancer une campagne SMS/email ciblée sur ce restaurant (onglet Campagnes)");
    lines.push("2. Vérifier le temps de préparation moyen — un ralentissement cuisine impacte la satisfaction");
    lines.push("3. Analyser les avis des 7 derniers jours pour détecter un problème récurrent");
    return lines.join("\n");
  }

  function exportCSV() {
    const rows = [["Restaurant", "CA 7j (€)", "Commandes 7j", "Panier moyen (€)", "Évolution (%)"]];
    sortedRestos.forEach((r, i) => {
      const s = getStat(r.id);
      rows.push([r.name, s.ca_7j.toFixed(2), s.orders_7j, s.avg_basket.toFixed(2), s.growth]);
    });
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "comparatif_reseau.csv"; a.click();
  }

  // Analytics data: 30-day bar chart (demo: random)
  // Deterministic pseudo-random (no re-render flicker)
  function seededVal(seed, min, max) {
    const x = Math.sin(seed + 1) * 10000;
    return min + (x - Math.floor(x)) * (max - min);
  }

  const chartData30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const base = isDemo ? totalCa7j / 7 : 0;
    const value = isDemo ? Math.round(base * (isWeekend ? 1.3 : 0.85) * (0.8 + seededVal(i * 7, 0, 0.4))) : 0;
    return { label, value };
  });
  const chartOrders30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const value = isDemo ? Math.round(totalOrdersToday * (isWeekend ? 1.25 : 0.9) * (0.75 + seededVal(i * 11, 0, 0.5))) : 0;
    return { label, value };
  });
  const chartAvgBasket30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    const base = isDemo ? totalCa7j / Math.max(totalOrdersToday * 7, 1) : 0;
    const value = isDemo ? Math.round((base * (0.9 + seededVal(i * 3, 0, 0.2))) * 10) / 10 : 0;
    return { label, value };
  });
  const chartGrowth30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    const value = isDemo ? Math.round((seededVal(i * 5, -15, 25))) : 0;
    return { label, value };
  });
  // Per-restaurant CA series for multi-line chart
  const chartPerResto30 = restaurants.map((r, ri) => {
    const stat = getStat(r.id);
    const COLORS_CHART = [C.accentBlue, C.accentGreen, C.accentOrange, C.accentPurple, C.accent];
    return {
      label: r.name,
      color: COLORS_CHART[ri % COLORS_CHART.length],
      data: Array.from({ length: 30 }, (_, i) => {
        const d = new Date(Date.now() - (29 - i) * 86400000);
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const base = stat.ca_7j / 7;
        const value = isDemo ? Math.round(base * (isWeekend ? 1.3 : 0.85) * (0.7 + seededVal(i * 7 + ri * 31, 0, 0.6))) : 0;
        return { label, value };
      }),
    };
  });
  // Hourly distribution (heatmap data)
  const HOURLY_LABELS = ["10h","11h","12h","13h","14h","15h","16h","17h","18h","19h","20h","21h","22h"];
  const hourlyData = HOURLY_LABELS.map((label, i) => {
    const isPeak = i >= 2 && i <= 4 || i >= 7 && i <= 10;
    const value = isDemo ? Math.round(totalOrdersToday * (isPeak ? 0.12 : 0.04) * (0.7 + seededVal(i * 13, 0, 0.6))) : 0;
    return { label, value };
  });

  const TABS_DEF = [
    { id: "overview", icon: "🏠", label: "Vue d'ensemble" },
    { id: "establishments", icon: "👥", label: "Établissements" },
    { id: "compare", icon: "📊", label: "Comparatif" },
    { id: "campaigns", icon: "📧", label: "Campagnes" },
    { id: "analytics", icon: "📈", label: "Analytics" },
    { id: "settings", icon: "⚙️", label: "Paramètres" },
  ];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", ...FF }}>
      <style>{css}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🏢</div>
        <div style={{ color: C.textSecondary, fontSize: 15 }}>Chargement du groupe...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: isMobile ? "column" : "row", ...FF }}>
      <style>{css}</style>
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
          <div style={{ padding: "20px 16px 16px" }}>
            <Logo size={16} onClick={onHome} />
            <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: C.bg }}>
              {groupForm.logo_url || group.logo_url
                ? <img src={groupForm.logo_url || group.logo_url} alt="logo" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} />
                : <div style={{ fontSize: 22 }}>{groupForm.logo_emoji || group.logo_emoji}</div>}
              <div>
                <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Groupe</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, letterSpacing: "-0.01em" }}>{groupForm.name || group.name}</div>
              </div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: "4px 10px" }}>
            {TABS_DEF.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", padding: "9px 12px", borderRadius: 10, border: "none", background: tab === t.id ? C.bg : "transparent", color: tab === t.id ? C.dark : C.textSecondary, fontWeight: tab === t.id ? 600 : 400, fontSize: 14, cursor: "pointer", textAlign: "left", marginBottom: 2, transition: "all 0.15s", ...FF }}>
                {t.icon}<span style={{ marginLeft: 8 }}>{t.label}</span>
              </button>
            ))}
          </nav>
          <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: C.dark, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 13, fontWeight: 700 }}>{(user.name || user.email)[0].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
                <div style={{ fontSize: 11, color: C.textTertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
              </div>
            </div>
            <button onClick={() => setTab("establishments")}
              style={{ width: "100%", padding: "8px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, background: tab === "establishments" ? C.bg : "transparent", color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", marginBottom: 6, display: "flex", alignItems: "center", gap: 8, ...FF }}>
              <span>👥</span> Mes établissements
            </button>
            <button onClick={onBack}
              style={{ width: "100%", padding: "8px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, background: "transparent", color: C.textSecondary, fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", ...FF }}>
              {isDemo ? "← Retour accueil" : "← Mes restaurants"}
            </button>
          </div>
        </aside>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflow: "auto", paddingBottom: isMobile ? 70 : 0 }}>
        {/* Header */}
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: isMobile ? "12px 16px" : "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 4 }}>←</button>}
            <span style={{ fontSize: 20 }}>{groupForm.logo_emoji || group.logo_emoji}</span>
            <div>
              <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, color: C.dark }}>{groupForm.name || group.name}</div>
              <div style={{ fontSize: 12, color: C.textSecondary }}>{restaurants.length} établissement{restaurants.length !== 1 ? "s" : ""} · Plan {group.plan}</div>
            </div>
          </div>
          {!isMobile && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setTab("establishments")} style={{ background: tab === "establishments" ? C.dark : C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: tab === "establishments" ? C.white : C.textSecondary, cursor: "pointer", ...FF }}>
                👥 Mes établissements
              </button>
              {isDemo && (
                <button onClick={onBack} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: C.textSecondary, cursor: "pointer", ...FF }}>
                  ← Retour accueil
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: isMobile ? "16px" : "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

          {/* ── Tab: Overview ── */}
          {tab === "overview" && (
            <div className="fade-in">
              <h2 style={{ fontSize: 22, fontWeight: 800, color: C.dark, marginBottom: 20, letterSpacing: "-0.03em" }}>Vue d'ensemble du réseau</h2>
              {/* KPI grid */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                <KPICard label="Établissements" value={restaurants.length} sub="dans le réseau" />
                <KPICard label="CA aujourd'hui" value={`${totalCaToday.toFixed(2)} €`} sub="toutes enseignes" delta={5} />
                <KPICard label="CA 7 jours" value={`${totalCa7j.toFixed(2)} €`} sub="réseau" delta={8} />
                <KPICard label="Commandes aujourd'hui" value={totalOrdersToday} sub="total réseau" />
                <KPICard label="Panier moyen réseau" value={`${avgBasket.toFixed(2)} €`} sub="sur 7 jours" />
                <KPICard label="Alertes actives" value={alerts.length} sub={alerts.length > 0 ? "⚠️ Baisse détectée" : "Tout est nominal"} />
              </div>
              {/* Établissements ranking */}
              <Surface style={{ padding: "20px 24px", marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 16 }}>Classement CA 7 jours</h3>
                {sortedRestos.map((r, i) => {
                  const s = getStat(r.id);
                  const maxCa = Math.max(...stats.map(st => st.ca_7j), 1);
                  const pct = (s.ca_7j / maxCa) * 100;
                  return (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, cursor: onRestaurant ? "pointer" : "default" }} onClick={() => onRestaurant && onRestaurant(r, getStat(r.id))}>
                      <div style={{ width: 28, fontSize: 14, fontWeight: 700, color: i < 3 ? ["#FFD700","#C0C0C0","#CD7F32"][i] : C.textTertiary, textAlign: "center" }}>{i < 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}</div>
                      <div style={{ fontSize: 20 }}>{r.logo_emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{r.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{s.ca_7j.toFixed(2)} €</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: C.bg, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: i === 0 ? C.accentGreen : i === 1 ? C.accentBlue : C.accentOrange, borderRadius: 3, transition: "width 0.5s ease" }} />
                        </div>
                      </div>
                      {s.growth < -10 && <Tag color={C.accent}>⚠️ {s.growth}%</Tag>}
                      {s.growth >= 0 && <Tag color={C.accentGreen}>+{s.growth}%</Tag>}
                    </div>
                  );
                })}
              </Surface>
              {/* Alerts */}
              {alerts.length > 0 && (
                <Surface style={{ padding: "20px 24px", border: `1.5px solid ${C.accent}20` }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 4 }}>🔴 Alertes performance</h3>
                  <p style={{ fontSize: 12, color: C.textSecondary, marginBottom: 12 }}>👆 Cliquez sur une alerte pour obtenir un audit complet du problème de performance</p>
                  {alerts.map(a => {
                    const r = restaurants.find(x => x.id === a.restaurant_id);
                    const s = getStat(a.restaurant_id);
                    const isOpen = alertExplain?.restaurant?.id === a.restaurant_id;
                    return r ? (
                      <div key={a.restaurant_id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <div onClick={() => setAlertExplain(isOpen ? null : { restaurant: r, stat: s })}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", cursor: "pointer", transition: "opacity 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                          <span style={{ fontSize: 18 }}>{r.logo_emoji}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{r.name}</span>
                            <span style={{ color: C.textSecondary, fontSize: 13 }}> — région {r.region || "N/A"}</span>
                          </div>
                          <Tag color={C.accent}>⬇ {Math.abs(a.growth)}% de baisse</Tag>
                          <span style={{ fontSize: 13, color: C.textTertiary }}>{isOpen ? "▲" : "▼"}</span>
                        </div>
                        {isOpen && (
                          <div style={{ background: C.bg, borderRadius: 12, padding: "16px 18px", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                              <span style={{ fontSize: 18 }}>🤖</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Analyse IA</span>
                            </div>
                            {generateAlertExplanation(r, s).split("\n").map((line, i) => {
                              if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
                              const bold = line.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong>${t}</strong>`);
                              return <p key={i} dangerouslySetInnerHTML={{ __html: bold }} style={{ fontSize: 13, color: C.text, lineHeight: 1.6, margin: "2px 0" }} />;
                            })}
                            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                              <Btn variant="primary" size="sm" onClick={() => { setAlertExplain(null); setTab("campaigns"); }}>📧 Lancer une campagne</Btn>
                              <Btn variant="ghost" size="sm" onClick={() => onRestaurant && onRestaurant(r, s)}>📊 Voir le dashboard</Btn>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })}
                </Surface>
              )}
            </div>
          )}

          {/* ── Tab: Compare ── */}
          {tab === "compare" && (
            <div className="fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: C.dark, letterSpacing: "-0.03em" }}>Comparatif établissements</h2>
                <Btn variant="ghost" size="sm" onClick={exportCSV}>📥 Exporter CSV</Btn>
              </div>
              <Surface style={{ overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${C.border}`, background: C.bg }}>
                        {[["name", "Restaurant"], ["ca_7j", "CA 7j"], ["orders_7j", "Cmds 7j"], ["avg_basket", "Panier moy."], ["growth", "Évolution"]].map(([col, label]) => (
                          <th key={col} onClick={() => toggleSort(col)}
                            style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: C.textSecondary, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                            {label} {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : ""}
                          </th>
                        ))}
                        <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: C.textSecondary }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRestos.map((r, i) => {
                        const s = getStat(r.id);
                        const rank = restaurants.slice().sort((a, b) => getStat(b.id).ca_7j - getStat(a.id).ca_7j).findIndex(x => x.id === r.id);
                        const medal = rank < 3 ? ["🥇","🥈","🥉"][rank] : null;
                        return (
                          <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.surface : C.bg + "80" }}>
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {medal && <span>{medal}</span>}
                                <span style={{ fontSize: 16 }}>{r.logo_emoji}</span>
                                <div>
                                  <div style={{ fontWeight: 600, color: C.dark }}>{r.name}</div>
                                  {r.region && <div style={{ fontSize: 11, color: C.textTertiary }}>{r.region}</div>}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "12px 16px", fontWeight: 700, color: C.dark }}>{s.ca_7j.toFixed(2)} €</td>
                            <td style={{ padding: "12px 16px", color: C.text }}>{s.orders_7j}</td>
                            <td style={{ padding: "12px 16px", color: C.text }}>{s.avg_basket.toFixed(2)} €</td>
                            <td style={{ padding: "12px 16px" }}>
                              <Tag color={s.growth < -10 ? C.accent : s.growth >= 0 ? C.accentGreen : C.accentOrange}>
                                {s.growth >= 0 ? "+" : ""}{s.growth}%
                              </Tag>
                              {s.growth < -10 && <span style={{ marginLeft: 6 }}>⚠️</span>}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ display: "flex", gap: 2 }}>
                                {Array.from({ length: 5 }, (_, j) => {
                                  const score = Math.min(5, Math.max(1, Math.round((s.ca_7j / Math.max(...stats.map(st => st.ca_7j), 1)) * 5)));
                                  return <span key={j} style={{ color: j < score ? C.accentOrange : C.border, fontSize: 14 }}>★</span>;
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Surface>
            </div>
          )}

          {/* ── Tab: Campaigns ── */}
          {tab === "campaigns" && (
            <div className="fade-in">
              <h2 style={{ fontSize: 22, fontWeight: 800, color: C.dark, marginBottom: 20, letterSpacing: "-0.03em" }}>Campagnes globales</h2>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
                {/* Form */}
                <Surface style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 16 }}>Nouvelle campagne</h3>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Sujet</label>
                    <input value={campSubject} onChange={e => setCampSubject(e.target.value)} placeholder="Objet de l'email..."
                      style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: C.text, outline: "none", ...FF }} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ color: C.textSecondary, fontSize: 13, fontWeight: 500 }}>Corps HTML</label>
                      <button onClick={generateAI} disabled={campGenLoading}
                        style={{ background: "linear-gradient(135deg,#BF5AF2,#0071E3)", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", ...FF }}>
                        {campGenLoading ? "..." : "✨ Générer avec l'IA"}
                      </button>
                    </div>
                    <textarea value={campBody} onChange={e => setCampBody(e.target.value)} placeholder="<h2>Votre message</h2>..."
                      rows={6} style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: C.text, outline: "none", resize: "vertical", ...FF }} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Destinataires</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Clients toggle */}
                      <div style={{ padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${campSendToClients ? C.accentBlue : C.border}`, background: campSendToClients ? C.accentBlue + "10" : C.bg, cursor: "pointer", transition: "all 0.15s" }}
                        onClick={() => setCampSendToClients(p => !p)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${campSendToClients ? C.accentBlue : C.border}`, background: campSendToClients ? C.accentBlue : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {campSendToClients && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>👤 Clients</div>
                            <div style={{ fontSize: 11, color: C.textSecondary }}>Email envoyé aux clients de tes restaurants</div>
                          </div>
                        </div>
                        {campSendToClients && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                            <label style={{ display: "block", color: C.textSecondary, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Segment clients</label>
                            <select value={campSegment} onChange={e => { e.stopPropagation(); setCampSegment(e.target.value); }}
                              onClick={e => e.stopPropagation()}
                              style={{ width: "100%", background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", fontSize: 12, color: C.text, outline: "none", ...FF }}>
                              <option value="all">Tous les clients</option>
                              <option value="top_clients">Top clients (les plus fidèles)</option>
                              <option value="inactive">Inactifs (n'ont pas commandé)</option>
                            </select>
                          </div>
                        )}
                      </div>
                      {/* Établissements toggle */}
                      <div style={{ padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${campSendToEstabs ? C.accentGreen : C.border}`, background: campSendToEstabs ? C.accentGreen + "10" : C.bg, cursor: "pointer", transition: "all 0.15s" }}
                        onClick={() => setCampSendToEstabs(p => !p)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${campSendToEstabs ? C.accentGreen : C.border}`, background: campSendToEstabs ? C.accentGreen : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {campSendToEstabs && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>🏢 Établissements</div>
                            <div style={{ fontSize: 11, color: C.textSecondary }}>Email envoyé aux managers de tes restaurants</div>
                          </div>
                        </div>
                        {campSendToEstabs && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                            <label style={{ display: "block", color: C.textSecondary, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Établissements ciblés</label>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12, cursor: "pointer" }} onClick={e => e.stopPropagation()}>
                              <input type="radio" name="estab_target" checked={campTarget === "all"} onChange={() => { setCampTarget("all"); setCampSelected([]); }} />
                              Tous les établissements
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }} onClick={e => e.stopPropagation()}>
                              <input type="radio" name="estab_target" checked={campTarget === "select"} onChange={() => setCampTarget("select")} />
                              Sélectionner des établissements
                            </label>
                            {campTarget === "select" && (
                              <div style={{ marginTop: 8, paddingLeft: 4 }} onClick={e => e.stopPropagation()}>
                                {restaurants.map(r => (
                                  <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, cursor: "pointer", fontSize: 12 }}>
                                    <input type="checkbox" checked={campSelected.includes(r.id)}
                                      onChange={e => setCampSelected(prev => e.target.checked ? [...prev, r.id] : prev.filter(x => x !== r.id))} />
                                    <span>{r.logo_emoji}</span>
                                    <span style={{ color: C.dark }}>{r.name}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {!campSendToClients && !campSendToEstabs && (
                      <p style={{ fontSize: 12, color: C.accent, marginTop: 6 }}>⚠️ Sélectionne au moins un type de destinataire</p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn variant="ghost" size="sm" full disabled={!campSubject || !campBody || campSending} onClick={() => saveCampaign(false)}>
                      Sauvegarder brouillon
                    </Btn>
                    <Btn variant="blue" size="sm" full disabled={!campSubject || !campBody || campSending || (!campSendToClients && !campSendToEstabs)} onClick={() => saveCampaign(true)}>
                      {campSending ? "Envoi..." : "📤 Envoyer"}
                    </Btn>
                  </div>
                </Surface>
                {/* Campaign list */}
                <Surface style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 16 }}>Historique des campagnes</h3>
                  {campaigns.length === 0 ? (
                    <p style={{ color: C.textTertiary, fontSize: 14 }}>Aucune campagne pour l'instant.</p>
                  ) : campaigns.map(c => (
                    <div key={c.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{c.subject}</span>
                        <Tag color={c.status === "sent" ? C.accentGreen : C.accentOrange}>{c.status === "sent" ? "Envoyée" : "Brouillon"}</Tag>
                      </div>
                      <div style={{ fontSize: 12, color: C.textTertiary }}>
                        {c.sent_at ? `Envoyée le ${new Date(c.sent_at).toLocaleDateString("fr-FR")}` : `Créée le ${new Date(c.created_at).toLocaleDateString("fr-FR")}`}
                        {(c.send_to_clients || c.send_to_establishments) && (
                          <span> · {[c.send_to_clients && "👤 Clients", c.send_to_establishments && "🏢 Établissements"].filter(Boolean).join(" + ")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </Surface>
              </div>
            </div>
          )}

          {/* ── Tab: Establishments ── */}
          {tab === "establishments" && (
            <div className="fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: C.dark, letterSpacing: "-0.03em" }}>Établissements</h2>
                  <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{restaurants.length} / 5 établissements</p>
                </div>
                <Btn variant="primary" size="sm" onClick={() => restaurants.length < 5 ? setShowCreateResto(true) : null}
                  style={{ opacity: restaurants.length >= 5 ? 0.4 : 1, cursor: restaurants.length >= 5 ? "not-allowed" : "pointer" }}>
                  {restaurants.length >= 5 ? "🔒 Maximum atteint" : "+ Ajouter"}
                </Btn>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {restaurants.map(r => {
                  const s = getStat(r.id);
                  return (
                    <Surface key={r.id} style={{ padding: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden" }}>
                            {r.logo_url ? <img src={r.logo_url} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : r.logo_emoji}
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{r.name}</div>
                            <div style={{ fontSize: 12, color: C.textSecondary }}>{r.region || "Région N/A"}</div>
                          </div>
                        </div>
                        <Tag color={C.accentGreen}>Actif</Tag>
                      </div>
                      {r.manager_email && (
                        <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 12, padding: "6px 10px", background: C.bg, borderRadius: 8 }}>
                          👤 {r.manager_email}
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                        <div style={{ textAlign: "center", padding: "8px 0", background: C.bg, borderRadius: 8 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>{s.ca_today.toFixed(2)} €</div>
                          <div style={{ fontSize: 11, color: C.textTertiary }}>CA aujourd'hui</div>
                        </div>
                        <div style={{ textAlign: "center", padding: "8px 0", background: C.bg, borderRadius: 8 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>{s.orders_today}</div>
                          <div style={{ fontSize: 11, color: C.textTertiary }}>Commandes</div>
                        </div>
                      </div>
                      {/* Audit panel */}
                      {alertExplain?.restaurant?.id === r.id && (
                        <div style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", marginBottom: 10, borderLeft: `3px solid ${s.growth < -10 ? C.accent : C.accentBlue}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                            <span>🤖</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>Audit IA — {r.name}</span>
                          </div>
                          {generateAlertExplanation(r, s).split("\n").map((line, i) => {
                            if (!line.trim()) return <div key={i} style={{ height: 5 }} />;
                            const bold = line.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong>${t}</strong>`);
                            return <p key={i} dangerouslySetInnerHTML={{ __html: bold }} style={{ fontSize: 12, color: C.text, lineHeight: 1.5, margin: "2px 0" }} />;
                          })}
                          <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                            <Btn variant="primary" size="sm" onClick={() => { setAlertExplain(null); setTab("campaigns"); }}>📧 Campagne</Btn>
                            {onRestaurant && <Btn variant="ghost" size="sm" onClick={() => { setAlertExplain(null); onRestaurant(r, s); }}>📊 Dashboard</Btn>}
                          </div>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        {onRestaurant && (
                          <Btn variant="primary" size="sm" full onClick={() => onRestaurant(r, s)}>Gérer</Btn>
                        )}
                        <Btn variant="ghost" size="sm" title="Audit IA" onClick={() => setAlertExplain(alertExplain?.restaurant?.id === r.id ? null : { restaurant: r, stat: s })}
                          style={{ background: alertExplain?.restaurant?.id === r.id ? C.dark : undefined, color: alertExplain?.restaurant?.id === r.id ? C.white : undefined }}>🔍</Btn>
                        <Btn variant="ghost" size="sm" onClick={() => openStaffModal(r)}>👤</Btn>
                        <Btn variant="ghost" size="sm" onClick={() => { setEditResto(r); setEditForm({ name: r.name || "", logo_emoji: r.logo_emoji || "🍽️", region: r.region || "", manager_email: r.manager_email || "" }); }}>✏️</Btn>
                        <Btn variant="ghost" size="sm" onClick={() => { setDeleteResto(r); setDeleteRestoInput(""); }}
                          style={{ color: C.accent, borderColor: C.accent + "40" }}>🗑</Btn>
                      </div>
                    </Surface>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Tab: Analytics ── */}
          {tab === "analytics" && (() => {
            const TOP_DISHES = [
              { name: "Steak Frites", emoji: "🥩", count: 1247, revenue: 24815, trend: 12 },
              { name: "Burger Maison", emoji: "🍔", count: 1089, revenue: 15127, trend: 8 },
              { name: "Salade César", emoji: "🥗", count: 876, revenue: 7884, trend: -3 },
              { name: "Poulet Rôti", emoji: "🍗", count: 743, revenue: 11517, trend: 5 },
              { name: "Pasta Carbonara", emoji: "🍝", count: 612, revenue: 8874, trend: 18 },
              { name: "Tarte Tatin", emoji: "🥧", count: 534, revenue: 4005, trend: 2 },
              { name: "Vin Rouge", emoji: "🍷", count: 489, revenue: 2690, trend: -7 },
            ];
            const DAYS_WEEK = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
            const weekdayCA = DAYS_WEEK.map((label, i) => ({
              label,
              value: isDemo ? Math.round(totalCa7j * [0.13,0.12,0.14,0.15,0.16,0.18,0.12][i]) : 0,
            }));

            const ca30Total = chartData30.reduce((s, d) => s + d.value, 0);
            const orders30Total = chartOrders30.reduce((s, d) => s + d.value, 0);
            const avgBasket = ca30Total / Math.max(orders30Total, 1);
            const fmt3 = n => n >= 1000 ? `${(n/1000).toFixed(2)} k €` : `${n.toFixed(2)} €`;

            function ExpandBtn({ onClick }) {
              return (
                <button onClick={onClick}
                  title="Agrandir"
                  style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: C.textSecondary, flexShrink: 0 }}>
                  ⤢
                </button>
              );
            }

            function ChartCard({ title, subtitle, badge, kpis, children, onExpand }) {
              return (
                <Surface style={{ padding: "20px 20px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.dark, letterSpacing: "-0.01em" }}>{title}</h3>
                        {badge && <span style={{ background: badge.bg, color: badge.fg, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>{badge.text}</span>}
                      </div>
                      {subtitle && <p style={{ fontSize: 11, color: C.textSecondary }}>{subtitle}</p>}
                      {kpis && (
                        <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                          {kpis.map((k, i) => (
                            <div key={i}>
                              <div style={{ fontSize: 18, fontWeight: 800, color: k.color || C.dark, letterSpacing: "-0.03em" }}>{k.value}</div>
                              <div style={{ fontSize: 10, color: C.textTertiary }}>{k.label}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {onExpand && <ExpandBtn onClick={onExpand} />}
                  </div>
                  {children}
                </Surface>
              );
            }

            return (
              <div className="fade-in">
                {/* Expand modal */}
                {expandChart && (
                  <ChartModal
                    title={expandChart.title}
                    subtitle={expandChart.subtitle}
                    kpis={expandChart.kpis}
                    onClose={() => setExpandChart(null)}>
                    {expandChart.type === "bar" ? (
                      <BarChart data={expandChart.data} color={expandChart.color} height={360} unit={expandChart.unit} />
                    ) : expandChart.multiSeries ? (
                      <>
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
                          {expandChart.multiSeries.map(s => (
                            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 16, height: 3, borderRadius: 2, background: s.color }} />
                              <span style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500 }}>{s.label}</span>
                            </div>
                          ))}
                        </div>
                        <LineChart multiSeries={expandChart.multiSeries} height={360} unit={expandChart.unit} />
                      </>
                    ) : (
                      <LineChart data={expandChart.data} color={expandChart.color} height={360} unit={expandChart.unit} />
                    )}
                  </ChartModal>
                )}

                {/* Page header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: C.dark, letterSpacing: "-0.03em" }}>Analytics réseau</h2>
                    <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 3 }}>Données des 30 derniers jours · Toutes enseignes</p>
                  </div>
                  <Tag color={C.accentBlue}>30 jours</Tag>
                </div>

                {/* KPI strip */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                  {[
                    { label: "CA total réseau", value: fmt3(ca30Total), sub: "+14% vs M-1", subColor: C.accentGreen, icon: "💰", color: C.accentBlue },
                    { label: "Commandes", value: orders30Total.toLocaleString("fr-FR"), sub: "+9% vs M-1", subColor: C.accentGreen, icon: "📋", color: C.accentGreen },
                    { label: "Ticket moyen", value: `${avgBasket.toFixed(2)} €`, sub: "+4% vs M-1", subColor: C.accentGreen, icon: "🧾", color: C.accentOrange },
                    { label: "Croissance", value: "+11%", sub: "vs mois précédent", subColor: C.accentPurple, icon: "📈", color: C.accentPurple },
                  ].map(k => (
                    <div key={k.label} style={{ background: C.white, borderRadius: 16, padding: "18px 20px", border: `1.5px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontSize: 11, color: C.textSecondary, fontWeight: 500 }}>{k.label}</div>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: k.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{k.icon}</div>
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: C.dark, letterSpacing: "-0.04em", margin: "8px 0 4px" }}>{k.value}</div>
                      <div style={{ fontSize: 11, color: k.subColor, fontWeight: 600 }}>{k.sub}</div>
                    </div>
                  ))}
                </div>

                {/* CA réseau — plein largeur */}
                <div style={{ marginBottom: 16 }}>
                  <ChartCard
                    title="Chiffre d'affaires — 30 jours"
                    subtitle="CA journalier consolidé toutes enseignes • Passez la souris sur la courbe pour voir les détails"
                    kpis={[
                      { label: "Total 30j", value: fmt3(ca30Total), color: C.accentBlue },
                      { label: "Meilleur jour", value: fmt3(Math.max(...chartData30.map(d => d.value))), color: C.accentGreen },
                      { label: "Moy. / jour", value: fmt3(ca30Total / 30), color: C.textSecondary },
                    ]}
                    onExpand={() => setExpandChart({
                      title: "Chiffre d'affaires — 30 jours", subtitle: "CA journalier consolidé",
                      data: chartData30, color: C.accentBlue, unit: "€",
                      kpis: [{ label: "Total", value: fmt3(ca30Total) }, { label: "Pic", value: fmt3(Math.max(...chartData30.map(d=>d.value))) }, { label: "Moy/j", value: fmt3(ca30Total/30) }],
                    })}>
                    <LineChart data={chartData30} color={C.accentBlue} height={180} unit="€" />
                  </ChartCard>
                </div>

                {/* Commandes + ticket moyen */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <ChartCard
                    title="Commandes / jour"
                    subtitle="Nombre de commandes journalières"
                    kpis={[
                      { label: "Total 30j", value: orders30Total.toLocaleString("fr-FR"), color: C.accentGreen },
                      { label: "Moy/jour", value: Math.round(orders30Total / 30).toString(), color: C.textSecondary },
                    ]}
                    onExpand={() => setExpandChart({ title: "Commandes / jour — 30 jours", data: chartOrders30, color: C.accentGreen, unit: "", kpis:[{label:"Total",value:orders30Total.toLocaleString("fr-FR")},{label:"Moy/j",value:Math.round(orders30Total/30).toString()}] })}>
                    <LineChart data={chartOrders30} color={C.accentGreen} height={150} unit="" />
                  </ChartCard>
                  <ChartCard
                    title="Ticket moyen"
                    subtitle="Panier moyen par commande (€)"
                    kpis={[
                      { label: "Moy. 30j", value: `${avgBasket.toFixed(2)} €`, color: C.accentOrange },
                      { label: "Max", value: `${Math.max(...chartAvgBasket30.map(d=>d.value)).toFixed(2)} €`, color: C.textSecondary },
                    ]}
                    onExpand={() => setExpandChart({ title: "Ticket moyen — 30 jours", data: chartAvgBasket30, color: C.accentOrange, unit: "€", kpis:[{label:"Moy",value:`${avgBasket.toFixed(2)} €`}] })}>
                    <LineChart data={chartAvgBasket30} color={C.accentOrange} height={150} unit="€" />
                  </ChartCard>
                </div>

                {/* Comparatif par établissement */}
                <div style={{ marginBottom: 16 }}>
                  <ChartCard
                    title="CA par établissement — 30 jours"
                    subtitle="Comparez l'évolution de chaque enseigne sur la période"
                    badge={{ text: `${restaurants.length} établissements`, bg: C.accentBlue + "15", fg: C.accentBlue }}
                    onExpand={() => setExpandChart({ title: "CA par établissement — 30 jours", multiSeries: chartPerResto30, unit: "€" })}>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                      {chartPerResto30.map(s => (
                        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 14, height: 3, borderRadius: 2, background: s.color }} />
                          <span style={{ fontSize: 12, color: C.textSecondary }}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                    <LineChart multiSeries={chartPerResto30} height={180} unit="€" />
                  </ChartCard>
                </div>

                {/* Croissance + heures + jours */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <ChartCard
                    title="Croissance J/J (%)"
                    subtitle="Variation vs J-7"
                    onExpand={() => setExpandChart({ title: "Croissance jour / jour (%)", data: chartGrowth30, color: C.accentPurple, unit: "%" })}>
                    <LineChart data={chartGrowth30} color={C.accentPurple} height={140} unit="%" />
                  </ChartCard>
                  <ChartCard
                    title="Affluence horaire"
                    subtitle="Commandes par heure (réseau)"
                    onExpand={() => setExpandChart({ title: "Affluence horaire", data: hourlyData, color: C.accentBlue, unit: "", type: "bar" })}>
                    <BarChart data={hourlyData} color={C.accentBlue} height={140} unit="" />
                  </ChartCard>
                  <ChartCard
                    title="CA par jour de semaine"
                    subtitle="Performance moyenne par jour"
                    onExpand={() => setExpandChart({ title: "CA par jour de semaine", data: weekdayCA, color: C.accentOrange, unit: "€", type: "bar" })}>
                    <BarChart data={weekdayCA} color={C.accentOrange} height={140} unit="€" />
                  </ChartCard>
                </div>

                {/* Top dishes */}
                <Surface style={{ padding: "20px 20px 8px", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 18 }}>🏆 Top plats du réseau — 30 jours</h3>
                  {TOP_DISHES.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: i < 3 ? ["#FFF0C2","#F0F0F0","#FFF0E8"][i] : C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: i < 3 ? ["#B8860B","#6E6E73","#8B4513"][i] : C.textTertiary, flexShrink: 0 }}>{i+1}</div>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{d.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{d.name}</span>
                          <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                            <span style={{ fontSize: 12, color: C.textSecondary }}>{d.count.toLocaleString("fr-FR")} ventes</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>{d.revenue.toLocaleString("fr-FR")} €</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: d.trend >= 0 ? C.accentGreen : C.accent, minWidth: 38, textAlign: "right" }}>{d.trend >= 0 ? "↑" : "↓"} {Math.abs(d.trend)}%</span>
                          </div>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: C.bg, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(d.count / TOP_DISHES[0].count) * 100}%`, background: i < 3 ? ["#FFD700","#C0C0C0","#CD7F32"][i] : C.accentBlue, borderRadius: 3 }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </Surface>

                {/* Region breakdown */}
                {restaurants.some(r => r.region) && (
                  <Surface style={{ padding: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 16 }}>📍 Performance par région</h3>
                    {Array.from(new Set(restaurants.map(r => r.region).filter(Boolean))).map(region => {
                      const restoInRegion = restaurants.filter(r => r.region === region);
                      const regionCa = restoInRegion.reduce((s, r) => s + getStat(r.id).ca_7j, 0);
                      const regionOrders = restoInRegion.reduce((s, r) => s + getStat(r.id).orders_7j, 0);
                      const totalCaAll = stats.reduce((s, st) => s + st.ca_7j, 0);
                      return (
                        <div key={region} style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{region}</span>
                              <span style={{ color: C.textSecondary, fontSize: 12, marginLeft: 8 }}>{restoInRegion.length} étab.</span>
                              <span style={{ color: C.textSecondary, fontSize: 12, marginLeft: 8 }}>· {regionOrders} cmd/7j</span>
                            </div>
                            <span style={{ fontWeight: 800, fontSize: 14, color: C.dark }}>{regionCa.toFixed(2)} €</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: C.bg, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${totalCaAll ? (regionCa / totalCaAll) * 100 : 0}%`, background: C.accentBlue, borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </Surface>
                )}
              </div>
            );
          })()}

          {/* ── Tab: Settings ── */}
          {tab === "settings" && (
            <div className="fade-in">
              <h2 style={{ fontSize: 22, fontWeight: 800, color: C.dark, marginBottom: 20, letterSpacing: "-0.03em" }}>Paramètres du groupe</h2>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
                <Surface style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 16 }}>Informations générales</h3>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Nom du groupe</label>
                    <input value={groupForm.name} onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))}
                      style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: C.text, outline: "none", ...FF }} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Logo du groupe</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {/* Preview */}
                      <div style={{ width: 64, height: 64, borderRadius: 16, background: C.bg, border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                        {groupForm.logo_url
                          ? <img src={groupForm.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 28 }}>{groupForm.logo_emoji || "🏢"}</span>}
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                        {/* Emoji */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input value={groupForm.logo_emoji} onChange={e => setGroupForm(p => ({ ...p, logo_emoji: e.target.value }))}
                            style={{ width: 56, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "8px", fontSize: 20, color: C.text, outline: "none", textAlign: "center", ...FF }} />
                          <span style={{ fontSize: 12, color: C.textSecondary }}>ou</span>
                          {/* Photo upload */}
                          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.dark, whiteSpace: "nowrap" }}>
                            {uploadingLogo ? "⏳ Upload..." : "📷 Photo"}
                            <input type="file" accept="image/*" style={{ display: "none" }} onChange={uploadGroupLogo} disabled={uploadingLogo} />
                          </label>
                          {groupForm.logo_url && (
                            <button onClick={() => setGroupForm(p => ({ ...p, logo_url: "" }))}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.textTertiary }}>✕</button>
                          )}
                        </div>
                        <p style={{ fontSize: 11, color: C.textTertiary, margin: 0 }}>JPG, PNG ou WebP · max 2 Mo</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Plan</label>
                    <Tag color={group.plan === "franchise" ? C.accentPurple : C.accentBlue}>{group.plan}</Tag>
                  </div>
                  <Btn variant="primary" size="sm" disabled={savingGroup} onClick={saveGroupSettings}>{savingGroup ? "Sauvegarde..." : "💾 Sauvegarder"}</Btn>
                </Surface>
                <Surface style={{ padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>Membres de l'équipe</h3>
                    <Btn variant="ghost" size="xs" onClick={() => setShowInvite(true)}>+ Inviter</Btn>
                  </div>
                  {members.map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: C.dark, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{m.email[0].toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
                        {m.regions && m.regions.length > 0 && <div style={{ fontSize: 11, color: C.textTertiary }}>{m.regions.join(", ")}</div>}
                      </div>
                      <Tag color={m.role === "owner" ? C.dark : m.role === "director" ? C.accentPurple : m.role === "regional" ? C.accentBlue : C.accentGreen}>{m.role}</Tag>
                    </div>
                  ))}
                  {members.length === 0 && <p style={{ color: C.textTertiary, fontSize: 14 }}>Aucun membre ajouté.</p>}
                </Surface>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 100 }}>
          {TABS_DEF.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 0", border: "none", background: "transparent", color: tab === t.id ? C.dark : C.textTertiary, cursor: "pointer", ...FF }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              <span style={{ fontSize: 9, marginTop: 2, fontWeight: tab === t.id ? 700 : 400 }}>{t.label.split(" ")[0]}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Staff modal */}
      {staffResto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setStaffResto(null); }}>
          <Surface style={{ padding: 28, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 28 }}>{staffResto.logo_emoji || "🍽️"}</div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>Staff — {staffResto.name}</h3>
                <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>Les membres peuvent se connecter et accéder directement à ce restaurant.</p>
              </div>
            </div>

            {/* Add staff form */}
            <form onSubmit={addStaff} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input value={staffEmail} onChange={e => setStaffEmail(e.target.value)}
                placeholder="email@exemple.com" type="email" required
                style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, color: C.text, outline: "none", ...FF }} />
              <select value={staffRole} onChange={e => setStaffRole(e.target.value)}
                style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "9px 10px", fontSize: 13, color: C.text, outline: "none", ...FF }}>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
                <option value="cashier">Caisse</option>
                <option value="cuisine">Cuisine (vue cuisine uniquement)</option>
              </select>
              <Btn variant="primary" type="submit" disabled={staffAdding || !staffEmail.trim()}>
                {staffAdding ? "..." : "+ Ajouter"}
              </Btn>
            </form>

            {/* Staff list */}
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {staffLoading ? (
                <div style={{ textAlign: "center", padding: 20, color: C.textSecondary, fontSize: 13 }}>Chargement...</div>
              ) : staffList.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: C.textSecondary, fontSize: 13 }}>
                  Aucun membre pour l'instant.<br />
                  <span style={{ fontSize: 11 }}>Ajoutez un email ci-dessus — il pourra se connecter et accéder à ce restaurant.</span>
                </div>
              ) : staffList.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: C.bg, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: C.dark, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {s.email[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</div>
                    <div style={{ fontSize: 11, color: C.textTertiary }}>{s.role} · Ajouté le {new Date(s.invited_at).toLocaleDateString("fr-FR")}</div>
                  </div>
                  <button onClick={() => removeStaff(s.id)}
                    style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: C.textTertiary, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: C.accentBlue + "10", border: `1px solid ${C.accentBlue}30` }}>
              <p style={{ fontSize: 12, color: C.accentBlue, fontWeight: 600, marginBottom: 4 }}>💡 Comment ça marche ?</p>
              <p style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.5 }}>
                Le membre se connecte sur l'app avec l'email ajouté ici et crée son compte. Il arrive directement sur le dashboard de <strong>{staffResto.name}</strong>.
              </p>
            </div>

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setStaffResto(null)}>Fermer</Btn>
            </div>
          </Surface>
        </div>
      )}

      {/* Edit restaurant modal */}
      {editResto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setEditResto(null); }}>
          <Surface style={{ padding: 28, width: "100%", maxWidth: 420 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.dark, marginBottom: 20 }}>✏️ Modifier l'établissement</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Emoji</label>
                <input value={editForm.logo_emoji} onChange={e => setEditForm(p => ({ ...p, logo_emoji: e.target.value }))}
                  style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 22, textAlign: "center", outline: "none", ...FF }} />
              </div>
              <div>
                <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Nom du restaurant</label>
                <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nom de l'établissement" autoFocus
                  style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: C.text, outline: "none", ...FF }} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Région</label>
              <input value={editForm.region} onChange={e => setEditForm(p => ({ ...p, region: e.target.value }))}
                placeholder="ex: Île-de-France"
                style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: C.text, outline: "none", ...FF }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Email responsable</label>
              <input value={editForm.manager_email} onChange={e => setEditForm(p => ({ ...p, manager_email: e.target.value }))}
                placeholder="manager@email.com" type="email"
                style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: C.text, outline: "none", ...FF }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" full onClick={() => setEditResto(null)}>Annuler</Btn>
              <Btn variant="primary" full onClick={saveEditResto}>Sauvegarder</Btn>
            </div>
          </Surface>
        </div>
      )}

      {/* Delete restaurant modal */}
      {deleteResto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) { setDeleteResto(null); setDeleteRestoInput(""); } }}>
          <Surface style={{ padding: 32, width: "100%", maxWidth: 420 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: C.dark, marginBottom: 8 }}>Supprimer cet établissement ?</h2>
              <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.6 }}>
                Vous allez supprimer <strong>{deleteResto.name}</strong>.<br />
                Toutes les données seront <strong style={{ color: C.accent }}>définitivement perdues</strong>.
              </p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: C.textSecondary, fontSize: 13, marginBottom: 8 }}>Tapez <strong>supprimer</strong> pour confirmer</label>
              <input value={deleteRestoInput} onChange={e => setDeleteRestoInput(e.target.value)}
                placeholder="supprimer" autoFocus
                style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: C.text, outline: "none", textAlign: "center", ...FF }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" full onClick={() => { setDeleteResto(null); setDeleteRestoInput(""); }}>Annuler</Btn>
              <Btn full disabled={deleteRestoInput.trim().toLowerCase() !== "supprimer" || deletingResto}
                onClick={confirmDeleteResto}
                style={{ background: deleteRestoInput.trim().toLowerCase() === "supprimer" ? C.accent : C.border, color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: deleteRestoInput.trim().toLowerCase() === "supprimer" ? "pointer" : "not-allowed", ...FF }}>
                {deletingResto ? "Suppression..." : "🗑 Supprimer définitivement"}
              </Btn>
            </div>
          </Surface>
        </div>
      )}

      {/* Create restaurant modal */}
      {showCreateResto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreateResto(false); }}>
          <Surface style={{ padding: 28, width: "100%", maxWidth: 440 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.dark, marginBottom: 4 }}>+ Nouvel établissement</h3>
            <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>{restaurants.length} / 5 utilisés</p>
            <form onSubmit={createResto}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Emoji</label>
                  <input value={createRestoForm.logo_emoji} onChange={e => setCreateRestoForm(p => ({ ...p, logo_emoji: e.target.value }))}
                    style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 22, textAlign: "center", outline: "none", ...FF }} />
                </div>
                <div>
                  <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Nom *</label>
                  <input value={createRestoForm.name} onChange={e => setCreateRestoForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Nom de l'établissement" required autoFocus
                    style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: C.text, outline: "none", ...FF }} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Adresse</label>
                <input value={createRestoForm.address} onChange={e => setCreateRestoForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="ex: 12 rue de la Paix, Paris"
                  style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: C.text, outline: "none", ...FF }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Nombre de tables</label>
                <input value={createRestoForm.tables_count} onChange={e => setCreateRestoForm(p => ({ ...p, tables_count: e.target.value }))}
                  type="number" min="1" max="100"
                  style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: C.text, outline: "none", ...FF }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn variant="ghost" full onClick={() => setShowCreateResto(false)} type="button">Annuler</Btn>
                <Btn variant="primary" full type="submit" disabled={!createRestoForm.name || creatingResto}>
                  {creatingResto ? "Création..." : "Créer l'établissement →"}
                </Btn>
              </div>
            </form>
          </Surface>
        </div>
      )}

      {/* Invite member modal */}
      {showInvite && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setShowInvite(false); }}>
          <Surface style={{ padding: 28, width: "100%", maxWidth: 380 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.dark, marginBottom: 20 }}>Inviter un membre</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Email</label>
              <input value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                placeholder="email@exemple.com" type="email" autoFocus
                style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: C.text, outline: "none", ...FF }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: C.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Rôle</label>
              <select value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}
                style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: C.text, outline: "none", ...FF }}>
                <option value="manager">Manager</option>
                <option value="regional">Directeur régional</option>
                <option value="director">Directeur</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" full onClick={() => setShowInvite(false)}>Annuler</Btn>
              <Btn variant="primary" full disabled={!inviteForm.email || inviting} onClick={inviteMember}>{inviting ? "Envoi..." : "Inviter →"}</Btn>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT — Supabase session restore
// ─────────────────────────────────────────────────────────────────────────────
function AppInner() {
  const oauthMatch = window.location.pathname.match(/\/oauth\/gmail/);
  if (oauthMatch) return <GmailOAuthCallback />;

  const customerMatch = window.location.pathname.match(/\/r\/([^/]+)\/t\/(\d+)/);
  if (customerMatch) {
    return <CustomerPage slug={customerMatch[1]} tableNum={Number(customerMatch[2])} />;
  }
  return <Dashboard />;
}

export default function App() {
  return <ErrorBoundary><AppInner /></ErrorBoundary>;
}

function Dashboard() {
  const [page, setPage] = useState("loading");
  const [authInitialMode, setAuthInitialMode] = useState("signup");
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [franchiseGroup, setFranchiseGroup] = useState(null);
  const [fromFranchise, setFromFranchise] = useState(false);
  const store = useStore(restaurant?.id);
  const [lang, setLangState] = useState(() => localStorage.getItem("vg_lang") || "fr");
  const setLang = code => { setLangState(code); localStorage.setItem("vg_lang", code); };
  const T = TRANSLATIONS[lang] || TRANSLATIONS.fr;

  useEffect(() => {
    async function initSession() {
      try {
        const sessionRes = await supabase.auth.getSession();
        const u = sessionRes?.data?.session?.user;
        if (u) {
          const userData = { id: u.id, name: u.user_metadata?.name || u.email.split("@")[0], email: u.email };
          setUser(userData);

          // 1. Preload franchise group silently into state (no redirect)
          try {
            const cached = localStorage.getItem(`vg_fg_${u.id}`);
            if (cached) {
              const grp = JSON.parse(cached);
              if (grp?.id) setFranchiseGroup(grp);
            }
          } catch {}
          // Refresh from Supabase in background
          supabase.from("franchise_groups").select("*").eq("owner_id", u.id).maybeSingle()
            .then(res => {
              if (res?.data) {
                localStorage.setItem(`vg_fg_${u.id}`, JSON.stringify(res.data));
                setFranchiseGroup(res.data);
              }
            }).catch(() => {});

          // 2. Check if user is a restaurant staff member → direct to their view based on role
          try {
            const staffRes = await supabase.from("restaurant_staff").select("*, restaurants(*)").eq("email", u.email).single();
            if (staffRes?.data?.restaurants) {
              const r = staffRes.data.restaurants;
              const staffRole = staffRes.data.role;
              setRestaurant({ id: r.id, name: r.name, address: r.address, tables: r.tables_count, status: "active", emoji: r.logo_emoji || "🍽️", logo_emoji: r.logo_emoji || "🍽️", logo_url: r.logo_url || null, scans: 0, rating: null, orders: 0 });
              // Kitchen staff only see the cuisine view, not the full dashboard
              setPage(staffRole === "cuisine" ? "cuisine" : "dashboard");
              return;
            }
          } catch {}

          setPage("restaurants");
        } else {
          setPage("landing");
        }
      } catch {
        setPage("landing");
      }
    }
    initSession();

    const authListener = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) { setUser(null); setFranchiseGroup(null); setPage("landing"); }
    });
    const subscription = authListener?.data?.subscription;
    return () => { try { subscription?.unsubscribe(); } catch {} };
  }, []);


  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null); setRestaurant(null); setFranchiseGroup(null); setPage("landing");
    // NOTE: keep localStorage cache so next login finds franchise group instantly
  }

  if (page === "loading") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{css}</style>
      <Logo size={20} />
    </div>
  );

  function startDemo(key) {
    const demoUser = { id: "demo", name: "Démo", email: "demo@wegemo.com" };
    if (key === "restaurant") { setUser(demoUser); setRestaurant(DEMO_RESTAURANT); setFromFranchise(false); setPage("dashboard"); }
    else if (key === "franchise") { setUser(demoUser); setFranchiseGroup(DEMO_GROUP); setPage("franchise"); }
    else if (key === "kitchen") { setPage("demo-kitchen"); }
    else if (key === "customer") { setPage("demo-customer"); }
  }

  return (
    <LangCtx.Provider value={{ lang, setLang, T }}>
    <StoreCtx.Provider value={store}>
      {page === "landing" && <LandingPage onDemo={startDemo} onSignup={() => { setAuthInitialMode("signup"); setPage("signup"); }} onLogin={() => { setAuthInitialMode("login"); setPage("signup"); }} />}
      {page === "signup" && <SignupPage initialMode={authInitialMode} onDone={async (u, grp) => { setUser(u); if (grp) { localStorage.setItem(`vg_fg_${u.id}`, JSON.stringify(grp)); setFranchiseGroup(grp); setPage("franchise"); } else { const { data } = await supabase.from("franchise_groups").select("*").eq("owner_id", u.id).maybeSingle(); if (data) { localStorage.setItem(`vg_fg_${u.id}`, JSON.stringify(data)); setFranchiseGroup(data); setPage("franchise"); } else setPage("restaurants"); } }} onDemo={() => startDemo("restaurant")} onDemoPicker={() => setPage("landing")} />}
      {page === "demo-kitchen" && <DemoKitchenPage onBack={() => setPage("landing")} onSignup={() => setPage("signup")} />}
      {page === "demo-customer" && <DemoCustomerPage onBack={() => setPage("landing")} onSignup={() => setPage("signup")} />}
      {page === "restaurants" && user && <RestaurantsPage user={user} franchiseGroup={franchiseGroup} noAutoRedirect={fromFranchise} onSelect={r => { setFromFranchise(false); setRestaurant(r); setPage("dashboard"); }} onLogout={handleLogout} onDemo={() => startDemo("restaurant")} onFranchise={() => setPage("franchise")} onHome={() => user ? setPage("restaurants") : setPage("landing")} onFranchiseCreated={grp => { localStorage.setItem(`vg_fg_${user.id}`, JSON.stringify(grp)); setFranchiseGroup(grp); setPage("franchise"); }} onFranchiseFound={grp => { localStorage.setItem(`vg_fg_${user.id}`, JSON.stringify(grp)); setFranchiseGroup(grp); }} />}
      {page === "franchise" && <FranchiseDashboard user={user || { id: "demo", name: "Démo", email: "demo@wegemo.com" }} group={franchiseGroup || DEMO_GROUP} onBack={() => !user || user.id === "demo" ? setPage("landing") : (() => { setFromFranchise(true); setPage("restaurants"); })()} onHome={() => !user || user.id === "demo" ? setPage("landing") : setPage("franchise")} onGroupUpdate={grp => { setFranchiseGroup(grp); if (user?.id) localStorage.setItem(`vg_fg_${user.id}`, JSON.stringify(grp)); }} onRestaurant={(r, stat) => {
        const isDemo = !user || user.id === "demo";
        if (isDemo) {
          const s = stat || DEMO_FRANCHISE_STATS.find(s => s.restaurant_id === r.id) || DEMO_FRANCHISE_STATS[0];
          setRestaurant({ ...DEMO_RESTAURANT, name: r.name, emoji: r.logo_emoji, logo_emoji: r.logo_emoji, _demoStats: s });
          setFromFranchise(true);
        } else {
          setRestaurant({ id: r.id, name: r.name, address: r.address, tables: r.tables_count, status: "active", emoji: r.logo_emoji || r.emoji || "🍽️", logo_emoji: r.logo_emoji || r.emoji || "🍽️", logo_url: r.logo_url || null, scans: 0, rating: null, orders: 0, _realStats: stat });
          setFromFranchise(true);
        }
        setPage("dashboard");
      }} />}
      {page === "dashboard" && restaurant && <DashboardPage user={user} restaurant={restaurant} franchiseGroup={franchiseGroup} onRestaurantUpdate={r => setRestaurant(prev => ({ ...prev, ...r }))} onBack={() => { if (fromFranchise) { setFromFranchise(false); setPage("franchise"); } else if (user && user.id !== "demo") { setPage("restaurants"); } else { setPage("landing"); } }} onLogout={handleLogout} onCuisine={() => setPage("cuisine")} onClient={() => setPage("client")} onFranchise={() => setPage("franchise")} onHome={() => { if (!user || user.id === "demo") setPage("landing"); else if (franchiseGroup) setPage("franchise"); else setPage("restaurants"); }} />}
      {page === "cuisine" && restaurant && <CuisineView restaurant={restaurant} onBack={user ? () => setPage("dashboard") : null} onLogout={user ? handleLogout : null} />}
      {page === "client" && restaurant && <ClientView restaurant={restaurant} onBack={() => setPage("dashboard")} />}
    </StoreCtx.Provider>
    </LangCtx.Provider>
  );
}
