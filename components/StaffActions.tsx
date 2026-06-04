"use client";

import { useState } from "react";

interface StaffMember {
  id: string;
  prenom: string;
  nom: string;
  whatsapp: string | null;
}

export function ContactButton({ staff }: { staff: StaffMember }) {
  const href = staff.whatsapp
    ? `https://wa.me/${staff.whatsapp.replace(/\s+/g, "").replace("+", "")}`
    : null;

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
        opacity: href ? 1 : 0.4,
      }}
    >
      <span>📱</span> WhatsApp
    </a>
  );
}

export function GroupMessageButton({ staffList }: { staffList: StaffMember[] }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;
    const withWa = staffList.filter(s => s.whatsapp);
    if (withWa.length === 0) return;
    const first = withWa[0];
    const encoded = encodeURIComponent(message);
    const waLink = `https://wa.me/${first.whatsapp!.replace(/\s+/g, "").replace("+", "")}?text=${encoded}`;
    window.open(waLink, "_blank");
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
          background: "linear-gradient(135deg, rgba(37,211,102,0.15), rgba(37,211,102,0.08))",
          color: "#25d366", border: "1px solid rgba(37,211,102,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}
      >
        <span style={{ fontSize: 20 }}>📣</span>
        Envoyer un message groupé WhatsApp ({staffList.length})
      </button>

      {open && (
        <div
          style={{
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
                📱 Message groupé WhatsApp
              </h2>
              <button onClick={() => setOpen(false)} style={{
                background: "none", border: "none", color: "#71717a",
                fontSize: 22, cursor: "pointer", lineHeight: 1,
              }}>×</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "#71717a", fontSize: 12, marginBottom: 10 }}>ÉQUIPE ({staffList.length} membres)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {staffList.map(s => (
                  <span key={s.id} style={{
                    padding: "3px 10px", borderRadius: 20, fontSize: 12,
                    background: s.whatsapp ? "rgba(37,211,102,0.1)" : "#27272a",
                    color: s.whatsapp ? "#25d366" : "#52525b",
                  }}>
                    {s.prenom} {s.nom}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "#71717a", fontSize: 12, marginBottom: 8 }}>VOTRE MESSAGE</div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex: Confirmation soirée samedi — présence requise à 19h30 au Perchoir. Dress code : chic élégant 🎩"
                style={{
                  width: "100%", minHeight: 110, padding: "12px",
                  background: "#09090b", border: "1px solid #27272a",
                  borderRadius: 10, color: "white", fontSize: 14,
                  resize: "vertical", outline: "none", fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{
              background: "#09090b", borderRadius: 10, padding: "10px 14px",
              color: "#52525b", fontSize: 12, marginBottom: 16,
            }}>
              💡 Ouvre WhatsApp avec le message pré-rempli — envoie-le ensuite à chaque membre ou dans votre groupe.
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSend} style={{
                flex: 1, padding: "12px", borderRadius: 10, fontSize: 14,
                fontWeight: 700, cursor: "pointer", border: "none",
                background: sent ? "rgba(16,185,129,0.2)" : "linear-gradient(135deg, #25d366, #128c7e)",
                color: sent ? "#10b981" : "white",
              }}>
                {sent ? "✅ WhatsApp ouvert !" : "📤 Ouvrir WhatsApp"}
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
