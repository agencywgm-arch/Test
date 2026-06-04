"use client";

import { useState } from "react";

interface StaffMember {
  id: string;
  prenom: string;
  nom: string;
  whatsapp: string | null;
  telegramId: string | null;
}

export function ContactButton({ staff }: { staff: StaffMember }) {
  const waLink = staff.whatsapp
    ? `https://wa.me/${staff.whatsapp.replace(/\s+/g, "").replace("+", "")}`
    : null;
  const tgLink = staff.telegramId
    ? `https://t.me/${staff.telegramId.replace("@", "")}`
    : null;

  const href = waLink || tgLink || null;

  return (
    <a
      href={href ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 6, width: "100%", padding: "9px 0", borderRadius: 8,
        fontSize: 13, fontWeight: 600, cursor: "pointer",
        background: "rgba(37,211,102,0.12)", color: "#25d366",
        border: "1px solid rgba(37,211,102,0.3)",
        textDecoration: "none",
      }}
    >
      <span>📱</span> Contacter
    </a>
  );
}

export function GroupMessageButton({ staffList }: { staffList: StaffMember[] }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setMessage("");
      setOpen(false);
    }, 2000);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%", padding: "14px", borderRadius: 12, fontSize: 15,
          fontWeight: 700, cursor: "pointer",
          background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(219,39,119,0.15))",
          color: "#a78bfa", border: "1px solid rgba(124,58,237,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}
      >
        <span style={{ fontSize: 20 }}>📣</span>
        Envoyer un message groupé à l'équipe ({staffList.length})
      </button>

      {open && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.7)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 20,
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            background: "#18181b", border: "1px solid #27272a",
            borderRadius: 20, padding: 28, width: "100%", maxWidth: 480,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ color: "white", fontWeight: 700, fontSize: 18, margin: 0 }}>
                Message groupé
              </h2>
              <button onClick={() => setOpen(false)} style={{
                background: "none", border: "none", color: "#71717a",
                fontSize: 22, cursor: "pointer", lineHeight: 1,
              }}>×</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "#71717a", fontSize: 12, marginBottom: 10 }}>DESTINATAIRES ({staffList.length})</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {staffList.map(s => (
                  <span key={s.id} style={{
                    padding: "3px 10px", borderRadius: 20, fontSize: 12,
                    background: "#27272a", color: "#a1a1aa",
                  }}>
                    {s.prenom} {s.nom}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "#71717a", fontSize: 12, marginBottom: 8 }}>MESSAGE</div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex: Confirmation soirée samedi — présence requise à 19h30 au Perchoir..."
                style={{
                  width: "100%", minHeight: 100, padding: "12px",
                  background: "#09090b", border: "1px solid #27272a",
                  borderRadius: 10, color: "white", fontSize: 14,
                  resize: "vertical", outline: "none", fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSend} style={{
                flex: 1, padding: "12px", borderRadius: 10, fontSize: 14,
                fontWeight: 700, cursor: "pointer",
                background: sent ? "rgba(16,185,129,0.2)" : "linear-gradient(135deg, #7c3aed, #db2777)",
                color: sent ? "#10b981" : "white",
                border: sent ? "1px solid rgba(16,185,129,0.4)" : "none",
              }}>
                {sent ? "✅ Message envoyé !" : "📤 Envoyer via WhatsApp"}
              </button>
              <button onClick={() => setOpen(false)} style={{
                padding: "12px 16px", borderRadius: 10, fontSize: 14,
                fontWeight: 600, cursor: "pointer",
                background: "#27272a", color: "#71717a", border: "none",
              }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
