"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface StaffMessage {
  id: string;
  prenom: string;
  nom: string;
  role: string;
  whatsapp: string | null;
  evenement: string;
  date: string;
  statut: string;
}

interface ClientMessage {
  id: string;
  prenom: string;
  age: number;
  instagram: string;
  email: string | null;
  statut: string;
  source: string;
  createdAt: string;
  evenement: string | null;
}

interface ContenuItem {
  id: string;
  restaurant: string;
  scoreGlobal: number;
  scoreViral: number;
  scoreLuxe: number;
  createdAt: string;
  slidesCount: number;
}

interface Props {
  staffEnAttente: StaffMessage[];
  staffConfirmes: StaffMessage[];
  clientsEnAttente: ClientMessage[];
  clientsRecents: ClientMessage[];
  contenusEnAttente: ContenuItem[];
}

const ROLE_COLOR: Record<string, string> = {
  Coordinateur: "#7c3aed", Hôtesse: "#db2777", Sécurité: "#f59e0b",
  Photographe: "#06b6d4", DJ: "#10b981", Manager: "#ef4444",
};

function MessageBubble({ from, text, time, isAgent }: { from: string; text: string; time: string; isAgent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: isAgent ? "row" : "row-reverse", gap: 8, marginBottom: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: isAgent ? "linear-gradient(135deg,#7c3aed,#db2777)" : "#27272a",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, color: "white", fontWeight: 700,
      }}>
        {isAgent ? "🤖" : from[0]}
      </div>
      <div style={{ maxWidth: "75%" }}>
        <div style={{
          background: isAgent ? "rgba(124,58,237,0.15)" : "#27272a",
          border: `1px solid ${isAgent ? "rgba(124,58,237,0.25)" : "#3f3f46"}`,
          borderRadius: isAgent ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
          padding: "8px 12px",
        }}>
          <div style={{ color: "white", fontSize: 12, lineHeight: 1.5 }}>{text}</div>
        </div>
        <div style={{ color: "#52525b", fontSize: 10, marginTop: 3, textAlign: isAgent ? "left" : "right" }}>{time}</div>
      </div>
    </div>
  );
}

function StaffPanel({ enAttente, confirmes }: { enAttente: StaffMessage[]; confirmes: StaffMessage[] }) {
  const [tab, setTab] = useState<"attente" | "historique">("attente");

  const mockHistory: Record<string, { text: string; time: string; isAgent: boolean }[]> = {
    default: [
      { text: "🎯 Bonjour ! Tu es convoqué(e) pour : Dîner Rooftop Marais\n📅 Dans 4 jours · 20:00 → 01:00\n📍 Le Perchoir Marais\n\nConfirme ta présence :\n✅ OUI\n❌ NON", time: "Hier 14h32", isAgent: true },
      { text: "OUI je serai là 🙌", time: "Hier 15h10", isAgent: false },
      { text: "✅ Parfait ! Rappel envoyé automatiquement 24h avant l'événement.", time: "Hier 15h10", isAgent: true },
    ],
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { key: "attente", label: `En attente (${enAttente.length})`, color: "#f59e0b" },
          { key: "historique", label: "Historique", color: "#71717a" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as "attente" | "historique")} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: tab === t.key ? `${t.color}20` : "transparent",
            color: tab === t.key ? t.color : "#52525b",
            border: `1px solid ${tab === t.key ? t.color + "44" : "#27272a"}`,
            cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "attente" ? (
        enAttente.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#52525b", fontSize: 13 }}>
            ✅ Aucune confirmation en attente
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {enAttente.map(s => (
              <div key={s.id} style={{
                background: "#09090b", borderRadius: 10, padding: "12px 14px",
                border: "1px solid rgba(245,158,11,0.2)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: `${ROLE_COLOR[s.role] ?? "#71717a"}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                }}>
                  {s.role === "DJ" ? "🎧" : s.role === "Photographe" ? "📸" : s.role === "Sécurité" ? "🛡️" : s.role === "Manager" ? "👑" : "💎"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "white", fontWeight: 600, fontSize: 13 }}>{s.prenom} {s.nom}</div>
                  <div style={{ color: "#71717a", fontSize: 11 }}>{s.role} · {s.evenement}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <a href={s.whatsapp ? `https://wa.me/${s.whatsapp.replace(/\s+/g, "").replace("+", "")}?text=${encodeURIComponent(`Bonjour ${s.prenom}, as-tu bien reçu la convocation pour ${s.evenement} ? Peux-tu confirmer ta présence ? ✅`)}` : "#"} target="_blank" rel="noopener noreferrer" style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: "rgba(37,211,102,0.15)", color: "#25d366",
                    border: "1px solid rgba(37,211,102,0.3)", textDecoration: "none",
                  }}>📱 Relancer</a>
                </div>
              </div>
            ))}
            <Link href="/staff" style={{
              display: "block", textAlign: "center", padding: "10px",
              borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: "rgba(124,58,237,0.1)", color: "#a78bfa",
              border: "1px solid rgba(124,58,237,0.2)", textDecoration: "none", marginTop: 4,
            }}>
              Gérer tout le staff →
            </Link>
          </div>
        )
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {confirmes.slice(0, 3).map(s => (
            <div key={s.id} style={{ background: "#09090b", borderRadius: 12, padding: "12px 14px", border: "1px solid #1f1f23" }}>
              <div style={{ color: "#a1a1aa", fontWeight: 600, fontSize: 12, marginBottom: 10 }}>
                {s.prenom} {s.nom} · {s.evenement}
              </div>
              {(mockHistory.default).map((m, i) => (
                <MessageBubble key={i} from={s.prenom} text={m.text} time={m.time} isAgent={m.isAgent} />
              ))}
            </div>
          ))}
          {confirmes.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#52525b", fontSize: 13 }}>
              Aucun historique disponible
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClientPanel({ enAttente, recents }: { enAttente: ClientMessage[]; recents: ClientMessage[] }) {
  const [filtre, setFiltre] = useState("TOUS");
  const [participants, setParticipants] = useState(recents);
  const router = useRouter();

  const STATUT_COLOR: Record<string, string> = {
    EN_ATTENTE: "#f59e0b", ACCEPTEE: "#10b981", REFUSEE: "#ef4444",
    INVITEE: "#7c3aed", PRESENTE: "#06b6d4",
  };
  const STATUT_LABEL: Record<string, string> = {
    EN_ATTENTE: "En attente", ACCEPTEE: "Acceptée", REFUSEE: "Refusée",
    INVITEE: "Invitée", PRESENTE: "Présente",
  };

  const filtres = [
    { key: "TOUS", label: "Tous", count: participants.length },
    { key: "EN_ATTENTE", label: "En attente", count: participants.filter(p => p.statut === "EN_ATTENTE").length },
    { key: "ACCEPTEE", label: "Acceptées", count: participants.filter(p => p.statut === "ACCEPTEE").length },
    { key: "REFUSEE", label: "Refusées", count: participants.filter(p => p.statut === "REFUSEE").length },
  ];

  const filtered = filtre === "TOUS" ? participants : participants.filter(p => p.statut === filtre);

  async function updateStatut(id: string, statut: string) {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, statut } : p));
    try {
      await fetch("/api/participants/statut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, statut }),
      });
      router.refresh();
    } catch {
      setParticipants(recents);
    }
  }

  return (
    <div>
      {/* Filtres */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {filtres.map(f => (
          <button key={f.key} onClick={() => setFiltre(f.key)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500,
            background: filtre === f.key ? "rgba(124,58,237,0.2)" : "#09090b",
            color: filtre === f.key ? "#a78bfa" : "#71717a",
            border: `1px solid ${filtre === f.key ? "#7c3aed" : "#27272a"}`,
            cursor: "pointer",
          }}>
            {f.label} <span style={{ opacity: 0.7 }}>({f.count})</span>
          </button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 16, overflow: "hidden", maxHeight: 520, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#52525b" }}>
            Aucune participante pour ce filtre.
          </div>
        ) : (
          <div>
            {filtered.map((p, i) => (
              <div key={p.id} style={{
                padding: "16px 20px",
                borderBottom: i < filtered.length - 1 ? "1px solid #1f1f23" : "none",
                display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
              }}>
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #7c3aed, #db2777)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontWeight: 700, fontSize: 16,
                }}>
                  {p.prenom[0]}
                </div>

                {/* Infos */}
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ color: "white", fontWeight: 600, fontSize: 15 }}>{p.prenom}, {p.age} ans</div>
                  <div style={{ color: "#71717a", fontSize: 13, marginTop: 2 }}>
                    {p.instagram}
                    {p.email && <span style={{ marginLeft: 10, opacity: 0.7 }}>· {p.email}</span>}
                  </div>
                  {p.evenement && (
                    <div style={{ color: "#7c3aed", fontSize: 12, marginTop: 2 }}>
                      🎟️ {p.evenement}
                    </div>
                  )}
                </div>

                {/* Statut + actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{
                    padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: `${STATUT_COLOR[p.statut] ?? "#71717a"}22`,
                    color: STATUT_COLOR[p.statut] ?? "#71717a",
                  }}>
                    {STATUT_LABEL[p.statut] ?? p.statut}
                  </span>

                  {p.statut === "EN_ATTENTE" && (
                    <>
                      <button onClick={() => updateStatut(p.id, "ACCEPTEE")} style={{
                        padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: "rgba(16,185,129,0.15)", color: "#10b981",
                        border: "1px solid rgba(16,185,129,0.3)", cursor: "pointer",
                      }}>✅ Accepter</button>
                      <button onClick={() => updateStatut(p.id, "REFUSEE")} style={{
                        padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: "rgba(239,68,68,0.15)", color: "#ef4444",
                        border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer",
                      }}>❌ Refuser</button>
                    </>
                  )}

                  <div style={{ color: "#52525b", fontSize: 11, marginLeft: 4 }}>
                    {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link href="/participants" style={{
        display: "block", textAlign: "center", padding: "10px",
        borderRadius: 8, fontSize: 12, fontWeight: 600,
        background: "rgba(124,58,237,0.1)", color: "#a78bfa",
        border: "1px solid rgba(124,58,237,0.2)", textDecoration: "none", marginTop: 8,
      }}>
        Voir la CRM complète →
      </Link>
    </div>
  );
}

function ContenuPanel({ contenus }: { contenus: ContenuItem[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {contenus.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "#52525b", fontSize: 13 }}>
          ✅ Aucun contenu en attente de validation
        </div>
      ) : (
        <>
          {contenus.map(c => (
            <div key={c.id} style={{
              background: "#09090b", borderRadius: 10, padding: "12px 14px",
              border: "1px solid rgba(245,158,11,0.25)",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                background: "linear-gradient(135deg,#7c3aed,#db2777)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>📸</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "white", fontWeight: 600, fontSize: 13 }}>{c.restaurant}</div>
                <div style={{ color: "#71717a", fontSize: 11 }}>
                  {c.slidesCount} slides · Généré le {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "#f59e0b" }}>⭐ {c.scoreGlobal}/10</span>
                  <span style={{ fontSize: 11, color: "#a78bfa" }}>🔥 Viral {c.scoreViral}/10</span>
                  <span style={{ fontSize: 11, color: "#06b6d4" }}>💎 Luxe {c.scoreLuxe}/10</span>
                </div>
              </div>
              <Link href="/contenu" style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: "rgba(245,158,11,0.15)", color: "#f59e0b",
                border: "1px solid rgba(245,158,11,0.3)", textDecoration: "none", flexShrink: 0,
              }}>
                Valider →
              </Link>
            </div>
          ))}
          <Link href="/contenu" style={{
            display: "block", textAlign: "center", padding: "10px",
            borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: "rgba(245,158,11,0.1)", color: "#f59e0b",
            border: "1px solid rgba(245,158,11,0.2)", textDecoration: "none", marginTop: 4,
          }}>
            Voir tout le contenu →
          </Link>
        </>
      )}
    </div>
  );
}

export function DashboardCards({ staffEnAttente, staffConfirmes, clientsEnAttente, clientsRecents, contenusEnAttente }: Props) {
  const [open, setOpen] = useState<"staff" | "clients" | "contenu" | null>(null);

  const toggle = (key: "staff" | "clients" | "contenu") =>
    setOpen(prev => (prev === key ? null : key));

  const cards = [
    {
      key: "staff" as const,
      icon: "👥",
      title: "Messages Staff",
      count: staffEnAttente.length,
      countLabel: "confirmation(s) en attente",
      sub: `${staffConfirmes.length} confirmés`,
      color: "#10b981",
      badge: staffEnAttente.length > 0 ? staffEnAttente.length : null,
    },
    {
      key: "clients" as const,
      icon: "💬",
      title: "Messages Clientèle",
      count: clientsEnAttente.length,
      countLabel: "DM(s) à traiter",
      sub: `${clientsRecents.length} participants récents`,
      color: "#db2777",
      badge: clientsEnAttente.length > 0 ? clientsEnAttente.length : null,
    },
    {
      key: "contenu" as const,
      icon: "✨",
      title: "Contenu à valider",
      count: contenusEnAttente.length,
      countLabel: "carrousel(s) en attente",
      sub: "Générés par l'Agent IA",
      color: "#f59e0b",
      badge: contenusEnAttente.length > 0 ? contenusEnAttente.length : null,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 3 cartes principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {cards.map(card => (
          <button
            key={card.key}
            onClick={() => toggle(card.key)}
            style={{
              background: open === card.key ? `${card.color}12` : "#18181b",
              border: `1px solid ${open === card.key ? card.color + "44" : "#27272a"}`,
              borderRadius: 16, padding: "20px 22px",
              cursor: "pointer", textAlign: "left",
              transition: "all 0.2s", position: "relative",
              outline: "none",
            }}
          >
            {/* Badge */}
            {card.badge && (
              <div style={{
                position: "absolute", top: 14, right: 14,
                background: card.color, color: "white",
                width: 22, height: 22, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
              }}>
                {card.badge}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${card.color}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>
                {card.icon}
              </div>
              <div style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{card.title}</div>
            </div>

            <div style={{ color: card.color, fontWeight: 800, fontSize: 32, lineHeight: 1, marginBottom: 4 }}>
              {card.count}
            </div>
            <div style={{ color: "#a1a1aa", fontSize: 13, marginBottom: 2 }}>{card.countLabel}</div>
            <div style={{ color: "#52525b", fontSize: 12 }}>{card.sub}</div>

            <div style={{
              marginTop: 14, display: "flex", alignItems: "center", gap: 6,
              color: open === card.key ? card.color : "#52525b", fontSize: 12, fontWeight: 600,
            }}>
              {open === card.key ? "▲ Fermer" : "▼ Voir les messages"}
            </div>
          </button>
        ))}
      </div>

      {/* Panneaux extensibles */}
      {open && (
        <div style={{
          background: "#18181b", border: "1px solid #27272a",
          borderRadius: 16, padding: 20,
          animation: "fadeIn 0.2s ease",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ color: "white", fontWeight: 700, fontSize: 16, margin: 0 }}>
              {cards.find(c => c.key === open)?.icon} {cards.find(c => c.key === open)?.title}
            </h2>
            <button onClick={() => setOpen(null)} style={{
              background: "none", border: "none", color: "#52525b",
              fontSize: 20, cursor: "pointer", lineHeight: 1,
            }}>×</button>
          </div>

          {open === "staff" && <StaffPanel enAttente={staffEnAttente} confirmes={staffConfirmes} />}
          {open === "clients" && <ClientPanel enAttente={clientsEnAttente} recents={clientsRecents} />}
          {open === "contenu" && <ContenuPanel contenus={contenusEnAttente} />}
        </div>
      )}
    </div>
  );
}
