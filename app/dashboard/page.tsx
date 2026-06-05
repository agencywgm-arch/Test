export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import { DashboardCards } from "@/components/DashboardCards";

export default async function Dashboard() {

  const [
    staffEnAttente,
    staffConfirmes,
    clientsEnAttente,
    clientsRecents,
    contenusEnAttente,
    prochainsEvenements,
  ] = await Promise.all([
    // Staff en attente de confirmation
    prisma.staffEvenement.findMany({
      where: { statut: "EN_ATTENTE" },
      include: {
        staff: { select: { id: true, prenom: true, nom: true, role: true, whatsapp: true } },
        evenement: { select: { nom: true, date: true } },
      },
      take: 20,
    }),
    // Staff confirmés (historique)
    prisma.staffEvenement.findMany({
      where: { statut: "OUI" },
      include: {
        staff: { select: { id: true, prenom: true, nom: true, role: true, whatsapp: true } },
        evenement: { select: { nom: true, date: true } },
      },
      orderBy: { evenement: { date: "desc" } },
      take: 10,
    }),
    // Participants en attente
    prisma.participant.findMany({
      where: { statut: "EN_ATTENTE" },
      orderBy: { createdAt: "desc" },
      include: { evenement: { select: { nom: true } } },
      take: 20,
    }),
    // Tous les participants (historique complet)
    prisma.participant.findMany({
      orderBy: { createdAt: "desc" },
      include: { evenement: { select: { nom: true } } },
    }),
    // Contenus à valider
    prisma.contenu.findMany({
      where: { statut: "EN_ATTENTE" },
      orderBy: { createdAt: "desc" },
    }),
    // Prochains événements
    prisma.evenement.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: "asc" },
      take: 3,
      include: {
        participants: { select: { id: true } },
        staffAssignes: { select: { id: true, statut: true } },
      },
    }),
  ]);

  // Sérialise pour les client components
  const staffEnAttenteData = staffEnAttente.map(se => ({
    id: se.id,
    prenom: se.staff.prenom,
    nom: se.staff.nom,
    role: se.staff.role,
    whatsapp: se.staff.whatsapp,
    evenement: se.evenement.nom,
    date: se.evenement.date.toISOString(),
    statut: se.statut,
  }));

  const staffConfirmesData = staffConfirmes.map(se => ({
    id: se.id,
    prenom: se.staff.prenom,
    nom: se.staff.nom,
    role: se.staff.role,
    whatsapp: se.staff.whatsapp,
    evenement: se.evenement.nom,
    date: se.evenement.date.toISOString(),
    statut: se.statut,
  }));

  const clientsEnAttenteData = clientsEnAttente.map(p => ({
    id: p.id,
    prenom: p.prenom,
    age: p.age,
    instagram: p.instagram,
    email: p.email ?? null,
    statut: p.statut,
    source: p.source,
    createdAt: p.createdAt.toISOString(),
    evenement: p.evenement?.nom ?? null,
  }));

  const clientsRecentsData = clientsRecents.map(p => ({
    id: p.id,
    prenom: p.prenom,
    age: p.age,
    instagram: p.instagram,
    email: p.email ?? null,
    statut: p.statut,
    source: p.source,
    createdAt: p.createdAt.toISOString(),
    evenement: p.evenement?.nom ?? null,
  }));

  const contenusData = contenusEnAttente.map(c => ({
    id: c.id,
    restaurant: c.restaurant,
    scoreGlobal: c.scoreGlobal,
    scoreViral: c.scoreViral,
    scoreLuxe: c.scoreLuxe,
    createdAt: c.createdAt.toISOString(),
    slidesCount: (() => { try { return JSON.parse(c.slides).length; } catch { return 0; } })(),
  }));

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#09090b" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "32px 24px", paddingBottom: 100, overflowX: "hidden" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg, #7c3aed, #db2777)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>🌙</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "white", margin: 0 }}>Nightlife Paris</h1>
          </div>
          <p style={{ color: "#71717a", fontSize: 14, marginLeft: 50 }}>
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* 3 cartes principales */}
        <DashboardCards
          staffEnAttente={staffEnAttenteData}
          staffConfirmes={staffConfirmesData}
          clientsEnAttente={clientsEnAttenteData}
          clientsRecents={clientsRecentsData}
          contenusEnAttente={contenusData}
        />

        {/* Prochains événements */}
        {prochainsEvenements.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
                Prochains événements
              </h2>
              <a href="/evenements" style={{ color: "#7c3aed", fontSize: 12, textDecoration: "none" }}>Voir tout →</a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {prochainsEvenements.map(evt => {
                const staffConfirmesEvt = evt.staffAssignes.filter(s => s.statut === "OUI").length;
                return (
                  <div key={evt.id} style={{
                    background: "#18181b", border: "1px solid #27272a",
                    borderRadius: 12, padding: "14px 18px",
                    display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "white", fontWeight: 600, fontSize: 14 }}>{evt.nom}</span>
                        <span style={{
                          padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: evt.statut === "CONFIRME" ? "rgba(16,185,129,0.15)" : "rgba(124,58,237,0.15)",
                          color: evt.statut === "CONFIRME" ? "#10b981" : "#a78bfa",
                        }}>
                          {evt.statut === "CONFIRME" ? "Confirmé" : "Planifié"}
                        </span>
                      </div>
                      <div style={{ color: "#71717a", fontSize: 12, marginTop: 3 }}>
                        📅 {new Date(evt.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · {evt.heureDebut} · 📍 {evt.lieu}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: "#db2777", fontWeight: 700, fontSize: 16 }}>{evt.participants.length}/{evt.maxParticipants}</div>
                        <div style={{ color: "#52525b", fontSize: 10 }}>participants</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: "#10b981", fontWeight: 700, fontSize: 16 }}>{staffConfirmesEvt}/{evt.staffAssignes.length}</div>
                        <div style={{ color: "#52525b", fontSize: 10 }}>staff</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
