"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await login(email, password);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#09090b" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo */}
        <div className="text-center mb-10">
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, #7c3aed, #db2777)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, margin: "0 auto 16px"
          }}>🌙</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "white", marginBottom: 4 }}>Nightlife Paris</h1>
          <p style={{ color: "#71717a", fontSize: 14 }}>Accès promoteur</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>

            {error && (
              <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 14 }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ display: "block", color: "#a1a1aa", fontSize: 13, marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="promoteur@nightlife.paris"
                style={{
                  width: "100%", padding: "10px 14px", background: "#09090b",
                  border: "1px solid #3f3f46", borderRadius: 8, color: "white",
                  fontSize: 14, outline: "none", boxSizing: "border-box"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", color: "#a1a1aa", fontSize: 13, marginBottom: 6 }}>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: "100%", padding: "10px 14px", background: "#09090b",
                  border: "1px solid #3f3f46", borderRadius: 8, color: "white",
                  fontSize: 14, outline: "none", boxSizing: "border-box"
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "12px",
                background: loading ? "#3f3f46" : "linear-gradient(135deg, #7c3aed, #db2777)",
                border: "none", borderRadius: 8, color: "white",
                fontWeight: 600, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
                marginTop: 4
              }}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </div>
        </form>

        <p style={{ textAlign: "center", color: "#52525b", fontSize: 12, marginTop: 20 }}>
          Démo : promoteur@nightlife.paris / admin123
        </p>
      </div>
    </div>
  );
}
