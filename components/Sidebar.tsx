"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard",   icon: "◈",  label: "Dashboard" },
  { href: "/participants", icon: "👤", label: "Participants" },
  { href: "/evenements",  icon: "🎟️", label: "Événements" },
  { href: "/contenu",     icon: "✦",  label: "Contenu" },
  { href: "/staff",       icon: "👥", label: "Staff" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, background: "#111113",
        borderRight: "1px solid #1f1f23", display: "flex", flexDirection: "column",
        minHeight: "100vh", position: "sticky", top: 0
      }} className="hidden md:flex">

        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #1f1f23" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #7c3aed, #db2777)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
            }}>🌙</div>
            <div>
              <div style={{ color: "white", fontWeight: 700, fontSize: 15 }}>Nightlife</div>
              <div style={{ color: "#71717a", fontSize: 11 }}>Paris</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px" }}>
          {nav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                background: active ? "rgba(124,58,237,0.15)" : "transparent",
                color: active ? "#a78bfa" : "#71717a",
                fontWeight: active ? 600 : 400, fontSize: 14,
                textDecoration: "none", transition: "all 0.15s"
              }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

      </aside>

      {/* Mobile bottom nav */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "#111113", borderTop: "1px solid #1f1f23",
        display: "flex", justifyContent: "space-around", padding: "8px 0 12px"
      }} className="md:hidden">
        {nav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              color: active ? "#a78bfa" : "#52525b", textDecoration: "none", fontSize: 10,
              fontWeight: active ? 600 : 400, minWidth: 48
            }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 10 }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
