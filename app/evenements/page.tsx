import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import { updateEvenementStatut } from "@/lib/actions";

const STATUT_COLOR: Record<string, string> = {
  PLANIFIE: "#7c3aed", CONFIRME: "#10b981", TERMINE: "#71717a", ANNULE: "#ef4444"
};
const STATUT_LABEL: Record<string, string> = {
  PLANIFIE: "Planifié", CONFIRME: "Confirmé", TERMINE: "Terminé", ANNULE: "Annulé"
};

export default async function Evenements() {
  const session = await getSession();
  if (!session) redirect("/login");

  const evenements = await prisma.evenement.findMany({
    orderBy: { date: "asc" },
    include: {
      participants: { select: { id: true, statut: true, prenom: true } },
      staffAssignes: { include: { staff: { select: { prenom: true, role: true } } } },
    },
  });

  const aVenir = evenements.filter(e => new Date(e.date) >= new Date());
  const passes = evenements.filter(e => new Date(e.date) < new Date());

  function EventCard({ evt }: { evt: typeof evenements[0] }) {
    const acceptees = evt.participants.filter(p => p.statut === "ACCEPTEE" || p.statut === "PRESENTE").length;
    const staffConfirmes = evt.staffAssignes.filter(s => s.statut === "OUI").length;

    return (
      <div style={{
        background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: 20,
        display: "flex", flexDirection: "column", gap: 12
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ color: "white", fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{evt.nom}</h3>
            <div style={{ color: "#71717a", fontSize: 13 }}>
              📍 {evt.lieu}
            </div>
          </div>
          <span style={{
            padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: `${STATUT_COLOR[evt.statut]}22`, color: STATUT_COLOR[evt.statut],
            flexShrink: 0, marginLeft: 12
          }}>
            {STATUT_LABEL[evt.statut]}
          </span>
        </div>

        {/* Details */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
          background: "#09090b", borderRadius: 10, padding: "12px 14px"
        }}>
          <div>
            <div style={{ color: "#52525b", fontSize: 11, marginBottom: 2 }}>Date</div>
            <div style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 500 }}>
              {new Date(evt.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <div>
            <div style={{ color: "#52525b", fontSize: 11, marginBottom: 2 }}>Horaires</div>
            <div style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 500 }}>{evt.heureDebut} → {evt.heureFin}</div>
          </div>
          <div>
            <div style={{ color: "#52525b", fontSize: 11, marginBottom: 2 }}>Adresse</div>
            <div style={{ color: "#a1a1aa", fontSize: 13 }}>{evt.adresse}</div>
          </div>
          {evt.dressCode && (
            <div>
              <div style={{ color: "#52525b", fontSize: 11, marginBottom: 2 }}>Dress code</div>
              <div style={{ color: "#a1a1aa", fontSize: 13 }}>{evt.dressCode}</div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{
            flex: 1, background: "rgba(219,39,119,0.1)", borderRadius: 10,
            padding: "10px 14px", textAlign: "center"
          }}>
            <div style={{ color: "#db2777", fontWeight: 700, fontSize: 20 }}>
              {acceptees}/{evt.maxParticipants}
            </div>
            <div style={{ color: "#71717a", fontSize: 11, marginTop: 2 }}>Participantes</div>
          </div>
          <div style={{
            flex: 1, background: "rgba(16,185,129,0.1)", borderRadius: 10,
            padding: "10px 14px", textAlign: "center"
          }}>
            <div style={{ color: "#10b981", fontWeight: 700, fontSize: 20 }}>
              {staffConfirmes}/{evt.staffAssignes.length}
            </div>
            <div style={{ color: "#71717a", fontSize: 11, marginTop: 2 }}>Staff confirmés</div>
          </div>
        </div>

        {/* Staff list */}
        {evt.staffAssignes.length > 0 && (
          <div>
            <div style={{ color: "#52525b", fontSize: 11, marginBottom: 6 }}>ÉQUIPE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {evt.staffAssignes.map(se => (
                <span key={se.id} style={{
                  padding: "3px 8px", borderRadius: 6, fontSize: 12,
                  background: se.statut === "OUI" ? "rgba(16,185,129,0.15)" : se.statut === "NON" ? "rgba(239,68,68,0.15)" : "rgba(100,100,100,0.15)",
                  color: se.statut === "OUI" ? "#10b981" : se.statut === "NON" ? "#ef4444" : "#71717a"
                }}>
                  {se.staff.prenom} · {se.staff.role}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions statut */}
        {evt.statut === "PLANIFIE" && (
          <form action={async () => {
            "use server";
            await updateEvenementStatut(evt.id, "CONFIRME");
          }}>
            <button type="submit" style={{
              width: "100%", padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "rgba(16,185,129,0.15)", color: "#10b981",
              border: "1px solid rgba(16,185,129,0.3)", cursor: "pointer"
            }}>
              ✅ Confirmer l'événement
            </button>
          </form>
        )}
        {evt.statut === "CONFIRME" && new Date(evt.date) < new Date() && (
          <form action={async () => {
            "use server";
            await updateEvenementStatut(evt.id, "TERMINE");
          }}>
            <button type="submit" style={{
              width: "100%", padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "rgba(113,113,122,0.15)", color: "#71717a",
              border: "1px solid #3f3f46", cursor: "pointer"
            }}>
              Marquer comme terminé
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#09090b" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "32px 24px", paddingBottom: 100 }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "white", marginBottom: 4 }}>Événements</h1>
          <p style={{ color: "#71717a", fontSize: 14 }}>{evenements.length} événement(s) au total</p>
        </div>

        {aVenir.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
              À venir
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {aVenir.map(evt => <EventCard key={evt.id} evt={evt} />)}
            </div>
          </section>
        )}

        {passes.length > 0 && (
          <section>
            <h2 style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
              Passés
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {passes.map(evt => <EventCard key={evt.id} evt={evt} />)}
            </div>
          </section>
        )}

        {evenements.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#52525b" }}>
            Aucun événement créé. Les événements se créent via les workflows n8n ou manuellement.
          </div>
        )}
      </main>
    </div>
  );
}
