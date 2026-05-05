"use client";

import { useState } from "react";
import { loginAdmin } from "@/lib/actions";
import { useRouter } from "next/navigation";

export default function LoginForm({ slug, primaryColor }: { slug: string; primaryColor: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await loginAdmin(slug, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(`/admin/${slug}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        style={{ backgroundColor: primaryColor }}
        className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {loading ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
