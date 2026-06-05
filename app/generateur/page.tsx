export const dynamic = 'force-dynamic';

import Sidebar from "@/components/Sidebar";
import CarouselGenerator from "@/components/CarouselGenerator";

export default function GenerateurPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#09090b" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "32px 24px", paddingBottom: 100, overflowX: "hidden" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "white", marginBottom: 4 }}>
            Générateur de carrousels
          </h1>
          <p style={{ color: "#71717a", fontSize: 14 }}>
            Crée des slides Instagram 1080×1080 avec vraies photos — configure, prévisualise et exporte en PNG
          </p>
        </div>
        <CarouselGenerator />
      </main>
    </div>
  );
}
