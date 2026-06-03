import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import { updateContenuStatut } from "@/lib/actions";

export default async function Contenu() {
  const session = await getSession();
  if (!session) redirect("/login");

  const contenus = await prisma.contenu.findMany({ orderBy: { createdAt: "desc" } });

  const enAttente = contenus.filter(c => c.statut === "EN_ATTENTE");
  const valide = contenus.filter(c => c.statut === "VALIDE" || c.statut === "PUBLIE");
  const refuse = contenus.filter(c => c.statut === "REFUSE");

  function ScoreBar({ value, label }: { value: number; label: string }) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ color: "#71717a", fontSize: 11 }}>{label}</span>
          <span style={{ color: "#a1a1aa", fontSize: 11, fontWeight: 600 }}>{value}/10</span>
        </div>
        <div style={{ height: 4, background: "#27272a", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 4, width: `${value * 10}%`,
            background: value >= 7 ? "#10b981" : value >= 5 ? "#f59e0b" : "#ef4444"
          }} />
        </div>
      </div>
    );
  }

  function ContentCard({ c }: { c: typeof contenus[0] }) {
    let slides: { titre: string; phrase: string }[] = [];
    try { slides = JSON.parse(c.slides); } catch {}

    const isPending = c.statut === "EN_ATTENTE";

    return (
      <div style={{
        background: "#18181b", border: `1px solid ${isPending ? "rgba(245,158,11,0.3)" : "#27272a"}`,
        borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{c.restaurant}</h3>
            <div style={{ color: "#71717a", fontSize: 12, marginTop: 2 }}>
              {new Date(c.createdAt).toLocaleDateString("fr-FR")}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 20 }}>{c.scoreGlobal}/10</div>
            <div style={{ color: "#71717a", fontSize: 11 }}>score global</div>
          </div>
        </div>

        {/* Scores */}
        <div style={{
          background: "#09090b", borderRadius: 10, padding: "12px 14px",
          display: "flex", flexDirection: "column", gap: 8
        }}>
          <ScoreBar value={c.scoreViral} label="Viral" />
          <ScoreBar value={c.scoreLuxe} label="Luxe" />
        </div>

        {/* Slides preview */}
        {slides.length > 0 && (
          <div>
            <div style={{ color: "#52525b", fontSize: 11, marginBottom: 8 }}>APERÇU CARROUSEL</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {slides.slice(0, 3).map((s, i) => (
                <div key={i} style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(219,39,119,0.08))",
                  border: "1px solid rgba(124,58,237,0.2)",
                  borderRadius: 8, padding: "10px 12px"
                }}>
                  <div style={{ color: "#a78bfa", fontWeight: 600, fontSize: 13 }}>Slide {i + 1} — {s.titre}</div>
                  <div style={{ color: "#71717a", fontSize: 12, marginTop: 2 }}>{s.phrase}</div>
                </div>
              ))}
              {slides.length > 3 && (
                <div style={{ color: "#52525b", fontSize: 12, textAlign: "center" }}>
                  + {slides.length - 3} slide(s)
                </div>
              )}
            </div>
          </div>
        )}

        {/* Caption */}
        {c.caption && (
          <div style={{ background: "#09090b", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ color: "#52525b", fontSize: 11, marginBottom: 4 }}>CAPTION INSTAGRAM</div>
            <div style={{ color: "#a1a1aa", fontSize: 12, lineHeight: 1.5 }}>
              {c.caption.substring(0, 150)}{c.caption.length > 150 ? "..." : ""}
            </div>
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div style={{ display: "flex", gap: 8 }}>
            <form action={async () => {
              "use server";
              await updateContenuStatut(c.id, "VALIDE");
            }} style={{ flex: 1 }}>
              <button type="submit" style={{
                width: "100%", padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: "rgba(16,185,129,0.15)", color: "#10b981",
                border: "1px solid rgba(16,185,129,0.3)", cursor: "pointer"
              }}>
                ✅ Valider
              </button>
            </form>
            <form action={async () => {
              "use server";
              await updateContenuStatut(c.id, "REFUSE");
            }} style={{ flex: 1 }}>
              <button type="submit" style={{
                width: "100%", padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: "rgba(239,68,68,0.15)", color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer"
              }}>
                ❌ Refuser
              </button>
            </form>
          </div>
        )}

        {c.statut === "VALIDE" && (
          <div style={{ display: "flex", gap: 8 }}>
            <form action={async () => {
              "use server";
              await updateContenuStatut(c.id, "PUBLIE");
            }} style={{ flex: 1 }}>
              <button type="submit" style={{
                width: "100%", padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: "rgba(124,58,237,0.15)", color: "#a78bfa",
                border: "1px solid rgba(124,58,237,0.3)", cursor: "pointer"
              }}>
                📤 Marquer comme publié
              </button>
            </form>
          </div>
        )}

        {(c.statut === "VALIDE" || c.statut === "PUBLIE") && (
          <div style={{
            padding: "6px 12px", borderRadius: 8, fontSize: 12, textAlign: "center", fontWeight: 600,
            background: c.statut === "PUBLIE" ? "rgba(16,185,129,0.1)" : "rgba(124,58,237,0.1)",
            color: c.statut === "PUBLIE" ? "#10b981" : "#a78bfa"
          }}>
            {c.statut === "PUBLIE" ? `✅ Publié le ${c.publishedAt ? new Date(c.publishedAt).toLocaleDateString("fr-FR") : "—"}` : "✓ Validé · En attente de publication"}
          </div>
        )}
        {c.statut === "REFUSE" && (
          <div style={{
            padding: "6px 12px", borderRadius: 8, fontSize: 12, textAlign: "center", fontWeight: 600,
            background: "rgba(239,68,68,0.1)", color: "#ef4444"
          }}>
            ❌ Refusé
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#09090b" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "32px 24px", paddingBottom: 100 }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "white", marginBottom: 4 }}>Contenu</h1>
          <p style={{ color: "#71717a", fontSize: 14 }}>Carrousels générés par l'IA — à valider avant publication</p>
        </div>

        {enAttente.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <h2 style={{ color: "#f59e0b", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                En attente de validation
              </h2>
              <span style={{
                background: "#f59e0b", color: "black", borderRadius: 20,
                padding: "1px 7px", fontSize: 12, fontWeight: 700
              }}>{enAttente.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {enAttente.map(c => <ContentCard key={c.id} c={c} />)}
            </div>
          </section>
        )}

        {valide.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
              Validé / Publié
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {valide.map(c => <ContentCard key={c.id} c={c} />)}
            </div>
          </section>
        )}

        {refuse.length > 0 && (
          <section>
            <h2 style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
              Refusé
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16, opacity: 0.5 }}>
              {refuse.map(c => <ContentCard key={c.id} c={c} />)}
            </div>
          </section>
        )}

        {contenus.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#52525b" }}>
            Aucun contenu généré. Les carrousels arrivent automatiquement via l'Agent 1 (n8n + Apify + Gemini).
          </div>
        )}
      </main>
    </div>
  );
}
