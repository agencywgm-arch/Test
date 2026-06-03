import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [
    totalParticipants,
    enAttente,
    acceptees,
    evenementsAVenir,
    contenuEnAttente,
    staffTotal,
  ] = await Promise.all([
    prisma.participant.count(),
    prisma.participant.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.participant.count({ where: { statut: "ACCEPTEE" } }),
    prisma.evenement.count({ where: { statut: { in: ["PLANIFIE", "CONFIRME"] }, date: { gte: new Date() } } }),
    prisma.contenu.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.staff.count(),
  ]);

  const prochainsEvenements = await prisma.evenement.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: "asc" },
    take: 3,
    include: { participants: true, staffAssignes: { include: { staff: true } } },
  });

  const derniersParticipants = await prisma.participant.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const contenuEnAttentes = await prisma.contenu.findMany({
    where: { statut: "EN_ATTENTE" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const tauxAcceptation = totalParticipants > 0
    ? Math.round((acceptees / totalParticipants) * 100)
    : 0;

  const stats = [
    { label: "Participants total", value: totalParticipants, sub: `${enAttente} en attente`, color: "#7c3aed" },
    { label: "Taux d'acceptation", value: `${tauxAcceptation}%`, sub: `${acceptees} acceptées`, color: "#10b981" },
    { label: "Événements à venir", value: evenementsAVenir, sub: "planifiés ou confirmés", color: "#db2777" },
    { label: "Contenu à valider", value: contenuEnAttente, sub: "en attente de décision", color: "#f59e0b" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#09090b" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "32px 24px", paddingBottom: 80, overflowX: "hidden" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "white", marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: "#71717a", fontSize: 14 }}>
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
          {stats.map(stat => (
            <div key={stat.label} style={{
              background: "#18181b", border: "1px solid #27272a",
              borderRadius: 16, padding: "20px 22px"
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ color: "white", fontWeight: 600, fontSize: 14, margin: "4px 0 2px" }}>{stat.label}</div>
              <div style={{ color: "#71717a", fontSize: 12 }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>

          {/* Prochains événements */}
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ color: "white", fontWeight: 600, fontSize: 16 }}>Prochains événements</h2>
              <a href="/evenements" style={{ color: "#7c3aed", fontSize: 12, textDecoration: "none" }}>Voir tout →</a>
            </div>
            {prochainsEvenements.length === 0 ? (
              <p style={{ color: "#52525b", fontSize: 14 }}>Aucun événement planifié</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {prochainsEvenements.map(evt => (
                  <div key={evt.id} style={{
                    background: "#09090b", borderRadius: 12, padding: "14px 16px",
                    border: "1px solid #1f1f23"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ color: "white", fontWeight: 600, fontSize: 14 }}>{evt.nom}</div>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
                        background: evt.statut === "CONFIRME" ? "rgba(16,185,129,0.15)" : "rgba(124,58,237,0.15)",
                        color: evt.statut === "CONFIRME" ? "#10b981" : "#a78bfa"
                      }}>
                        {evt.statut === "CONFIRME" ? "Confirmé" : "Planifié"}
                      </span>
                    </div>
                    <div style={{ color: "#71717a", fontSize: 12, marginTop: 6 }}>
                      📅 {new Date(evt.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · {evt.heureDebut}
                    </div>
                    <div style={{ color: "#71717a", fontSize: 12 }}>📍 {evt.lieu}</div>
                    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                      <span style={{ color: "#a1a1aa", fontSize: 12 }}>👤 {evt.participants.length}/{evt.maxParticipants} participants</span>
                      <span style={{ color: "#a1a1aa", fontSize: 12 }}>👥 {evt.staffAssignes.length} staff</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Derniers DMs */}
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ color: "white", fontWeight: 600, fontSize: 16 }}>Derniers DMs reçus</h2>
              <a href="/participants" style={{ color: "#db2777", fontSize: 12, textDecoration: "none" }}>Voir tout →</a>
            </div>
            {derniersParticipants.length === 0 ? (
              <p style={{ color: "#52525b", fontSize: 14 }}>Aucun participant</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {derniersParticipants.map(p => {
                  const statutColor: Record<string, string> = {
                    EN_ATTENTE: "#f59e0b", ACCEPTEE: "#10b981", REFUSEE: "#ef4444",
                    INVITEE: "#7c3aed", PRESENTE: "#06b6d4"
                  };
                  const statutLabel: Record<string, string> = {
                    EN_ATTENTE: "En attente", ACCEPTEE: "Acceptée", REFUSEE: "Refusée",
                    INVITEE: "Invitée", PRESENTE: "Présente"
                  };
                  return (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", background: "#09090b", borderRadius: 10,
                      border: "1px solid #1f1f23"
                    }}>
                      <div>
                        <div style={{ color: "white", fontWeight: 500, fontSize: 14 }}>{p.prenom}, {p.age} ans</div>
                        <div style={{ color: "#71717a", fontSize: 12 }}>{p.instagram}</div>
                      </div>
                      <span style={{
                        fontSize: 11, padding: "3px 8px", borderRadius: 20, fontWeight: 600,
                        background: `${statutColor[p.statut]}22`, color: statutColor[p.statut]
                      }}>
                        {statutLabel[p.statut]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contenu à valider */}
          {contenuEnAttentes.length > 0 && (
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ color: "white", fontWeight: 600, fontSize: 16 }}>Contenu à valider</h2>
                <a href="/contenu" style={{ color: "#f59e0b", fontSize: 12, textDecoration: "none" }}>Voir tout →</a>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {contenuEnAttentes.map(c => (
                  <div key={c.id} style={{
                    padding: "12px 14px", background: "#09090b", borderRadius: 10,
                    border: "1px solid #1f1f23"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ color: "white", fontWeight: 500, fontSize: 14 }}>{c.restaurant}</div>
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: "#f59e0b"
                      }}>⭐ {c.scoreGlobal}/10</span>
                    </div>
                    <div style={{ color: "#71717a", fontSize: 12, marginTop: 4 }}>
                      {new Date(c.createdAt).toLocaleDateString("fr-FR")} · Score viral : {c.scoreViral}/10
                    </div>
                    <a href="/contenu" style={{
                      display: "inline-block", marginTop: 8, fontSize: 12,
                      color: "#f59e0b", textDecoration: "none"
                    }}>Valider →</a>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
