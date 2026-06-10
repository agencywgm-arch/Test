"use client";

import { useState } from "react";
import { saveAgentConfig, testAgentConfig } from "@/lib/actions";

interface AgentConfigProps {
  agentId: string;
  agentName: string;
  agentDescription: string;
  icon: string;
  color: string;
  initialActive?: boolean;
  initialValues?: Record<string, string>;
  fields: {
    key: string;
    label: string;
    type: "text" | "textarea" | "toggle" | "select" | "number";
    placeholder?: string;
    defaultValue?: string | boolean | number;
    options?: { label: string; value: string }[];
    hint?: string;
    secret?: boolean;
  }[];
}

export function AgentConfigPanel({
  agentId, agentName, agentDescription, icon, color, fields,
  initialActive = false, initialValues,
}: AgentConfigProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(initialActive);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map(f => [
      f.key,
      initialValues?.[f.key] ?? String(f.defaultValue ?? ""),
    ]))
  );

  const persist = async (nextActive: boolean) => {
    setSaving(true);
    try {
      await saveAgentConfig(agentId, nextActive, values);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setTestResult({ ok: false, message: "Échec de la sauvegarde. Réessaie." });
    }
    setSaving(false);
  };

  const handleToggle = async () => {
    const next = !active;
    setActive(next);
    await persist(next);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testAgentConfig(agentId, values);
      setTestResult(result);
    } catch {
      setTestResult({ ok: false, message: "Erreur pendant le test. Réessaie." });
    }
    setTesting(false);
  };

  return (
    <div style={{
      background: "#18181b",
      border: `1px solid ${open ? color + "44" : "#27272a"}`,
      borderRadius: 16,
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      {/* Header — cliquable pour ouvrir/fermer */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "16px 20px",
          display: "flex", alignItems: "center", gap: 14,
          background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: `${color}18`, border: `1px solid ${color}33`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>
          {icon}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>{agentName}</span>
            <span style={{
              padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: active ? "rgba(16,185,129,0.15)" : "rgba(113,113,122,0.15)",
              color: active ? "#10b981" : "#71717a",
            }}>
              {active ? "● Actif" : "○ Inactif"}
            </span>
          </div>
          <div style={{ color: "#71717a", fontSize: 12, marginTop: 2 }}>{agentDescription}</div>
        </div>

        <span style={{ color: "#52525b", fontSize: 18, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>
          ‹
        </span>
      </button>

      {/* Config body */}
      {open && (
        <div style={{ borderTop: `1px solid #27272a`, padding: "20px" }}>
          {/* Activation toggle */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 20, padding: "12px 16px",
            background: active ? "rgba(16,185,129,0.08)" : "#09090b",
            borderRadius: 12, border: `1px solid ${active ? "rgba(16,185,129,0.2)" : "#1f1f23"}`,
          }}>
            <div>
              <div style={{ color: "white", fontWeight: 600, fontSize: 14 }}>
                {active ? "🟢 Agent activé" : "⚫ Agent désactivé"}
              </div>
              <div style={{ color: "#71717a", fontSize: 12, marginTop: 2 }}>
                {active ? "L'agent tourne en automatique" : "Cliquer pour activer l'automatisation"}
              </div>
            </div>
            <button
              onClick={handleToggle}
              disabled={saving}
              style={{
                width: 52, height: 28, borderRadius: 14, border: "none",
                cursor: saving ? "wait" : "pointer",
                background: active ? "#10b981" : "#3f3f46",
                position: "relative", transition: "background 0.2s", flexShrink: 0,
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: "50%", background: "white",
                position: "absolute", top: 4,
                left: active ? 28 : 4,
                transition: "left 0.2s",
              }} />
            </button>
          </div>

          {/* Champs de config */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {fields.map(field => {
              if (field.type === "toggle") return null; // handled above
              return (
                <div key={field.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={{ color: "#a1a1aa", fontSize: 12, fontWeight: 600 }}>
                      {field.label.toUpperCase()}
                    </label>
                    {field.hint && (
                      <span style={{ color: "#52525b", fontSize: 11 }}>{field.hint}</span>
                    )}
                  </div>

                  {field.type === "textarea" ? (
                    <textarea
                      value={values[field.key] ?? ""}
                      onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      rows={4}
                      style={{
                        width: "100%", padding: "10px 12px",
                        background: "#09090b", border: "1px solid #27272a",
                        borderRadius: 10, color: "white", fontSize: 13,
                        resize: "vertical", outline: "none", fontFamily: "inherit",
                        boxSizing: "border-box",
                      }}
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={values[field.key] ?? ""}
                      onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                      style={{
                        width: "100%", padding: "10px 12px",
                        background: "#09090b", border: "1px solid #27272a",
                        borderRadius: 10, color: "white", fontSize: 13,
                        outline: "none", cursor: "pointer",
                      }}
                    >
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.secret ? "password" : field.type === "number" ? "number" : "text"}
                      value={values[field.key] ?? ""}
                      onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      style={{
                        width: "100%", padding: "10px 12px",
                        background: "#09090b", border: "1px solid #27272a",
                        borderRadius: 10, color: "white", fontSize: 13,
                        outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Résultat du test */}
          {testResult && (
            <div style={{
              marginTop: 16, padding: "10px 14px", borderRadius: 10, fontSize: 13,
              background: testResult.ok ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${testResult.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              color: testResult.ok ? "#10b981" : "#f87171",
              lineHeight: 1.5,
            }}>
              {testResult.ok ? "✅" : "⚠️"} {testResult.message}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              onClick={() => persist(active)}
              disabled={saving}
              style={{
                flex: 1, padding: "10px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: saving ? "wait" : "pointer", border: "none",
                background: saved ? "rgba(16,185,129,0.2)" : `linear-gradient(135deg, ${color}, ${color}cc)`,
                color: saved ? "#10b981" : "white",
              }}
            >
              {saving ? "⏳ Sauvegarde…" : saved ? "✅ Sauvegardé" : "💾 Sauvegarder"}
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              style={{
                padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                cursor: testing ? "wait" : "pointer",
                background: "#27272a", color: "#a1a1aa", border: "none",
              }}
            >
              {testing ? "⏳ Test…" : "🧪 Tester"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
