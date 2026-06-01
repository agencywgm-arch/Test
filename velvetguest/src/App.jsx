import { useState, useEffect, useRef, useCallback, createContext, useContext, Component } from "react";
import { supabase } from "./lib/supabase";
import QRCode from "qrcode";

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
  { id: "d1", table: 3, note: "Sans oignons", total: 32.40, payment_method: "card", status: "cooking", elapsed: 8, createdAt: _demoT(8), items: [
    { id: "di1", name: "Steak Frites", price: 19.90, qty: 1, emoji: "🥩", cat: "Plats" },
    { id: "di2", name: "Salade César", price: 9.00, qty: 1, emoji: "🥗", cat: "Entrées" },
    { id: "di3", name: "Coca-Cola", price: 3.50, qty: 1, emoji: "🥤", cat: "Boissons" },
  ]},
  { id: "d2", table: 7, note: "", total: 20.40, payment_method: "cash", status: "new", elapsed: 2, createdAt: _demoT(2), items: [
    { id: "di4", name: "Burger Maison", price: 13.90, qty: 1, emoji: "🍔", cat: "Plats" },
    { id: "di5", name: "Frites Maison", price: 4.00, qty: 1, emoji: "🍟", cat: "Accompagnements" },
    { id: "di6", name: "Eau Minérale", price: 3.00, qty: 1, emoji: "💧", cat: "Boissons" },
  ]},
  { id: "d3", table: 2, note: "Allergie arachides", total: 46.00, payment_method: "card", status: "ready", elapsed: 19, createdAt: _demoT(19), items: [
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
  const [ingredients, setIngredients] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [customers, setCustomers] = useState([]);

  const pushNotif = useCallback((msg, type = "info") => {
    const n = { id: Date.now(), msg, type };
    setNotifications(p => [n, ...p.slice(0, 4)]);
    setTimeout(() => setNotifications(p => p.filter(x => x.id !== n.id)), 5000);
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

    return () => { supabase.removeChannel(ch); clearInterval(tick); };
  }, [restaurantId]);

  const revenue = doneOrders.reduce((s, o) => s + o.total, 0);
  return { orders, servedOrders: doneOrders, doneOrders, notifications, pushNotif, revenue, ingredients, promotions, setPromotions, customers, setCustomers, launchCampaign };
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
function SignupPage({ onDone, onDemo }) {
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
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <p style={{ color: C.textTertiary, fontSize: 13, marginBottom: 12 }}>Pas encore prêt à vous inscrire ?</p>
          <button onClick={onDemo} style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "12px 28px", fontSize: 15, fontWeight: 700, color: C.dark, cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", ...FF }}>
            🎯 Voir la démo interactive →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESTAURANTS PAGE — wired to Supabase
// ─────────────────────────────────────────────────────────────────────────────
function RestaurantsPage({ user, onSelect, onLogout, onDemo }) {
  const first = (user.name || user.email).split(" ")[0];
  const h = new Date().getHours();
  const greet = h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
  const isMobile = useIsMobile();
  const [restaurants, setRestaurants] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", logo_emoji: "🍽️", tables_count: 8 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
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
      qr_url: `${window.location.origin}${window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "" : "/Test"}/r/${slug}/t/${i + 1}`,
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
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: isMobile ? 10 : 16 }}>
            {restaurants.map(r => {
              const mapped = mapRestaurant(r);
              return (
                <Surface key={r.id} className="hover-lift" onClick={() => onSelect(mapped)} style={{ padding: 24, cursor: "pointer", transition: "all 0.2s", position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{r.logo_emoji}</div>
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
            {/* Demo card */}
            <div onClick={onDemo} style={{ border: `2px dashed rgba(255,149,0,0.4)`, borderRadius: 16, padding: 24, cursor: "pointer", display: "flex", flexDirection: "column", minHeight: 200, gap: 0, transition: "all 0.2s", background: "rgba(255,149,0,0.03)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accentOrange; e.currentTarget.style.background = "rgba(255,149,0,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,149,0,0.4)"; e.currentTarget.style.background = "rgba(255,149,0,0.03)"; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,149,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🎯</div>
                <span style={{ background: "rgba(255,149,0,0.12)", color: C.accentOrange, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>DÉMO</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: C.dark, marginBottom: 4 }}>Explorer la démo</h3>
              <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: "auto", lineHeight: 1.5 }}>Testez toutes les fonctionnalités avec un faux restaurant et des données fictives.</p>
              <div style={{ borderTop: `1px solid rgba(255,149,0,0.2)`, paddingTop: 14, marginTop: 16, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: C.accentOrange, fontSize: 13, fontWeight: 600 }}>Accéder à la démo →</span>
              </div>
            </div>
            <div onClick={() => setShowCreate(true)} style={{ border: `2px dashed ${C.border}`, borderRadius: 16, padding: 24, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 8, transition: "all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.dark} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: C.textSecondary }}>+</div>
              <span style={{ color: C.textSecondary, fontSize: 14, fontWeight: 500 }}>Ajouter un restaurant</span>
            </div>
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
              <p style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>De : {restaurant?.name ?? "Votre restaurant"} &lt;contact@velvetguest.fr&gt;</p>
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

  // Cycle one alert at a time, every 15s
  useEffect(() => {
    if (allAlerts.length <= 1) return;
    const t = setInterval(() => setVisibleIdx(i => (i + 1) % allAlerts.length), 15000);
    return () => clearInterval(t);
  }, [allAlerts.length]);
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
              <button onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.textTertiary, fontSize: 14, padding: "0 2px", lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function DashboardPage({ user, restaurant, onBack, onCuisine, onClient }) {
  const store = useContext(StoreCtx);
  const [tab, setTab] = useState("overview");
  const isMobile = useIsMobile();
  const first = (user.name || user.email).split(" ")[0];
  const active = store.orders.filter(o => o.status !== "served");
  const ready = store.orders.filter(o => o.status === "ready");
  const [moreOpen, setMoreOpen] = useState(false);
  const TABS = [
    { id: "setup", label: "⚡ Setup", icon: "⚡" },
    { id: "overview", label: "Résumé", icon: "🏠" },
    { id: "orders", label: "Commandes", icon: "📋" },
    { id: "caisse", label: "Caisse", icon: "💰" },
    { id: "qrcode", label: "QR Codes", icon: "📷" },
    { id: "inventory", label: "Inventaire", icon: "📦" },
    { id: "promos", label: "Promos", icon: "🎁" },
    { id: "crm", label: "CRM", icon: "👥" },
    { id: "menu", label: "Carte", icon: "🍽️" },
  ];
  // Main 5 bottom nav tabs + "more" drawer for rest
  const MOBILE_TABS = [
    { id: "overview", icon: "🏠", label: "Accueil" },
    { id: "orders", icon: "📋", label: "Cmds" },
    { id: "caisse", icon: "💰", label: "Caisse" },
    { id: "crm", icon: "👥", label: "CRM" },
    { id: "promos", icon: "🎁", label: "Promos" },
  ];
  const MORE_TABS = [
    { id: "menu", icon: "🍽️", label: "Carte" },
    { id: "qrcode", icon: "📷", label: "QR Codes" },
    { id: "inventory", icon: "📦", label: "Inventaire" },
    { id: "setup", icon: "⚡", label: "Setup" },
  ];
  const demoBanner = restaurant.id === "demo";
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", ...FF }}>
      <style>{css}</style>
      <Toasts notifs={store.notifications} />
      {demoBanner && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1002, background: "linear-gradient(90deg, #FF9F0A, #FF6B00)", padding: "7px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <span style={{ fontSize: 13 }}>🎯</span>
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>MODE DÉMO — Tout est interactif, explorez librement !</span>
          {!isMobile && <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>· Données fictives, aucune modification enregistrée</span>}
        </div>
      )}
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0, paddingTop: demoBanner ? 36 : 0 }}>
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
      )}
      <AgentChat restaurant={restaurant} store={store} />
      <AlertBubbles store={store} restaurant={restaurant} />
      <main style={{ flex: 1, minWidth: 0, overflow: "auto", paddingBottom: isMobile ? 72 : 0 }}>
        {isMobile ? (
          /* Mobile header */
          <header style={{ background: "rgba(245,245,247,0.95)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`, padding: "0 16px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: demoBanner ? 34 : 0, zIndex: 50 }}>
            <div onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <div style={{ fontSize: 20 }}>{restaurant.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{restaurant.name}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {active.length > 0 && <button onClick={() => setTab("orders")} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", ...FF }}>{active.length} cmd</button>}
              <button onClick={onCuisine} style={{ background: ready.length > 0 ? C.accentGreen : C.bg, color: ready.length > 0 ? "#fff" : C.textSecondary, border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", ...FF }}>🍳</button>
            </div>
          </header>
        ) : (
          /* Desktop header */
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
        )}
        <div style={{ padding: isMobile ? "12px 12px" : "28px 32px" }}>
          {tab === "overview" && <OverviewTab store={store} restaurant={restaurant} onCuisine={onCuisine} onClient={onClient} />}
          {tab === "orders" && <OrdersTab store={store} />}
          {tab === "caisse" && <CaisseTab store={store} restaurant={restaurant} />}
          {tab === "qrcode" && <QRTab restaurant={restaurant} />}
          {tab === "setup" && <SetupTab restaurant={restaurant} onDone={() => setTab("overview")} />}
          {tab === "inventory" && <InventoryTab restaurant={restaurant} />}
          {tab === "promos" && <PromosTab restaurant={restaurant} store={store} />}
          {tab === "crm" && <CRMTab restaurant={restaurant} store={store} />}
          {tab === "menu" && <MenuTabDash restaurant={restaurant} />}
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
    if (restaurant.id === "demo") { setWeeklyRev(DEMO_WEEKLY_REV); return; }
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
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 20 }}>
        <KPICard label="Actives" value={active.length} sub="en cours" />
        <KPICard label="CA today" value={`${rev.toFixed(0)}€`} sub="clôturées" />
        <KPICard label="Servies" value={store.doneOrders.length} sub="aujourd'hui" />
        <KPICard label="Ticket moy." value={avgTicket > 0 ? `${avgTicket.toFixed(0)}€` : "—"} sub="moy." />
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

function OrdersTab({ store }) {
  const byStatus = s => store.orders.filter(o => o.status === s);
  const all = [...store.orders, ...store.servedOrders.slice(0, 4)];
  const isMobile = useIsMobile();
  return (
    <div className="fade-in">
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
                <p style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>#{o.id.slice ? o.id.slice(0, 6).toUpperCase() : o.id} · {o.total.toFixed(0)}€</p>
                <p style={{ fontSize: 11, color: C.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.items.map(i => i.name).join(", ")}</p>
              </div>
              {!isMobile && <p style={{ fontSize: 13, color: C.textSecondary, flexShrink: 0 }}>{Math.round(o.elapsed)} min</p>}
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
  const isMobile = useIsMobile();
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const baseUrl = customBase || window.location.origin;
  const basePath = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "" : "/Test";
  const url = `${baseUrl}${basePath}/r/${restaurant.slug}/t/${sel}`;
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
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: 16 }}>
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

const EMPTY_ITEM = { name: "", description: "", price: "", category: "Plats", emoji: "🍽️", photo_url: "", is_popular: false, available: true, stock: "" };
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
    if (restaurant.id === "demo") { setItems(DEMO_MENU); setLoading(false); return; }
    supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id).order("category").order("name")
      .then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, [restaurant.id]);

  function openAdd() { setForm(EMPTY_ITEM); setError(""); setModal({ mode: "add" }); }
  function openEdit(item) { setForm({ name: item.name, description: item.description, price: String(item.price), category: item.category, emoji: item.emoji, photo_url: item.photo_url || "", is_popular: item.is_popular, available: item.available, stock: item.stock == null ? "" : String(item.stock) }); setError(""); setModal({ mode: "edit", item }); }

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
    const payload = { ...form, price: parseFloat(form.price), stock, available, restaurant_id: restaurant.id };
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
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden", flexShrink: 0 }}>
                    {item.photo_url ? <img src={item.photo_url} alt="" style={{ width: 44, height: 44, objectFit: "cover" }} /> : item.emoji}
                  </div>
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
        {[{ id: "promos", label: "🎁 Promos" }, { id: "calendar", label: "📅 Calendrier" }].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: subTab === t.id ? C.white : "transparent", color: subTab === t.id ? C.dark : C.textSecondary, fontWeight: subTab === t.id ? 700 : 500, fontSize: 13, cursor: "pointer", boxShadow: subTab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s", ...FF }}>{t.label}</button>
        ))}
      </div>

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
              <p style={{ fontSize: 11, color: C.textTertiary, marginBottom: 8 }}>De : votre-restaurant@velvetguest.fr</p>
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
  const isMobile = useIsMobile();
  const byMethod = today.reduce((acc, o) => {
    const m = o.payment_method || "cash";
    acc[m] = (acc[m] || 0) + o.total;
    return acc;
  }, {});

  return (
    <div className="fade-in">
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 20 }}>
        <KPICard label="CA jour" value={`${revenue.toFixed(0)}€`} sub="clôturées" />
        <KPICard label="Commandes" value={today.length} sub="servies" />
        <KPICard label="Ticket moy." value={avgTicket > 0 ? `${avgTicket.toFixed(0)}€` : "—"} sub="" />
        <KPICard label="Espèces" value={`${(byMethod.cash || 0).toFixed(0)}€`} sub="à encaisser" />
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
      supabase.from("orders").update({ status: nextDB[o.status] }).eq("id", id).then(() => {});
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
  // Mock form state (used when Stripe not configured)
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
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
    if (window.Stripe) { init(); } else {
      const check = setInterval(() => { if (window.Stripe) { clearInterval(check); init(); } }, 100);
      return () => clearInterval(check);
    }
  }, [total, STRIPE_KEY]);

  async function pay() {
    if (!STRIPE_KEY) {
      // Simulate processing with a short delay
      setPaying(true);
      await new Promise(r => setTimeout(r, 1800));
      await onSuccess("card");
      return;
    }
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

  // ── Mock payment form (no Stripe key) ──────────────────────────────────────
  if (!STRIPE_KEY) {
    const fmtCard = v => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
    const fmtExp = v => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d; };
    const cardBrand = cardNum.startsWith("4") ? "VISA" : cardNum.startsWith("5") ? "MC" : cardNum.startsWith("3") ? "AMEX" : "";

    if (paying) return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.dark, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", position: "relative" }}>
          <div style={{ width: 56, height: 56, border: `3px solid ${C.dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ring 0.8s linear infinite", position: "absolute" }} />
          <span style={{ fontSize: 22 }}>💳</span>
        </div>
        <p style={{ fontSize: 17, fontWeight: 700, color: C.dark, marginBottom: 6 }}>Traitement en cours…</p>
        <p style={{ fontSize: 13, color: C.textSecondary }}>Veuillez patienter</p>
      </div>
    );

    return (
      <div>
        {/* Card visual */}
        <div style={{ background: "linear-gradient(135deg, #1D1D1F 0%, #3a3a3c 100%)", borderRadius: 16, padding: "20px 22px", marginBottom: 22, color: "#fff", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ position: "absolute", bottom: -30, left: 60, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div style={{ width: 36, height: 26, background: "linear-gradient(135deg, #FFD700, #FFA500)", borderRadius: 4 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>{cardBrand}</span>
          </div>
          <p style={{ fontSize: 18, fontWeight: 600, letterSpacing: "0.15em", marginBottom: 16, color: cardNum ? "#fff" : "rgba(255,255,255,0.3)" }}>
            {cardNum ? fmtCard(cardNum).padEnd(19, " ").replace(/ /g, " ") : "•••• •••• •••• ••••"}
          </p>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 2, letterSpacing: "0.08em" }}>NOM</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: name ? "#fff" : "rgba(255,255,255,0.3)" }}>{name || "PRÉNOM NOM"}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 2, letterSpacing: "0.08em" }}>EXPIRATION</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: expiry ? "#fff" : "rgba(255,255,255,0.3)" }}>{expiry || "MM/AA"}</p>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: "block", marginBottom: 6, letterSpacing: "0.05em" }}>NUMÉRO DE CARTE</label>
          <input value={fmtCard(cardNum)} onChange={e => setCardNum(e.target.value.replace(/\D/g, "").slice(0, 16))} placeholder="1234 5678 9012 3456" inputMode="numeric"
            style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", fontSize: 16, color: C.dark, outline: "none", letterSpacing: "0.1em", ...FF }} />
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: "block", marginBottom: 6, letterSpacing: "0.05em" }}>EXPIRATION</label>
            <input value={expiry} onChange={e => setExpiry(fmtExp(e.target.value))} placeholder="MM/AA" inputMode="numeric"
              style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", fontSize: 16, color: C.dark, outline: "none", ...FF }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: "block", marginBottom: 6, letterSpacing: "0.05em" }}>CVV</label>
            <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="•••" inputMode="numeric" type="password"
              style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", fontSize: 16, color: C.dark, outline: "none", ...FF }} />
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: "block", marginBottom: 6, letterSpacing: "0.05em" }}>NOM SUR LA CARTE</label>
          <input value={name} onChange={e => setName(e.target.value.toUpperCase())} placeholder="JEAN DUPONT"
            style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", fontSize: 15, color: C.dark, outline: "none", letterSpacing: "0.05em", ...FF }} />
        </div>
        {error && <p style={{ color: C.accent, fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button onClick={pay} style={{ width: "100%", padding: 16, background: C.dark, color: C.white, border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 10, ...FF }}>
          🔒 Payer {total.toFixed(2)} €
        </button>
        <button onClick={onCancel} style={{ width: "100%", padding: 14, background: "transparent", color: C.textSecondary, border: `1.5px solid ${C.border}`, borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: "pointer", ...FF }}>
          Annuler
        </button>
        <p style={{ textAlign: "center", fontSize: 11, color: C.textTertiary, marginTop: 14 }}>🔒 Paiement sécurisé · Stripe</p>
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
  const [cvChatOpen, setCvChatOpen] = useState(false);
  const [cvChatMsgs, setCvChatMsgs] = useState([{ role: "assistant", content: "Bonjour ! 👋 Des questions sur les allergènes ou les ingrédients ? Je suis là !" }]);
  const [cvChatInput, setCvChatInput] = useState("");
  const [cvChatLoading, setCvChatLoading] = useState(false);
  const tableNum = 1;

  async function sendCvChat() {
    if (!cvChatInput.trim() || cvChatLoading) return;
    const userMsg = { role: "user", content: cvChatInput.trim() };
    const next = [...cvChatMsgs, userMsg];
    setCvChatMsgs(next); setCvChatInput(""); setCvChatLoading(true);
    try {
      const menuSummary = menuItems.map(i => `${i.emoji} ${i.name} (${i.category}) — ${i.description || "sans description"}`).join("\n");
      const ctx = `Restaurant : ${restaurant?.name}\nTable : ${tableNum}\n\nMenu disponible :\n${menuSummary}`;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ messages: next, context: ctx, mode: "customer" }),
      });
      const { content } = await res.json();
      setCvChatMsgs(p => [...p, { role: "assistant", content: content || "Désolé, je n'ai pas pu répondre." }]);
    } catch { setCvChatMsgs(p => [...p, { role: "assistant", content: "Désolé, une erreur est survenue." }]); }
    setCvChatLoading(false);
  }

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
    setOrdering(true); setOrderError("");
    try {
      // Find or auto-create table 1
      let { data: tbl } = await supabase.from("tables").select("id").eq("restaurant_id", restaurant.id).eq("number", tableNum).single();
      if (!tbl) {
        const { data: newTbl } = await supabase.from("tables")
          .insert({ restaurant_id: restaurant.id, number: tableNum, qr_url: `${window.location.origin}${window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "" : "/Test"}/r/${restaurant.slug}/t/${tableNum}` })
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
      await supabase.from("order_items").insert(cart.map(i => ({ order_id: order.id, menu_item_id: i.id, quantity: i.qty, detail: "" })));
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
      <ClientViewChat menuItems={menuItems} restaurant={restaurant} tableNum={tableNum} />
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
      <ClientViewChat menuItems={menuItems} restaurant={restaurant} tableNum={tableNum} />
    </Frame>
  );

  if (step === "payment") return (
    <Frame>
      <div style={{ padding: "48px 20px 0" }}>
        <button onClick={() => payMode ? setPayMode(null) : setStep("cart")} style={{ background: "none", border: "none", color: C.accent, fontWeight: 600, fontSize: 14, cursor: "pointer", padding: 0, marginBottom: 16, ...FF }}>← Retour</button>
        <p style={{ fontSize: 26, fontWeight: 800, color: C.dark, letterSpacing: "-0.04em", marginBottom: 4 }}>Paiement</p>
        <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 20 }}>Table {tableNum} · {restaurant.name}</p>
        {ordering && <div style={{ textAlign: "center", padding: "20px 0" }}><div style={{ width: 28, height: 28, border: `3px solid ${C.dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ring 0.8s linear infinite", margin: "0 auto 10px" }} /><p style={{ fontSize: 13, color: C.textSecondary }}>Enregistrement…</p></div>}
        {orderError && <div style={{ background: "#FFF0F3", border: `1.5px solid ${C.accent}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.accent }}>{orderError}</div>}
        {!ordering && !payMode && (
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
        ) : !ordering && (
          <CardPaymentForm total={total} onSuccess={confirmOrder} onCancel={() => setPayMode(null)} />
        )}
      </div>
      <ClientViewChat menuItems={menuItems} restaurant={restaurant} tableNum={tableNum} />
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
// CLIENT VIEW CHAT WIDGET — allergen assistant in admin preview
// ─────────────────────────────────────────────────────────────────────────────
function ClientViewChat({ menuItems, restaurant, tableNum }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Bonjour ! 👋 Des questions sur les allergènes ou les ingrédients ? Je suis là !" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const next = [...msgs, userMsg];
    setMsgs(next); setInput(""); setLoading(true);
    try {
      const menuSummary = menuItems.map(i => `${i.emoji} ${i.name} (${i.category}) — ${i.description || "sans description"}`).join("\n");
      const ctx = `Restaurant : ${restaurant?.name}\nTable : ${tableNum}\n\nMenu disponible :\n${menuSummary}`;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ messages: next, context: ctx, mode: "customer" }),
      });
      const { content } = await res.json();
      setMsgs(p => [...p, { role: "assistant", content: content || "Désolé, je n'ai pas pu répondre." }]);
    } catch { setMsgs(p => [...p, { role: "assistant", content: "Désolé, une erreur est survenue." }]); }
    setLoading(false);
  }

  return (
    <>
      <button onClick={() => setOpen(p => !p)}
        style={{ position: "fixed", bottom: 100, right: 32, width: 48, height: 48, borderRadius: "50%", background: C.dark, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", zIndex: 200, ...FF }}
        title="Aide & allergènes">💬</button>
      {open && (
        <div style={{ position: "fixed", bottom: 162, right: 20, left: 20, maxWidth: 380, margin: "0 auto", background: C.white, borderRadius: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.22)", zIndex: 200, display: "flex", flexDirection: "column", maxHeight: 400, ...FF }}>
          <div style={{ background: C.dark, borderRadius: "20px 20px 0 0", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 18 }}>🤖</span>
              <div>
                <p style={{ color: C.white, fontWeight: 700, fontSize: 13, margin: 0 }}>Assistant Velvet</p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, margin: 0 }}>Allergènes & ingrédients</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, width: 26, height: 26, color: C.white, cursor: "pointer", fontSize: 13, ...FF }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "82%", background: m.role === "user" ? C.dark : C.bg, color: m.role === "user" ? C.white : C.dark, borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "9px 12px", fontSize: 12, lineHeight: 1.5 }}>{m.content}</div>
              </div>
            ))}
            {loading && <div style={{ display: "flex" }}><div style={{ background: C.bg, borderRadius: "16px 16px 16px 4px", padding: "9px 14px", fontSize: 12, color: C.textTertiary }}>···</div></div>}
            {msgs.length === 1 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                {["Plats sans gluten ?", "Végétarien ?", "Allergènes ?"].map(q => (
                  <button key={q} onClick={() => setInput(q)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 10px", fontSize: 11, color: C.dark, cursor: "pointer", ...FF }}>{q}</button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: "8px 12px 12px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 7 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Poser une question…"
              style={{ flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "8px 11px", fontSize: 12, color: C.dark, outline: "none", ...FF }} />
            <button onClick={send} disabled={!input.trim() || loading}
              style={{ width: 34, height: 34, borderRadius: 10, background: input.trim() && !loading ? C.dark : C.bg, border: "none", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", ...FF }}>
              <span style={{ color: input.trim() && !loading ? C.white : C.textTertiary, fontSize: 14 }}>↑</span>
            </button>
          </div>
        </div>
      )}
    </>
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
    { role: "assistant", content: `Bonjour ! Je suis Velvet, votre assistant IA 👋\n\nJe connais toutes les fonctionnalités de VelvetGuest et je peux vous conseiller sur votre carte, vos stocks, votre caisse et bien plus.\n\nComment puis-je vous aider ?` }
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
      {/* Floating pill button */}
      {!open && (
        <button
          onClick={onOpen}
          className="btn-press"
          style={{
            position: "fixed", bottom: "max(24px, env(safe-area-inset-bottom, 24px))", right: 16,
            zIndex: 200, display: "flex", alignItems: "center", gap: 8,
            background: C.dark, border: "none", borderRadius: 28,
            padding: "12px 18px 12px 14px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.28)",
            cursor: "pointer", ...FF,
          }}
        >
          <span style={{ fontSize: 20 }}>💬</span>
          <span style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>Aide & allergènes</span>
          {msgs.length === 1 && (
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.accentGreen, flexShrink: 0, boxShadow: "0 0 0 2px rgba(52,199,89,0.3)" }} />
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
                  <p style={{ fontSize: 16, fontWeight: 800, color: C.dark, letterSpacing: "-0.02em" }}>Assistant Velvet</p>
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
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 8 : 14, marginBottom: isMobile ? 14 : 24 }}>
        {[
          { label: "Clients", value: customers.length, color: C.dark },
          { label: "Actifs 30j", value: activeCount, color: C.accentGreen },
          { label: "À relancer", value: inactiveCount, color: C.accentOrange },
          { label: "Panier moy.", value: `${avgTicket.toFixed(0)}€`, color: C.accentPurple },
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
                  { label: "Total", value: `${(c.total_spent || 0).toFixed(0)}€` },
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
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [profileSkipped, setProfileSkipped] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([{ role: "assistant", content: "Bonjour ! 👋 Je suis là pour répondre à vos questions sur les allergènes, ingrédients ou plats. Comment puis-je vous aider ?" }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [activePromos, setActivePromos] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        // demo slug — use local data without Supabase
        if (slug === "demo") {
          setRestaurant(DEMO_RESTAURANT);
          setMenuItems(DEMO_MENU);
          setTableId(`demo-t${tableNum}`);
          setStep("menu");
          return;
        }
        const { data: resto, error: restoErr } = await supabase.from("restaurants").select("*").eq("slug", slug).single();
        if (restoErr || !resto) { setStep("error"); return; }
        setRestaurant(resto);
        const [tblRes, itemsRes] = await Promise.all([
          supabase.from("tables").select("id").eq("restaurant_id", resto.id).eq("number", tableNum).single(),
          supabase.from("menu_items").select("*").eq("restaurant_id", resto.id).eq("available", true).order("category").order("name"),
        ]);
        setTableId(tblRes.data?.id ?? null);
        setMenuItems(itemsRes.data ?? []);
        // promos optional — table may not exist yet
        try {
          const { data: promos } = await supabase.from("promotions").select("*").eq("restaurant_id", resto.id).eq("active", true);
          setActivePromos(promos ?? []);
        } catch {}
        setStep("menu");
      } catch {
        setStep("error");
      }
    }
    load();
  }, [slug, tableNum]);

  const cats = ["Tous", ...Array.from(new Set(menuItems.map(i => i.category)))];
  const filtered = activeCat === "Tous" ? menuItems : menuItems.filter(i => i.category === activeCat);
  // Apply best active promo discount to all items
  const bestDiscount = activePromos.reduce((max, p) => Math.max(max, p.discount_percent || 0), 0);
  const filteredWithPromo = filtered.map(item => bestDiscount > 0 ? { ...item, _originalPrice: item.price, price: +(item.price * (1 - bestDiscount / 100)).toFixed(2) } : item);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  const add = item => setCart(p => { const e = p.find(i => i.id === item.id); return e ? p.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) : [...p, { ...item, qty: 1 }]; });
  const rem = id => setCart(p => { const e = p.find(i => i.id === id); return e.qty === 1 ? p.filter(i => i.id !== id) : p.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i); });

  async function confirm(paymentMethod = "cash") {
    setConfirming(true); setConfirmError("");
    try {
      // Auto-create table if not found
      let tid = tableId;
      if (!tid) {
        const { data: newTbl } = await supabase.from("tables")
          .insert({ restaurant_id: restaurant.id, number: tableNum, qr_url: window.location.href })
          .select("id").single();
        tid = newTbl?.id ?? null;
      }

      let { data: order, error } = await supabase.from("orders")
        .insert({ restaurant_id: restaurant.id, table_id: tid, note, total, status: "PENDING", payment_method: paymentMethod, customer_name: customerName.trim(), customer_email: customerEmail.trim() })
        .select().single();

      // Fallback if extra columns not migrated yet
      if (error && (error.message?.includes("column") || error.message?.includes("payment_method"))) {
        ({ data: order, error } = await supabase.from("orders")
          .insert({ restaurant_id: restaurant.id, table_id: tid, note, total, status: "PENDING" })
          .select().single());
      }

      if (error || !order) { setConfirmError("Erreur lors de la commande. Veuillez réessayer."); setConfirming(false); return; }

      const orderItems = cart.map(i => ({ order_id: order.id, menu_item_id: i.id, quantity: i.qty, detail: "" }));
      await supabase.from("order_items").insert(orderItems);

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
      setStep("done");
      // Upsert customer profile
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
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {count > 0 && <button onClick={() => setStep("cart")} style={{ background: C.accent, border: "none", borderRadius: 20, padding: "10px 18px", color: C.white, fontWeight: 700, fontSize: 14, cursor: "pointer", ...FF }}>🛒 {count} · {total.toFixed(2)}€</button>}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto", background: C.dark, scrollbarWidth: "none" }}>
            {cats.map(c => <button key={c} onClick={() => setActiveCat(c)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 20, border: "none", background: activeCat === c ? C.white : "rgba(255,255,255,0.1)", color: activeCat === c ? C.dark : "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: 12, cursor: "pointer", ...FF }}>{c}</button>)}
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
          <div>
            {filteredWithPromo.map(item => {
              const inCart = cart.find(i => i.id === item.id);
              return (
                <div key={item.id} style={{ display: "flex", gap: 12, padding: "16px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 60, height: 60, borderRadius: 14, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0, overflow: "hidden" }}>
                    {item.photo_url ? <img src={item.photo_url} alt={item.name} style={{ width: 60, height: 60, objectFit: "cover" }} /> : item.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{item.name}</p>
                        {item.is_popular && <span style={{ background: C.accent + "15", color: C.accent, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, display: "inline-block", marginTop: 3 }}>⭐ Populaire</span>}
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
          <button onClick={() => setStep("profile")} style={{ width: "100%", padding: 16, background: C.dark, color: C.white, border: "none", borderRadius: 14, fontSize: 17, fontWeight: 700, cursor: "pointer", ...FF }}>Paiement →</button>
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
            onClick={() => { if (!customerEmail.trim()) return; setStep("payment"); }}
            disabled={!customerEmail.trim()}
            style={{ width: "100%", padding: "16px", background: customerEmail.trim() ? C.dark : C.textTertiary, color: "#fff", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: customerEmail.trim() ? "pointer" : "not-allowed", marginBottom: 12, ...FF }}>
            Continuer vers le paiement →
          </button>
          <button onClick={() => { setProfileSkipped(true); setStep("payment"); }} style={{ width: "100%", padding: "12px", background: "none", color: C.textTertiary, border: "none", fontSize: 14, cursor: "pointer", ...FF }}>
            Passer cette étape
          </button>
          <p style={{ fontSize: 11, color: C.textTertiary, textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
            🔒 Vos données sont protégées et utilisées uniquement pour votre ticket et les offres du restaurant.
          </p>
        </div>
      )}

      {step === "payment" && (
        <div style={{ padding: "40px 20px 24px" }}>
          {confirming ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16 }}>
              <div style={{ width: 40, height: 40, border: `3px solid ${C.dark}`, borderTopColor: "transparent", borderRadius: "50%", animation: "ring 0.8s linear infinite" }} />
              <p style={{ fontSize: 15, color: C.textSecondary, fontWeight: 500 }}>Enregistrement de votre commande…</p>
            </div>
          ) : (
            <>
              <button onClick={() => payMode ? setPayMode(null) : setStep("cart")} style={{ background: "none", border: "none", color: C.accent, fontWeight: 600, fontSize: 15, cursor: "pointer", padding: 0, marginBottom: 20, ...FF }}>← Retour</button>
              <p style={{ fontSize: 28, fontWeight: 800, color: C.dark, letterSpacing: "-0.04em", marginBottom: 6 }}>Paiement</p>
              <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 24 }}>Table {tableNum} · {restaurant?.name}</p>
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
            </>
          )}
        </div>
      )}

      {step === "done" && (() => {
        const orderDate = new Date();
        const shortId = orderId ? orderId.slice(0, 8).toUpperCase() : "--------";
        const payLabel = { cash: "Espèces", card: "Carte bancaire", apple_pay: "Apple Pay", google_pay: "Google Pay" };
        return (
          <div style={{ padding: "40px 20px 60px", background: "#f8f8f8", minHeight: "100vh" }}>
            {/* Success banner */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.accentGreen + "20", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 30 }}>✅</div>
              <p style={{ fontSize: 24, fontWeight: 900, color: C.dark, letterSpacing: "-0.03em", marginBottom: 6 }}>Commande envoyée !</p>
              <p style={{ color: C.textSecondary, fontSize: 14 }}>Votre commande est en cuisine · Table {tableNum}</p>
            </div>

            {/* Ticket */}
            <div id="ticket-receipt" style={{ background: C.white, borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", marginBottom: 20 }}>
              {/* Ticket header */}
              <div style={{ background: C.dark, padding: "20px 20px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 24 }}>{restaurant?.logo_emoji}</span>
                  <p style={{ fontSize: 17, fontWeight: 800, color: C.white, letterSpacing: "-0.02em" }}>{restaurant?.name}</p>
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Table {tableNum} · {orderDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} à {orderDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
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
                  {cart.map(i => (
                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 18 }}>{i.emoji}</span>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: C.dark, lineHeight: 1.2 }}>{i.name}</p>
                          <p style={{ fontSize: 12, color: C.textTertiary }}>{Number(i.price).toFixed(2)}€ × {i.qty}</p>
                        </div>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{(Number(i.price) * i.qty).toFixed(2)}€</p>
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

                {/* Footer */}
                <p style={{ fontSize: 13, color: C.textTertiary, textAlign: "center", fontStyle: "italic" }}>Merci de votre visite ! 🙏</p>
              </div>

              {/* Decorative zigzag bottom */}
              <div style={{ height: 12, background: `repeating-linear-gradient(90deg, #f8f8f8 0px, #f8f8f8 8px, ${C.white} 8px, ${C.white} 16px)` }} />
            </div>

            {/* Rating */}
            <div style={{ background: C.white, borderRadius: 16, padding: "18px 20px", marginBottom: 16, textAlign: "center" }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: C.dark, marginBottom: 12 }}>Comment s'est passée votre expérience ?</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                {[1,2,3,4,5].map(s => <button key={s} onClick={() => setRating(s)} style={{ fontSize: 30, background: "none", border: "none", cursor: "pointer", transform: rating >= s ? "scale(1.2)" : "scale(1)", transition: "transform 0.15s", filter: rating >= s ? "none" : "grayscale(1)" }}>⭐</button>)}
              </div>
              {rating > 0 && <p style={{ color: C.accentGreen, fontWeight: 600, fontSize: 14 }}>Merci pour votre avis ! 🙏</p>}
            </div>

            <button onClick={() => { setStep("menu"); setCart([]); setNote(""); setRating(0); setCustomerName(""); setCustomerEmail(""); setCustomerPhone(""); setProfileSkipped(false); setPayMode(null); }} style={{ width: "100%", padding: 16, background: C.white, color: C.dark, border: `1.5px solid ${C.border}`, borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", ...FF }}>Commander autre chose</button>
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT — Supabase session restore
// ─────────────────────────────────────────────────────────────────────────────
function AppInner() {
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
      {page === "signup" && <SignupPage onDone={u => { setUser(u); setPage("restaurants"); }} onDemo={() => { setUser({ id: "demo", name: "Démo", email: "demo@velvetguest.com" }); setRestaurant(DEMO_RESTAURANT); setPage("dashboard"); }} />}
      {page === "restaurants" && user && <RestaurantsPage user={user} onSelect={r => { setRestaurant(r); setPage("dashboard"); }} onLogout={handleLogout} onDemo={() => { setRestaurant(DEMO_RESTAURANT); setPage("dashboard"); }} />}
      {page === "dashboard" && restaurant && <DashboardPage user={user} restaurant={restaurant} onBack={() => setPage("restaurants")} onCuisine={() => setPage("cuisine")} onClient={() => setPage("client")} />}
      {page === "cuisine" && restaurant && <CuisineView restaurant={restaurant} onBack={() => setPage("dashboard")} />}
      {page === "client" && restaurant && <ClientView restaurant={restaurant} onBack={() => setPage("dashboard")} />}
    </StoreCtx.Provider>
  );
}
