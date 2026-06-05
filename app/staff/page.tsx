export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import { ContactButton, GroupMessageButton } from "@/components/StaffActions";
import { AgentConfigPanel } from "@/components/AgentConfigPanel";

const ROLE_COLOR: Record<string, string> = {
  Coordinateur: "#7c3aed",
  Hôtesse: "#db2777",
  Sécurité: "#f59e0b",
  Photographe: "#06b6d4",
  DJ: "#10b981",
  Manager: "#ef4444",
};

const ROLE_ICON: Record<string, string> = {
  Coordinateur: "🎯",
  Hôtesse: "💎",
  Sécurité: "🛡️",
  Photographe: "📸",
  DJ: "🎧",
  Manager: "👑",
};

export default async function Staff() {
  const staff = await prisma.staff.findMany({
    orderBy: [{ role: "asc" }, { prenom: "asc" }],
    include: {
      evenements: {
        include: { evenement: { select: { nom: true, date: true } } },
        orderBy: { evenement: { date: "desc" } },
        take: 3,
      },
    },
  });

  const prochainsEvenements = await prisma.evenement.findMany({
    where: { date: { gte: new Date() }, statut: { in: ["PLANIFIE", "CONFIRME"] } },
    orderBy: { date: "asc" },
    take: 3,
    include: {
      staffAssignes: {
        include: { staff: { select: { prenom: true } } },
      },
    },
  });

  const roleCount = staff.reduce<Record<string, number>>((acc, s) => {
    acc[s.role] = (acc[s.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#09090b" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "32px 24px", paddingBottom: 120 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "white", marginBottom: 4 }}>Staff</h1>
          <p style={{ color: "#71717a", fontSize: 14 }}>{staff.length} membres dans l'équipe</p>
        </div>

        {/* Résumé par rôle */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
          {Object.entries(roleCount).map(([role, count]) => {
            const color = ROLE_COLOR[role] ?? "#71717a";
            return (
              <div key={role} style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                background: `${color}18`, color, border: `1px solid ${color}33`,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span>{ROLE_ICON[role] ?? "👤"}</span>
                {role} ({count})
              </div>
            );
          })}
        </div>

        {/* Confirmations à venir */}
        {prochainsEvenements.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{
              color: "#a1a1aa", fontSize: 13, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14,
            }}>
              Confirmations à venir
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {prochainsEvenements.map(evt => {
                const confirmes = evt.staffAssignes.filter(s => s.statut === "OUI").length;
                const enAttente = evt.staffAssignes.filter(s => s.statut === "EN_ATTENTE").length;
                const refuses = evt.staffAssignes.filter(s => s.statut === "NON").length;
                return (
                  <div key={evt.id} style={{
                    background: "#18181b", border: "1px solid #27272a",
                    borderRadius: 12, padding: "14px 18px",
                    display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "white", fontWeight: 600, fontSize: 14 }}>{evt.nom}</div>
                      <div style={{ color: "#71717a", fontSize: 12, marginTop: 2 }}>
                        {new Date(evt.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 14 }}>
                      <span style={{ color: "#10b981", fontSize: 14, fontWeight: 600 }}>✅ {confirmes}</span>
                      <span style={{ color: "#f59e0b", fontSize: 14, fontWeight: 600 }}>⏳ {enAttente}</span>
                      <span style={{ color: "#ef4444", fontSize: 14, fontWeight: 600 }}>❌ {refuses}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Liste équipe */}
        <section>
          <h2 style={{
            color: "#a1a1aa", fontSize: 13, fontWeight: 600,
            letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14,
          }}>
            Équipe complète
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
            marginBottom: 28,
          }}>
            {staff.map(membre => {
              const roleColor = ROLE_COLOR[membre.role] ?? "#71717a";
              const roleIcon = ROLE_ICON[membre.role] ?? "👤";
              const confirmedEvents = membre.evenements.filter(e => e.statut === "OUI").length;

              return (
                <div key={membre.id} style={{
                  background: "#18181b", border: "1px solid #27272a",
                  borderRadius: 14, padding: 18,
                  display: "flex", flexDirection: "column", gap: 12,
                }}>
                  {/* Avatar + nom */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                      background: `${roleColor}22`,
                      border: `2px solid ${roleColor}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22,
                    }}>
                      {roleIcon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "white", fontWeight: 700, fontSize: 15 }}>
                        {membre.prenom} {membre.nom}
                      </div>
                      <span style={{
                        padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: `${roleColor}22`, color: roleColor,
                      }}>
                        {membre.role}
                      </span>
                    </div>
                  </div>

                  {/* Contacts */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {membre.whatsapp && (
                      <div style={{ color: "#25d366", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>📱</span> {membre.whatsapp}
                      </div>
                    )}
                    {membre.email && (
                      <div style={{ color: "#71717a", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>✉️</span> {membre.email}
                      </div>
                    )}
                  </div>

                  {/* Fiabilité */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ color: "#52525b", fontSize: 11 }}>FIABILITÉ</span>
                      <span style={{ color: roleColor, fontSize: 11, fontWeight: 600 }}>
                        {"★".repeat(membre.fiabilite)}{"☆".repeat(5 - membre.fiabilite)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{
                          flex: 1, height: 4, borderRadius: 4,
                          background: i <= membre.fiabilite ? roleColor : "#27272a",
                        }} />
                      ))}
                    </div>
                  </div>

                  {/* Stats events */}
                  {membre.evenements.length > 0 && (
                    <div style={{
                      background: "#09090b", borderRadius: 10, padding: "10px 12px",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ color: "#52525b", fontSize: 11 }}>PRÉSENCES CONFIRMÉES</span>
                      <span style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 600 }}>
                        {confirmedEvents}/{membre.evenements.length}
                      </span>
                    </div>
                  )}

                  {/* Derniers events */}
                  {membre.evenements.length > 0 && (
                    <div>
                      <div style={{ color: "#52525b", fontSize: 11, marginBottom: 6 }}>DERNIERS EVENTS</div>
                      {membre.evenements.map(se => (
                        <div key={se.id} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "4px 0", borderBottom: "1px solid #1f1f23", fontSize: 12,
                        }}>
                          <span style={{ color: "#a1a1aa" }}>{se.evenement.nom}</span>
                          <span style={{
                            color: se.statut === "OUI" ? "#10b981" : se.statut === "NON" ? "#ef4444" : "#f59e0b",
                          }}>
                            {se.statut === "OUI" ? "✅" : se.statut === "NON" ? "❌" : "⏳"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bouton Contacter */}
                  <ContactButton staff={{
                    id: membre.id,
                    prenom: membre.prenom,
                    nom: membre.nom,
                    whatsapp: membre.whatsapp,
                  }} />
                </div>
              );
            })}
          </div>

          {/* Bouton message groupé */}
          <GroupMessageButton staffList={staff.map(s => ({
            id: s.id,
            prenom: s.prenom,
            nom: s.nom,
            whatsapp: s.whatsapp,
          }))} />
        </section>

        {staff.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#52525b" }}>
            Aucun membre staff. Ils sont ajoutés manuellement ou via les workflows n8n.
          </div>
        )}

        {/* ── Configuration des Agents ── */}
        <section style={{ marginTop: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <h2 style={{
              color: "#a1a1aa", fontSize: 13, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase", margin: 0,
            }}>
              Configuration des agents IA
            </h2>
            <span style={{
              padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: "rgba(16,185,129,0.15)", color: "#10b981",
            }}>WhatsApp · n8n</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            <AgentConfigPanel
              agentId="agent-staff-whatsapp"
              agentName="Agent 3 — Convocations WhatsApp Staff"
              agentDescription="Envoie les convocations via WhatsApp Business, recueille les confirmations et alerte le promoteur"
              icon="📲"
              color="#25d366"
              fields={[
                {
                  key: "wa_business_token",
                  label: "Token WhatsApp Business API",
                  type: "text",
                  placeholder: "EAAxxxxxxxxxxxxxxxxxxxxxxxxx",
                  secret: true,
                  hint: "Meta Business → WhatsApp → API Access",
                },
                {
                  key: "wa_phone_number_id",
                  label: "Phone Number ID (expéditeur)",
                  type: "text",
                  placeholder: "123456789012345",
                  hint: "WhatsApp Business Manager → numéro de téléphone",
                },
                {
                  key: "promoteur_whatsapp",
                  label: "Ton numéro WhatsApp (alertes)",
                  type: "text",
                  placeholder: "+33612345678",
                  hint: "Format international — tu recevras les confirmations ici",
                },
                {
                  key: "convocation_message",
                  label: "Message de convocation",
                  type: "textarea",
                  defaultValue: "🎯 Bonjour {{prenom}} ! Tu es convoqué(e) pour : {{nom_event}}\n📅 {{date}} · {{heure_debut}} → {{heure_fin}}\n📍 {{lieu}}\n\nConfirme ta présence en répondant :\n✅ OUI\n❌ NON",
                  hint: "Variables : {{prenom}}, {{nom_event}}, {{date}}, {{lieu}}, {{heure_debut}}, {{heure_fin}}",
                },
                {
                  key: "delai_confirmation",
                  label: "Délai max pour confirmer",
                  type: "select",
                  defaultValue: "48h",
                  options: [
                    { label: "12 heures", value: "12h" },
                    { label: "24 heures", value: "24h" },
                    { label: "48 heures", value: "48h" },
                    { label: "72 heures", value: "72h" },
                  ],
                },
                {
                  key: "alerte_non_reponse",
                  label: "Alerte si pas de réponse",
                  type: "select",
                  defaultValue: "yes",
                  options: [
                    { label: "Oui — m'alerter par WhatsApp", value: "yes" },
                    { label: "Non", value: "no" },
                  ],
                },
                {
                  key: "webhook_url",
                  label: "Webhook n8n (réception confirmations)",
                  type: "text",
                  defaultValue: "https://ton-n8n.railway.app/webhook/staff-whatsapp",
                  placeholder: "https://...",
                },
              ]}
            />

            <AgentConfigPanel
              agentId="agent-staff-planning"
              agentName="Agent 3b — Planning automatique"
              agentDescription="Génère et envoie le planning détaillé à chaque membre confirmé 24h avant l'événement"
              icon="📋"
              color="#7c3aed"
              fields={[
                {
                  key: "planning_message",
                  label: "Template du planning",
                  type: "textarea",
                  defaultValue: "📋 Planning de ce soir — {{nom_event}}\n\n⏰ Arrivée : {{heure_debut}} (30min avant l'ouverture)\n📍 Adresse : {{adresse}}\n👔 Dress code : {{dress_code}}\n\nTon rôle : {{role}}\n\nContact sur place : Alex Martin (@alex_coord)\n\nBonne soirée ! 🎉",
                  hint: "Variables : {{nom_event}}, {{heure_debut}}, {{adresse}}, {{dress_code}}, {{role}}",
                },
                {
                  key: "envoi_delai",
                  label: "Envoi du planning",
                  type: "select",
                  defaultValue: "24h",
                  options: [
                    { label: "Le matin J (8h00)", value: "morning" },
                    { label: "6h avant", value: "6h" },
                    { label: "24h avant", value: "24h" },
                    { label: "Manuel uniquement", value: "manual" },
                  ],
                },
              ]}
            />

          </div>
        </section>

      </main>
    </div>
  );
}
