import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import { updateParticipantStatut } from "@/lib/actions";

const STATUT_COLOR: Record<string, string> = {
  EN_ATTENTE: "#f59e0b", ACCEPTEE: "#10b981", REFUSEE: "#ef4444",
  INVITEE: "#7c3aed", PRESENTE: "#06b6d4",
};
const STATUT_LABEL: Record<string, string> = {
  EN_ATTENTE: "En attente", ACCEPTEE: "Acceptée", REFUSEE: "Refusée",
  INVITEE: "Invitée", PRESENTE: "Présente",
};

export default async function Participants({ searchParams }: { searchParams: { filtre?: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const filtre = searchParams.filtre || "TOUS";

  const where = filtre === "TOUS" ? {} : { statut: filtre };
  const participants = await prisma.participant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { evenement: true },
  });

  const counts = await prisma.participant.groupBy({
    by: ["statut"],
    _count: true,
  });

  const total = await prisma.participant.count();

  const filtres = [
    { key: "TOUS", label: "Tous", count: total },
    { key: "EN_ATTENTE", label: "En attente", count: counts.find(c => c.statut === "EN_ATTENTE")?._count ?? 0 },
    { key: "ACCEPTEE", label: "Acceptées", count: counts.find(c => c.statut === "ACCEPTEE")?._count ?? 0 },
    { key: "REFUSEE", label: "Refusées", count: counts.find(c => c.statut === "REFUSEE")?._count ?? 0 },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#09090b" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "32px 24px", paddingBottom: 100, overflowX: "hidden" }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "white", marginBottom: 4 }}>Participants</h1>
          <p style={{ color: "#71717a", fontSize: 14 }}>CRM des participantes reçues via Instagram DM</p>
        </div>

        {/* Filtres */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {filtres.map(f => (
            <a key={f.key} href={`/participants?filtre=${f.key}`} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500,
              background: filtre === f.key ? "rgba(124,58,237,0.2)" : "#18181b",
              color: filtre === f.key ? "#a78bfa" : "#71717a",
              border: `1px solid ${filtre === f.key ? "#7c3aed" : "#27272a"}`,
              textDecoration: "none", cursor: "pointer"
            }}>
              {f.label} <span style={{ opacity: 0.7 }}>({f.count})</span>
            </a>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, overflow: "hidden" }}>
          {participants.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#52525b" }}>
              Aucune participante pour ce filtre.
            </div>
          ) : (
            <div>
              {participants.map((p, i) => (
                <div key={p.id} style={{
                  padding: "16px 20px",
                  borderBottom: i < participants.length - 1 ? "1px solid #1f1f23" : "none",
                  display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap"
                }}>

                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, #7c3aed, #db2777)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontWeight: 700, fontSize: 16
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
                        🎟️ {p.evenement.nom}
                      </div>
                    )}
                  </div>

                  {/* Statut + actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                      padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: `${STATUT_COLOR[p.statut]}22`, color: STATUT_COLOR[p.statut]
                    }}>
                      {STATUT_LABEL[p.statut]}
                    </span>

                    {p.statut === "EN_ATTENTE" && (
                      <>
                        <form action={async () => {
                          "use server";
                          await updateParticipantStatut(p.id, "ACCEPTEE");
                        }}>
                          <button type="submit" style={{
                            padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: "rgba(16,185,129,0.15)", color: "#10b981",
                            border: "1px solid rgba(16,185,129,0.3)", cursor: "pointer"
                          }}>✅ Accepter</button>
                        </form>
                        <form action={async () => {
                          "use server";
                          await updateParticipantStatut(p.id, "REFUSEE");
                        }}>
                          <button type="submit" style={{
                            padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: "rgba(239,68,68,0.15)", color: "#ef4444",
                            border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer"
                          }}>❌ Refuser</button>
                        </form>
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
      </main>
    </div>
  );
}
