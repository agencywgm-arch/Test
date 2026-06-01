import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nightlife Copilot — Promoter Dashboard",
  description: "AI-powered nightlife promoter SaaS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0, background: "#030303" }}>{children}</body>
    </html>
  );
}
