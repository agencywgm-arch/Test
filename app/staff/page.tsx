import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";

const ROLE_COLOR: Record<string, string> = {
  Coordinateur: "#7c3aed", Hôtesse: "#db2777", Sécurité: "#f59e0b",
  Photographe: "#06b6d4", DJ: "#10b981", Manager: "#ef4444"
};

export default async function Staff() {
  const session = await getSession();
  if (!session) redirect("/login");

  const staff = await prisma.staff.findMany({
    orderBy: { prenom: "asc" },
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
        include: { staff: { select: { prenom: true } } }
      }
    }
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#09090b" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "32px 24px", paddingBottom: 100 }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "white", marginBottom: 4 }}>Staff</h1>
          <p style={{ color: "#71717a", fontSize: 14 }}>{staff.length} membre(s) dans l'équipe</p>
        </div>

        {/* Confirmations prochains events */}
        {prochainsEvenements.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
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
                    display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap"
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "white", fontWeight: 600, fontSize: 14 }}>{evt.nom}</div>
                      <div style={{ color: "#71717a", fontSize: 12, marginTop: 2 }}>
                        {new Date(evt.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
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

        {/* Liste staff */}
        <section>
          <h2 style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
            Équipe
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {staff.map(membre => {
              const roleColor = ROLE_COLOR[membre.role] ?? "#71717a";
              const derniereConfirm = membre.evenements[0];

              return (
                <div key={membre.id} style={{
                  background: "#18181b", border: "1px solid #27272a",
                  borderRadius: 14, padding: 18
                }}>
                  {/* Avatar + nom */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: `${roleColor}22`,
                      border: `2px solid ${roleColor}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: roleColor, fontWeight: 700, fontSize: 18
                    }}>
                      {membre.prenom[0]}
                    </div>
                    <div>
                      <div style={{ color: "white", fontWeight: 600, fontSize: 15 }}>
                        {membre.prenom} {membre.nom}
                      </div>
                      <span style={{
                        padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: `${roleColor}22`, color: roleColor
                      }}>
                        {membre.role}
                      </span>
                    </div>
                  </div>

                  {/* Contacts */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                    {membre.email && (
                      <div style={{ color: "#71717a", fontSize: 12 }}>✉️ {membre.email}</div>
                    )}
                    {membre.whatsapp && (
                      <div style={{ color: "#71717a", fontSize: 12 }}>📱 {membre.whatsapp}</div>
                    )}
                    {membre.telegramId && (
                      <div style={{ color: "#71717a", fontSize: 12 }}>✈️ Telegram: {membre.telegramId}</div>
                    )}
                  </div>

                  {/* Fiabilité */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: "#52525b", fontSize: 11, marginBottom: 4 }}>FIABILITÉ</div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{
                          flex: 1, height: 4, borderRadius: 4,
                          background: i <= membre.fiabilite ? roleColor : "#27272a"
                        }} />
                      ))}
                    </div>
                  </div>

                  {/* Derniers événements */}
                  {membre.evenements.length > 0 && (
                    <div>
                      <div style={{ color: "#52525b", fontSize: 11, marginBottom: 6 }}>DERNIERS EVENTS</div>
                      {membre.evenements.map(se => (
                        <div key={se.id} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "4px 0", borderBottom: "1px solid #1f1f23", fontSize: 12
                        }}>
                          <span style={{ color: "#a1a1aa" }}>{se.evenement.nom}</span>
                          <span style={{
                            color: se.statut === "OUI" ? "#10b981" : se.statut === "NON" ? "#ef4444" : "#f59e0b"
                          }}>
                            {se.statut === "OUI" ? "✅" : se.statut === "NON" ? "❌" : "⏳"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {staff.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#52525b" }}>
            Aucun membre staff. Ils sont ajoutés manuellement ou via les workflows n8n.
          </div>
        )}
      </main>
    </div>
  );
}
