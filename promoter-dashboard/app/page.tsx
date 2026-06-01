"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================
// MOCK DATA
// ============================================================
const mockProfiles = [
  { id: 1, name: "Sarah M.", age: 26, city: "Paris", instagram: "@sarahm_prs", reliability: 96, events: 24, attendance: 98, badge: "Top Performer", avatar: "SM" },
  { id: 2, name: "Emma L.", age: 24, city: "Monaco", instagram: "@emmalux", reliability: 91, events: 18, attendance: 94, badge: "VIP Regular", avatar: "EL" },
  { id: 3, name: "Julie R.", age: 28, city: "Cannes", instagram: "@julie.riviera", reliability: 88, events: 31, attendance: 90, badge: "Loyal Guest", avatar: "JR" },
  { id: 4, name: "Camille D.", age: 25, city: "Paris", instagram: "@camille.d", reliability: 79, events: 12, attendance: 83, badge: "Rising Star", avatar: "CD" },
  { id: 5, name: "Léa P.", age: 27, city: "Lyon", instagram: "@lea.party", reliability: 93, events: 20, attendance: 95, badge: "Top Performer", avatar: "LP" },
  { id: 6, name: "Ines B.", age: 23, city: "Nice", instagram: "@inesb_nice", reliability: 85, events: 9, attendance: 87, badge: "New Profile", avatar: "IB" },
];

const mockVIPRequests = [
  { id: "#1482", people: 8, budget: "€3,000", qualification: "High", name: "Alexandre P.", time: "2 min ago", status: "pending" },
  { id: "#1481", people: 6, budget: "€1,800", qualification: "Medium", name: "Sophie K.", time: "15 min ago", status: "pending" },
  { id: "#1480", people: 10, budget: "€4,500", qualification: "High", name: "Marco V.", time: "1 hr ago", status: "accepted" },
  { id: "#1479", people: 4, budget: "€1,200", qualification: "Low", name: "Anna T.", time: "3 hr ago", status: "rejected" },
];

const mockActivity = [
  { icon: "💬", text: "AI replied to 14 guests in the last hour", time: "2 min ago", type: "ai" },
  { icon: "⭐", text: "New VIP request from Alexandre P. — €3,000 budget", time: "5 min ago", type: "vip" },
  { icon: "✅", text: "Emma L. confirmed for Saturday Night", time: "12 min ago", type: "confirm" },
  { icon: "📤", text: "Campaign sent to 48 profiles", time: "30 min ago", type: "campaign" },
  { icon: "🎉", text: "Event 'Black Label Night' launched", time: "1 hr ago", type: "event" },
  { icon: "💬", text: "AI handled 23 dress code inquiries", time: "2 hr ago", type: "ai" },
];

const mockConversations = [
  { from: "Guest", message: "Are there spots left for Friday?", type: "guest" },
  { from: "AI Copilot", message: "Yes, there are currently 3 spots available for Friday night. Would you like me to reserve your place?", type: "ai" },
  { from: "Guest", message: "What is the dress code?", type: "guest" },
  { from: "AI Copilot", message: "Elegant attire is required — no sportswear, no sneakers. Think cocktail or smart casual for gentlemen, and evening wear for ladies.", type: "ai" },
  { from: "VIP Client", message: "How much is a table for 6?", type: "vip" },
  { from: "AI Copilot", message: "Tables for 6 start at €1,500, which includes a bottle of premium champagne. Diamond packages for 10 guests start at €3,000. Shall I send you the full menu?", type: "ai" },
  { from: "Guest", message: "What time does the night start?", type: "guest" },
  { from: "AI Copilot", message: "Doors open at midnight. We recommend arriving before 1 AM for the best experience. VIP guests have priority access from 11:30 PM.", type: "ai" },
];

// ============================================================
// ICONS
// ============================================================
const Icon = ({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) => {
  const icons: Record<string, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    bot: <><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 11V8"/><circle cx="12" cy="6" r="2"/><path d="M8 15h.01M16 15h.01"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    crown: <><path d="M2 20h20M4 20l2-8 6 4 6-4 2 8"/><circle cx="12" cy="8" r="2"/></>,
    send: <><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></>,
    heart: <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.27 12.8a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.18 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    zap: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    message: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    sparkle: <><path d="M12 3L9.27 9.27 3 12l6.27 2.73L12 21l2.73-6.27L21 12l-6.27-2.73z"/></>,
    instagram: <><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {icons[name]}
    </svg>
  );
};

// ============================================================
// GLOBAL STYLES
// ============================================================
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Josefin+Sans:wght@300;400;500;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --gold: #C9A84C;
      --gold-light: #E8C96B;
      --gold-dim: #8B6914;
      --gold-glow: rgba(201, 168, 76, 0.15);
      --bg: #030303;
      --surface: #0A0A0A;
      --surface2: #111111;
      --surface3: #1A1A1A;
      --border: rgba(201, 168, 76, 0.12);
      --border-bright: rgba(201, 168, 76, 0.3);
      --text: #F5F0E8;
      --text-dim: #8A8070;
      --text-muted: #4A4540;
    }

    html, body { background: var(--bg); color: var(--text); font-family: 'Josefin Sans', sans-serif; overflow-x: hidden; }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--gold-dim); border-radius: 2px; }

    .font-display { font-family: 'Cormorant Garamond', serif; }

    .gold-gradient { background: linear-gradient(135deg, #C9A84C 0%, #E8C96B 50%, #C9A84C 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

    .gold-border { border: 1px solid var(--border); }
    .gold-border-bright { border: 1px solid var(--border-bright); }

    .surface { background: var(--surface); }
    .surface2 { background: var(--surface2); }
    .surface3 { background: var(--surface3); }

    .glow-gold { box-shadow: 0 0 30px rgba(201, 168, 76, 0.08), inset 0 0 30px rgba(201, 168, 76, 0.03); }

    .btn-gold {
      background: linear-gradient(135deg, #C9A84C, #E8C96B);
      color: #000;
      font-family: 'Josefin Sans', sans-serif;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-size: 11px;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
      padding: 10px 20px;
      border-radius: 2px;
    }
    .btn-gold:hover { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(201, 168, 76, 0.3); }

    .btn-outline {
      background: transparent;
      color: var(--gold);
      font-family: 'Josefin Sans', sans-serif;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-size: 11px;
      border: 1px solid var(--border-bright);
      cursor: pointer;
      transition: all 0.3s ease;
      padding: 9px 18px;
      border-radius: 2px;
    }
    .btn-outline:hover { background: var(--gold-glow); border-color: var(--gold); }

    .btn-ghost {
      background: transparent;
      color: var(--text-dim);
      font-family: 'Josefin Sans', sans-serif;
      font-weight: 400;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-size: 11px;
      border: 1px solid rgba(255,255,255,0.06);
      cursor: pointer;
      transition: all 0.3s ease;
      padding: 9px 18px;
      border-radius: 2px;
    }
    .btn-ghost:hover { border-color: var(--border-bright); color: var(--text); }

    .metric-card {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 24px;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    .metric-card:hover { border-color: var(--border-bright); transform: translateY(-2px); }
    .metric-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--gold), transparent);
      opacity: 0.5;
    }

    .chat-bubble-ai {
      background: linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.04));
      border: 1px solid rgba(201,168,76,0.15);
      border-radius: 2px 12px 12px 12px;
    }
    .chat-bubble-guest {
      background: var(--surface3);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px 2px 12px 12px;
    }
    .chat-bubble-vip {
      background: linear-gradient(135deg, rgba(201,168,76,0.15), rgba(232,201,107,0.08));
      border: 1px solid rgba(201,168,76,0.25);
      border-radius: 12px 2px 12px 12px;
    }

    .profile-card {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
      transition: all 0.4s ease;
    }
    .profile-card:hover { border-color: var(--gold-dim); transform: translateY(-4px); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }

    .input-luxury {
      background: var(--surface3);
      border: 1px solid var(--border);
      color: var(--text);
      font-family: 'Josefin Sans', sans-serif;
      font-size: 13px;
      letter-spacing: 0.05em;
      padding: 12px 16px;
      border-radius: 2px;
      width: 100%;
      outline: none;
      transition: all 0.3s ease;
    }
    .input-luxury:focus { border-color: var(--gold-dim); background: rgba(26,26,26,0.9); }
    .input-luxury::placeholder { color: var(--text-muted); }

    .label-luxury {
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-dim);
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .sidebar-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 16px;
      border-radius: 2px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 12px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: 500;
      color: var(--text-muted);
      border: 1px solid transparent;
      margin-bottom: 2px;
    }
    .sidebar-item:hover { color: var(--text-dim); background: rgba(255,255,255,0.03); }
    .sidebar-item.active { color: var(--gold); background: var(--gold-glow); border-color: var(--border); }

    .vip-request {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 20px;
      transition: all 0.3s ease;
    }
    .vip-request:hover { border-color: var(--border-bright); }

    .table-card {
      background: var(--surface2);
      border-radius: 4px;
      padding: 28px;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    .table-card:hover { transform: translateY(-3px); }

    .noise-overlay {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
      opacity: 0.4;
    }

    @keyframes pulse-gold { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
    @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

    .pulse { animation: pulse-gold 2s ease-in-out infinite; }
    .float { animation: float 4s ease-in-out infinite; }

    .shimmer-text {
      background: linear-gradient(90deg, var(--gold) 0%, var(--gold-light) 25%, #fff 50%, var(--gold-light) 75%, var(--gold) 100%);
      background-size: 200%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 4s linear infinite;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 1px;
      font-size: 9px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      font-weight: 600;
    }
    .tag-gold { background: rgba(201,168,76,0.12); color: var(--gold); border: 1px solid rgba(201,168,76,0.2); }
    .tag-green { background: rgba(52,211,153,0.08); color: #34D399; border: 1px solid rgba(52,211,153,0.15); }
    .tag-red { background: rgba(248,113,113,0.08); color: #F87171; border: 1px solid rgba(248,113,113,0.15); }
    .tag-blue { background: rgba(96,165,250,0.08); color: #60A5FA; border: 1px solid rgba(96,165,250,0.15); }
    .tag-dim { background: rgba(255,255,255,0.04); color: var(--text-muted); border: 1px solid rgba(255,255,255,0.06); }

    .divider { height: 1px; background: linear-gradient(90deg, transparent, var(--border-bright), transparent); margin: 24px 0; }
  `}</style>
);

// ============================================================
// SIDEBAR
// ============================================================
const Sidebar = ({
  active,
  setActive,
  collapsed,
  setCollapsed,
}: {
  active: string;
  setActive: (p: string) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) => {
  const nav = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "assistant", label: "AI Assistant", icon: "bot" },
    { id: "events", label: "Create Event", icon: "calendar" },
    { id: "profiles", label: "Profiles", icon: "users" },
    { id: "vip", label: "VIP Tables", icon: "crown" },
  ];

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        position: "fixed", left: 0, top: 0, bottom: 0,
        background: "linear-gradient(180deg, #080808 0%, #050505 100%)",
        borderRight: "1px solid var(--border)",
        zIndex: 100,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "28px 20px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, minWidth: 28,
            background: "linear-gradient(135deg, #C9A84C, #E8C96B)",
            borderRadius: 2,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#000" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 700 }}>Nightlife</div>
              <div style={{ fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--text-muted)", marginTop: 1 }}>Copilot</div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: "16px 10px", overflowY: "auto" }}>
        {nav.map(item => (
          <div
            key={item.id}
            className={`sidebar-item ${active === item.id ? "active" : ""}`}
            onClick={() => setActive(item.id)}
            style={{ justifyContent: collapsed ? "center" : "flex-start", padding: collapsed ? "11px" : "11px 16px" }}
            title={collapsed ? item.label : ""}
          >
            <Icon name={item.icon} size={16} />
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
                {item.label}
              </motion.span>
            )}
            {!collapsed && active === item.id && (
              <motion.div
                layoutId="activeBar"
                style={{ marginLeft: "auto", width: 3, height: 16, background: "var(--gold)", borderRadius: 2 }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Collapse toggle */}
      <div style={{ padding: "16px 10px", borderTop: "1px solid var(--border)" }}>
        <div
          className="sidebar-item"
          onClick={() => setCollapsed(!collapsed)}
          style={{ justifyContent: "center", padding: "10px" }}
        >
          <motion.div animate={{ rotate: collapsed ? 0 : 180 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// DASHBOARD PAGE
// ============================================================
const DashboardPage = ({ setPage }: { setPage: (p: string) => void }) => {
  const metrics = [
    { label: "Active Events", value: "7", delta: "+2 this week", icon: "calendar", color: "var(--gold)" },
    { label: "Invitations Sent", value: "1,284", delta: "+186 today", icon: "send", color: "#60A5FA" },
    { label: "Confirmations", value: "847", delta: "66% rate", icon: "check", color: "#34D399" },
    { label: "VIP Requests", value: "23", delta: "+5 pending", icon: "crown", color: "var(--gold-light)" },
  ];

  const quickActions = [
    { label: "Create Event", icon: "plus", page: "events", color: "var(--gold)" },
    { label: "View Profiles", icon: "users", page: "profiles", color: "#60A5FA" },
    { label: "VIP Requests", icon: "crown", page: "vip", color: "var(--gold-light)" },
    { label: "AI Assistant", icon: "bot", page: "assistant", color: "#34D399" },
  ];

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
              Sunday, 1 June 2026
            </div>
            <h1 className="font-display" style={{ fontSize: 40, fontWeight: 300, color: "var(--text)", lineHeight: 1 }}>
              Good evening, <span className="gold-gradient">Promoter</span>
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ padding: "8px 16px", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 2 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#34D399" }}>● AI Active</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="metric-card"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)" }}>{m.label}</div>
              <div style={{ color: m.color, opacity: 0.7 }}>
                <Icon name={m.icon} size={16} />
              </div>
            </div>
            <div className="font-display" style={{ fontSize: 42, fontWeight: 300, color: m.color, lineHeight: 1, marginBottom: 8 }}>{m.value}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em" }}>{m.delta}</div>
          </motion.div>
        ))}
      </div>

      {/* AI Activity Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{
          background: "linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(232,201,107,0.03) 100%)",
          border: "1px solid rgba(201,168,76,0.2)",
          borderRadius: 4,
          padding: "24px 28px",
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: 200, background: "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 44, height: 44,
              background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.08))",
              border: "1px solid rgba(201,168,76,0.3)",
              borderRadius: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
            }} className="float">
              <Icon name="bot" size={20} />
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: 4 }}>AI Assistant</div>
              <div className="shimmer-text font-display" style={{ fontSize: 22, fontWeight: 400 }}>
                127 messages answered today
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {[["87%", "Auto-handled"], ["2.1s", "Avg response"], ["99.2%", "Uptime"]].map(([val, lbl]) => (
              <div key={lbl} style={{ textAlign: "center" }}>
                <div className="font-display" style={{ fontSize: 24, fontWeight: 300, color: "var(--gold)" }}>{val}</div>
                <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", marginTop: 2 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Activity Feed */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 20 }}>Recent Activity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {mockActivity.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.06 }}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "14px 0",
                  borderBottom: i < mockActivity.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                <div style={{ fontSize: 16, minWidth: 24 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5, letterSpacing: "0.03em" }}>{item.text}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, letterSpacing: "0.08em" }}>{item.time}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 20 }}>Quick Actions</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {quickActions.map((a, i) => (
              <motion.div
                key={a.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.07 }}
                onClick={() => setPage(a.page)}
                style={{
                  background: "var(--surface3)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "20px 16px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  textAlign: "center",
                }}
                whileHover={{ scale: 1.03, borderColor: a.color + "55" } as never}
                whileTap={{ scale: 0.97 } as never}
              >
                <div style={{ color: a.color, marginBottom: 10, display: "flex", justifyContent: "center" }}>
                  <Icon name={a.icon} size={22} />
                </div>
                <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 600 }}>{a.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Next event preview */}
          <div style={{ marginTop: 16, padding: 16, background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: 2 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Next Event</div>
            <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, letterSpacing: "0.05em" }}>Black Label Night</div>
            <div style={{ fontSize: 11, color: "var(--gold)", marginTop: 4, letterSpacing: "0.08em" }}>Tonight — Midnight — Le Baron Paris</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <span className="tag tag-green">62 confirmed</span>
              <span className="tag tag-gold">4 VIP tables</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ============================================================
// AI ASSISTANT PAGE
// ============================================================
const AssistantPage = () => {
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState(mockConversations);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg = { from: "You", message: input, type: "guest" };
    setConversations(prev => [...prev, newMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setConversations(prev => [...prev, {
        from: "AI Copilot",
        message: "Thank you for your message. Our AI is processing your request. A promoter will follow up shortly if needed.",
        type: "ai",
      }]);
    }, 1800);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, typing]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)", gap: 16 }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="font-display" style={{ fontSize: 36, fontWeight: 300 }}>AI <span className="gold-gradient">Assistant</span></h1>
            <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em", marginTop: 4 }}>Automated guest conversations in real-time</div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {[["87%", "Auto-resolved"], ["127", "Today"], ["2.1s", "Avg reply"]].map(([v, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div className="font-display" style={{ fontSize: 22, color: "var(--gold)", fontWeight: 300 }}>{v}</div>
                <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="divider" />
      </motion.div>

      {/* KPI Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          background: "linear-gradient(135deg, rgba(201,168,76,0.06), rgba(201,168,76,0.02))",
          border: "1px solid rgba(201,168,76,0.2)",
          borderRadius: 2,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div className="pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#34D399" }} />
        <span style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--text-dim)" }}>
          <span style={{ color: "var(--gold)", fontWeight: 700 }}>87%</span> of all guest requests are handled automatically — no human intervention required.
        </span>
      </motion.div>

      {/* Chat window */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          flex: 1,
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Chat header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 2,
            background: "linear-gradient(135deg, #C9A84C, #E8C96B)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#000" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "var(--text)" }}>Nightlife Copilot AI</div>
            <div style={{ fontSize: 10, color: "#34D399", letterSpacing: "0.1em" }}>● Online — Responding instantly</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
          {conversations.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.06, 0.5) }}
              style={{ display: "flex", justifyContent: msg.type === "ai" ? "flex-start" : "flex-end" }}
            >
              <div style={{ maxWidth: "70%" }}>
                <div style={{
                  fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6,
                  color: msg.type === "ai" ? "var(--gold)" : msg.type === "vip" ? "var(--gold-light)" : "var(--text-muted)",
                  textAlign: msg.type === "ai" ? "left" : "right",
                }}>
                  {msg.type === "ai" ? "🤖 AI Copilot" : msg.type === "vip" ? "⭐ " + msg.from : "👤 " + msg.from}
                </div>
                <div className={`chat-bubble-${msg.type}`} style={{ padding: "14px 18px" }}>
                  <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, letterSpacing: "0.03em" }}>{msg.message}</div>
                </div>
              </div>
            </motion.div>
          ))}
          {typing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", justifyContent: "flex-start" }}>
              <div className="chat-bubble-ai" style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 0.2, 0.4].map(d => (
                    <motion.div key={d} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d }}
                      style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold-dim)" }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, flexShrink: 0 }}>
          <input
            className="input-luxury"
            placeholder="Type a test message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            style={{ flex: 1 }}
          />
          <button className="btn-gold" onClick={handleSend} style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <Icon name="send" size={12} />
            Send
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================
// CREATE EVENT PAGE
// ============================================================
const CreateEventPage = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "", venue: "", club: "", date: "", time: "", females: "", vipTables: "",
    ageMin: "21", ageMax: "35", languages: "", city: "",
  });

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  if (submitted) return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 24, textAlign: "center" }}
    >
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        style={{
          width: 80, height: 80,
          background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.06))",
          border: "1px solid rgba(201,168,76,0.4)",
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon name="sparkle" size={32} />
      </motion.div>
      <div>
        <h2 className="font-display shimmer-text" style={{ fontSize: 36, fontWeight: 300, marginBottom: 12 }}>AI Recruitment Launched</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.08em", maxWidth: 400 }}>
          The AI is now scanning profiles and finding the best matches for your event.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <span className="tag tag-green">● Scanning 2,847 profiles</span>
        <span className="tag tag-gold">Expected: 40–60 matches</span>
      </div>
    </motion.div>
  );

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 className="font-display" style={{ fontSize: 36, fontWeight: 300, marginBottom: 6 }}>Create <span className="gold-gradient">Event</span></h1>
        <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em" }}>Define your event and let AI recruit the perfect audience</p>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Left column */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: 28, marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: 24 }}>Event Details</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                { key: "name", label: "Event Name", placeholder: "Black Label Night" },
                { key: "venue", label: "Restaurant / Dinner Venue", placeholder: "Le Cinq, George V" },
                { key: "club", label: "Club / After Party", placeholder: "Le Baron Paris" },
              ].map(f => (
                <div key={f.key}>
                  <label className="label-luxury">{f.label}</label>
                  <input className="input-luxury" placeholder={f.placeholder} value={form[f.key as keyof typeof form]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label className="label-luxury">Date</label>
                  <input className="input-luxury" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label className="label-luxury">Time</label>
                  <input className="input-luxury" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label className="label-luxury">Female Guests (target)</label>
                  <input className="input-luxury" placeholder="e.g. 30" value={form.females} onChange={e => setForm({ ...form, females: e.target.value })} />
                </div>
                <div>
                  <label className="label-luxury">VIP Tables</label>
                  <input className="input-luxury" placeholder="e.g. 4" value={form.vipTables} onChange={e => setForm({ ...form, vipTables: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right column */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: 28, marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="target" size={12} />
              AI Audience Targeting
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label className="label-luxury">Age Range</label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <input className="input-luxury" placeholder="Min" value={form.ageMin} onChange={e => setForm({ ...form, ageMin: e.target.value })} />
                  <span style={{ color: "var(--text-muted)", fontSize: 12, flexShrink: 0 }}>—</span>
                  <input className="input-luxury" placeholder="Max" value={form.ageMax} onChange={e => setForm({ ...form, ageMax: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label-luxury">Languages</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {["French", "English", "Spanish", "Italian"].map(lang => (
                    <div
                      key={lang}
                      onClick={() => setForm({ ...form, languages: form.languages === lang ? "" : lang })}
                      className={`tag ${form.languages === lang ? "tag-gold" : "tag-dim"}`}
                      style={{ cursor: "pointer", padding: "6px 12px", fontSize: 10 }}
                    >
                      {lang}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="label-luxury">Target City</label>
                <input className="input-luxury" placeholder="Paris, Monaco, Cannes..." value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
          </div>

          {/* AI preview */}
          <div style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.05), rgba(201,168,76,0.02))", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 4, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: 12 }}>AI Estimate</div>
            <div style={{ display: "flex", gap: 20 }}>
              {[["2,847", "Profiles scanned"], ["~52", "Expected matches"], ["68%", "Likely attendance"]].map(([v, l]) => (
                <div key={l}>
                  <div className="font-display" style={{ fontSize: 24, fontWeight: 300, color: "var(--gold)" }}>{v}</div>
                  <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* CTA */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
        <button className="btn-ghost">Save Draft</button>
        <button className="btn-gold" onClick={handleSubmit} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, padding: "12px 28px" }}>
          <Icon name="zap" size={14} />
          Launch AI Recruitment
        </button>
      </motion.div>
    </div>
  );
};

// ============================================================
// PROFILES PAGE
// ============================================================
const ProfilesPage = () => {
  const [states, setStates] = useState<Record<number, string | null>>({});
  const [filter, setFilter] = useState("all");

  const toggle = (id: number, action: string) => {
    setStates(prev => ({ ...prev, [id]: prev[id] === action ? null : action }));
  };

  const badgeColor = (b: string) => {
    if (b === "Top Performer") return "tag-gold";
    if (b === "VIP Regular") return "tag-blue";
    if (b === "Loyal Guest") return "tag-green";
    return "tag-dim";
  };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="font-display" style={{ fontSize: 36, fontWeight: 300, marginBottom: 6 }}>Profile <span className="gold-gradient">Matching</span></h1>
            <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em" }}>AI-curated guest profiles ranked by reliability</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["all", "favorites", "invited"].map(f => (
              <button key={f} className={filter === f ? "btn-outline" : "btn-ghost"} onClick={() => setFilter(f)} style={{ fontSize: 10, padding: "8px 14px" }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="divider" />
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {mockProfiles.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="profile-card"
          >
            <div style={{ height: 3, background: `linear-gradient(90deg, var(--gold-dim), var(--gold))`, opacity: p.reliability > 90 ? 1 : 0.4 }} />

            <div style={{ padding: 20 }}>
              {/* Avatar + score */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 2,
                    background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))",
                    border: "1px solid rgba(201,168,76,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 600, color: "var(--gold)", letterSpacing: "0.1em",
                  }}>
                    {p.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.06em", color: "var(--text)" }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", marginTop: 2 }}>{p.age} ans · {p.city}</div>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div className="font-display" style={{ fontSize: 20, fontWeight: 300, color: p.reliability > 90 ? "var(--gold)" : p.reliability > 80 ? "#60A5FA" : "var(--text-dim)" }}>
                    {p.reliability}
                  </div>
                  <div style={{ fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>score</div>
                </div>
              </div>

              {/* Badge */}
              <div style={{ marginBottom: 14 }}>
                <span className={`tag ${badgeColor(p.badge)}`}>★ {p.badge}</span>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "var(--surface3)", borderRadius: 2, overflow: "hidden" }}>
                {[["Events", String(p.events)], ["Attendance", p.attendance + "%"]].map(([l, v], idx) => (
                  <div key={l} style={{
                    flex: 1, padding: "10px 14px", textAlign: "center",
                    borderRight: idx === 0 ? "1px solid var(--border)" : "none",
                  }}>
                    <div className="font-display" style={{ fontSize: 18, fontWeight: 300, color: "var(--text)" }}>{v}</div>
                    <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Instagram */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.05em" }}>
                <Icon name="instagram" size={12} />
                <span>{p.instagram}</span>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className={states[p.id] === "invited" ? "btn-gold" : "btn-outline"}
                  onClick={() => toggle(p.id, "invited")}
                  style={{ flex: 1, fontSize: 10, padding: "9px 8px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                >
                  <Icon name="send" size={11} />
                  {states[p.id] === "invited" ? "Invited ✓" : "Invite"}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => toggle(p.id, "fav")}
                  style={{ padding: "9px 12px", color: states[p.id] === "fav" ? "var(--gold)" : "var(--text-muted)" }}
                >
                  <Icon name="heart" size={13} />
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => toggle(p.id, "ignored")}
                  style={{ padding: "9px 12px", color: states[p.id] === "ignored" ? "#F87171" : "var(--text-muted)" }}
                >
                  <Icon name="x" size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// VIP PAGE
// ============================================================
const VIPPage = () => {
  const [reqStates, setReqStates] = useState<Record<string, string>>({});

  const handleAction = (id: string, action: string) => {
    setReqStates(prev => ({ ...prev, [id]: action }));
  };

  const qualColor = (q: string) => q === "High" ? "tag-gold" : q === "Medium" ? "tag-blue" : "tag-dim";

  const tables = [
    { name: "Gold Table", tier: "gold", people: 6, price: "€1,500", features: ["1 Champagne bottle", "Priority entry", "Dedicated host"], icon: "⭐" },
    { name: "Diamond Table", tier: "diamond", people: 10, price: "€3,000", features: ["3 Premium bottles", "VIP lounge access", "Dedicated butler", "Private area"], icon: "💎" },
    { name: "Prestige Suite", tier: "prestige", people: 20, price: "€7,500", features: ["Open bar 3hrs", "Private terrace", "Chef's selection", "Exclusive concierge"], icon: "👑" },
  ];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 className="font-display" style={{ fontSize: 36, fontWeight: 300, marginBottom: 6 }}>VIP <span className="gold-gradient">Tables</span></h1>
        <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em" }}>AI-qualified reservations and table management</p>
        <div className="divider" />
      </motion.div>

      {/* Table packages */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>Table Packages</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {tables.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="table-card"
              style={{
                border: t.tier === "diamond"
                  ? "1px solid rgba(201,168,76,0.4)"
                  : t.tier === "prestige"
                    ? "1px solid rgba(201,168,76,0.25)"
                    : "1px solid var(--border)",
                background: t.tier === "diamond"
                  ? "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(232,201,107,0.03))"
                  : "var(--surface2)",
              }}
            >
              {t.tier === "diamond" && (
                <div style={{ position: "absolute", top: 0, right: 0, left: 0, height: 1, background: "linear-gradient(90deg, transparent, var(--gold), transparent)" }} />
              )}
              <div style={{ fontSize: 24, marginBottom: 12 }}>{t.icon}</div>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: 6 }}>{t.name}</div>
              <div className="font-display" style={{ fontSize: 32, fontWeight: 300, color: "var(--gold)", marginBottom: 4 }}>{t.price}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 18, letterSpacing: "0.08em" }}>Up to {t.people} guests</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                {t.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.04em" }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--gold-dim)", flexShrink: 0 }} />
                    {f}
                  </div>
                ))}
              </div>
              <button className={t.tier === "diamond" ? "btn-gold" : "btn-outline"} style={{ width: "100%", fontSize: 10 }}>
                Book This Table
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Incoming requests */}
      <div>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          Incoming VIP Requests
          <span className="tag tag-gold">{mockVIPRequests.filter(r => r.status === "pending").length} pending</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mockVIPRequests.map((req, i) => {
            const state = reqStates[req.id] || req.status;
            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="vip-request"
                style={{
                  opacity: state === "rejected" ? 0.5 : 1,
                  borderColor: state === "accepted" ? "rgba(52,211,153,0.3)" : state === "rejected" ? "rgba(248,113,113,0.2)" : "var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: 3 }}>Request {req.id}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", letterSpacing: "0.05em" }}>{req.name}</div>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ textAlign: "center" }}>
                        <div className="font-display" style={{ fontSize: 20, fontWeight: 300, color: "var(--text)" }}>{req.people}</div>
                        <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>guests</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div className="font-display" style={{ fontSize: 20, fontWeight: 300, color: "var(--gold)" }}>{req.budget}</div>
                        <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>budget</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className={`tag ${qualColor(req.qualification)}`}>AI: {req.qualification}</span>
                      {state === "accepted" && <span className="tag tag-green">✓ Accepted</span>}
                      {state === "rejected" && <span className="tag tag-red">✗ Rejected</span>}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em" }}>{req.time}</div>
                  </div>
                  {state === "pending" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-gold" onClick={() => handleAction(req.id, "accepted")} style={{ fontSize: 10, padding: "8px 16px", display: "flex", alignItems: "center", gap: 4 }}>
                        <Icon name="check" size={12} /> Accept
                      </button>
                      <button className="btn-outline" onClick={() => handleAction(req.id, "contact")} style={{ fontSize: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 4 }}>
                        <Icon name="phone" size={12} /> Contact
                      </button>
                      <button className="btn-ghost" onClick={() => handleAction(req.id, "rejected")} style={{ fontSize: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 4 }}>
                        <Icon name="x" size={12} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 64 : 220;

  const pageComponents: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage setPage={setPage} />,
    assistant: <AssistantPage />,
    events: <CreateEventPage />,
    profiles: <ProfilesPage />,
    vip: <VIPPage />,
  };

  const pageTitles: Record<string, string> = {
    dashboard: "Dashboard",
    assistant: "AI Assistant",
    events: "Create Event",
    profiles: "Profiles",
    vip: "VIP Tables",
  };

  return (
    <>
      <GlobalStyles />
      <div className="noise-overlay" />

      {/* Ambient gradient */}
      <div style={{
        position: "fixed", top: "20%", left: "40%", width: 600, height: 600,
        background: "radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 65%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <Sidebar active={page} setActive={setPage} collapsed={collapsed} setCollapsed={setCollapsed} />

        <motion.div
          animate={{ marginLeft: sidebarWidth }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ minHeight: "100vh", padding: "40px 40px 60px" }}
        >
          {/* Topbar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 32, paddingBottom: 20,
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              {pageTitles[page]}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 2,
                background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))",
                border: "1px solid rgba(201,168,76,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.1em", cursor: "pointer",
              }}>
                P
              </div>
            </div>
          </div>

          {/* Page content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {pageComponents[page]}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
