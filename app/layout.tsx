import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nightlife Paris — Dashboard",
  description: "Gestion participants, événements, contenu et staff.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className} style={{ background: "#09090b", color: "white", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
