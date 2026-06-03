"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  runAIAnalysis,
  generateAndSaveEmail,
  generateAndSaveFollowUp,
  markOutreachSent,
  updateProspectStatus,
  updateProspectNotes,
  type ProspectStatus,
} from "@/lib/prospecting-actions";
import type { LeadAnalysis } from "@/lib/ai-agent";

const STATUS_CONFIG: Record<
  ProspectStatus,
  { label: string; color: string; bg: string }
> = {
  NEW: { label: "Nouveau", color: "text-gray-600", bg: "bg-gray-100" },
  CONTACTED: {
    label: "Contacté",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  INTERESTED: {
    label: "Intéressé",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  PROPOSAL: {
    label: "Proposition",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  WON: { label: "Gagné", color: "text-green-600", bg: "bg-green-50" },
  LOST: { label: "Perdu", color: "text-red-600", bg: "bg-red-50" },
};

const STATUSES: ProspectStatus[] = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "PROPOSAL",
  "WON",
  "LOST",
];

type Outreach = {
  id: string;
  type: string;
  subject: string | null;
  content: string;
  sentAt: Date | null;
  createdAt: Date;
};

type Prospect = {
  id: string;
  businessName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  businessType: string;
  city: string | null;
  country: string;
  status: string;
  score: number | null;
  aiAnalysis: string | null;
  notes: string | null;
  createdAt: Date;
  outreaches: Outreach[];
};

export default function ProspectDetail({ prospect: initial }: { prospect: Prospect }) {
  const [prospect, setProspect] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"overview" | "emails" | "notes">(
    "overview"
  );
  const [notes, setNotes] = useState(initial.notes || "");
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  const analysis: LeadAnalysis | null = prospect.aiAnalysis
    ? JSON.parse(prospect.aiAnalysis)
    : null;

  const cfg = STATUS_CONFIG[prospect.status as ProspectStatus];

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  }

  function handleAnalyze() {
    startTransition(async () => {
      const result = await runAIAnalysis(prospect.id);
      setProspect((p) => ({
        ...p,
        score: result.score,
        aiAnalysis: JSON.stringify(result),
      }));
    });
  }

  function handleGenerateEmail() {
    startTransition(async () => {
      const outreach = await generateAndSaveEmail(prospect.id);
      setProspect((p) => ({
        ...p,
        outreaches: [outreach as Outreach, ...p.outreaches],
      }));
      setActiveTab("emails");
    });
  }

  function handleFollowUp(originalId: string) {
    startTransition(async () => {
      const outreach = await generateAndSaveFollowUp(prospect.id, originalId);
      setProspect((p) => ({
        ...p,
        outreaches: [outreach as Outreach, ...p.outreaches],
      }));
    });
  }

  function handleMarkSent(outreachId: string) {
    startTransition(async () => {
      await markOutreachSent(outreachId, prospect.id);
      setProspect((p) => ({
        ...p,
        status: "CONTACTED",
        outreaches: p.outreaches.map((o) =>
          o.id === outreachId ? { ...o, sentAt: new Date() } : o
        ),
      }));
    });
  }

  function handleStatusChange(newStatus: ProspectStatus) {
    startTransition(async () => {
      await updateProspectStatus(prospect.id, newStatus);
      setProspect((p) => ({ ...p, status: newStatus }));
    });
  }

  function handleSaveNotes() {
    startTransition(async () => {
      await updateProspectNotes(prospect.id, notes);
    });
  }

  const sentEmails = prospect.outreaches.filter((o) => o.sentAt);
  const draftEmails = prospect.outreaches.filter((o) => !o.sentAt);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link
              href="/prospecting"
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ← Prospection
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 text-sm font-medium">
              {prospect.businessName}
            </span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {prospect.businessName}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-gray-500">
                  {prospect.businessType}
                </span>
                {prospect.city && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-sm text-gray-500">
                      📍 {prospect.city}
                    </span>
                  </>
                )}
                {prospect.website ? (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                      ✓ A un site
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                      ✗ Sans site web
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {prospect.score !== null && (
                <div className="text-center">
                  <div
                    className={`text-2xl font-black ${
                      prospect.score >= 80
                        ? "text-green-600"
                        : prospect.score >= 60
                          ? "text-yellow-600"
                          : "text-orange-500"
                    }`}
                  >
                    {prospect.score}
                  </div>
                  <div className="text-xs text-gray-400">Score IA</div>
                </div>
              )}
              <select
                value={prospect.status}
                onChange={(e) =>
                  handleStatusChange(e.target.value as ProspectStatus)
                }
                className={`text-sm font-medium px-3 py-1.5 rounded-full border cursor-pointer ${cfg.bg} ${cfg.color}`}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Contact info + AI actions */}
          <div className="space-y-4">
            {/* Contact Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wider">
                Contact
              </h2>
              <div className="space-y-2">
                {prospect.contactName && (
                  <InfoRow icon="👤" value={prospect.contactName} />
                )}
                {prospect.email && (
                  <InfoRow
                    icon="📧"
                    value={prospect.email}
                    copyable
                    onCopy={() => copyToClipboard(prospect.email!, "email")}
                    copied={copySuccess === "email"}
                  />
                )}
                {prospect.phone && (
                  <InfoRow
                    icon="📞"
                    value={prospect.phone}
                    copyable
                    onCopy={() => copyToClipboard(prospect.phone!, "phone")}
                    copied={copySuccess === "phone"}
                  />
                )}
                {prospect.website && (
                  <InfoRow icon="🌐" value={prospect.website} />
                )}
                {!prospect.contactName &&
                  !prospect.email &&
                  !prospect.phone && (
                    <p className="text-sm text-gray-400 italic">
                      Aucun contact renseigné
                    </p>
                  )}
              </div>
            </div>

            {/* AI Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wider">
                Agent IA
              </h2>
              <div className="space-y-2">
                <button
                  onClick={handleAnalyze}
                  disabled={isPending}
                  className="w-full flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? (
                    <span className="animate-spin">⟳</span>
                  ) : (
                    <span>🤖</span>
                  )}
                  {analysis ? "Ré-analyser le lead" : "Analyser le lead"}
                </button>
                <button
                  onClick={handleGenerateEmail}
                  disabled={isPending || !analysis}
                  className="w-full flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  title={
                    !analysis ? "Analysez d'abord le lead" : ""
                  }
                >
                  {isPending ? (
                    <span className="animate-spin">⟳</span>
                  ) : (
                    <span>✉️</span>
                  )}
                  Générer un email de prospection
                </button>
                {!analysis && (
                  <p className="text-xs text-gray-400 text-center">
                    Analysez d&apos;abord le lead pour générer un email
                  </p>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wider">
                Activité
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Emails générés</span>
                  <span className="font-semibold">
                    {prospect.outreaches.length}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Emails envoyés</span>
                  <span className="font-semibold text-blue-600">
                    {sentEmails.length}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Brouillons</span>
                  <span className="font-semibold text-gray-400">
                    {draftEmails.length}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Ajouté le</span>
                  <span className="font-semibold">
                    {new Date(prospect.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Tabs */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {(
                [
                  { key: "overview", label: "📊 Analyse IA" },
                  {
                    key: "emails",
                    label: `✉️ Emails (${prospect.outreaches.length})`,
                  },
                  { key: "notes", label: "📝 Notes" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <AnalysisTab analysis={analysis} isPending={isPending} />
            )}

            {activeTab === "emails" && (
              <EmailsTab
                outreaches={prospect.outreaches}
                onMarkSent={handleMarkSent}
                onFollowUp={handleFollowUp}
                onCopy={copyToClipboard}
                copySuccess={copySuccess}
                isPending={isPending}
                expanded={expandedEmail}
                setExpanded={setExpandedEmail}
              />
            )}

            {activeTab === "notes" && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 mb-3">Notes</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajoutez vos notes sur ce prospect..."
                  rows={8}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={isPending}
                  className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  Sauvegarder
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  value,
  copyable,
  onCopy,
  copied,
}: {
  icon: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-base">{icon}</span>
      <span className="text-gray-700 flex-1 truncate">{value}</span>
      {copyable && onCopy && (
        <button
          onClick={onCopy}
          className="text-xs text-indigo-500 hover:text-indigo-700 shrink-0"
        >
          {copied ? "✓" : "Copier"}
        </button>
      )}
    </div>
  );
}

function AnalysisTab({
  analysis,
  isPending,
}: {
  analysis: LeadAnalysis | null;
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-3 animate-spin">⟳</div>
        <p className="text-gray-500 font-medium">
          L&apos;agent IA analyse ce prospect...
        </p>
        <p className="text-gray-400 text-sm mt-1">
          Scoring, opportunités, approche commerciale
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-3">🤖</div>
        <p className="text-gray-500 font-medium">
          Aucune analyse disponible
        </p>
        <p className="text-gray-400 text-sm mt-1">
          Cliquez sur &quot;Analyser le lead&quot; pour que l&apos;IA évalue ce prospect
        </p>
      </div>
    );
  }

  const scoreColor =
    analysis.score >= 80
      ? "text-green-600"
      : analysis.score >= 60
        ? "text-yellow-600"
        : analysis.score >= 40
          ? "text-orange-500"
          : "text-red-500";

  const scoreBg =
    analysis.score >= 80
      ? "bg-green-50 border-green-200"
      : analysis.score >= 60
        ? "bg-yellow-50 border-yellow-200"
        : analysis.score >= 40
          ? "bg-orange-50 border-orange-200"
          : "bg-red-50 border-red-200";

  return (
    <div className="space-y-4">
      {/* Score */}
      <div className={`bg-white rounded-xl border p-4 ${scoreBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 mb-1">Score de lead IA</div>
            <div className={`text-4xl font-black ${scoreColor}`}>
              {analysis.score}
              <span className="text-lg text-gray-400">/100</span>
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-xl font-bold ${scoreColor} px-4 py-2 rounded-xl ${scoreBg} border`}
            >
              {analysis.scoreLabel}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {analysis.estimatedBudget}
            </div>
          </div>
        </div>
      </div>

      {/* Pain Points */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span>⚠️</span> Points de douleur identifiés
        </h3>
        <ul className="space-y-2">
          {analysis.painPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-red-400 mt-0.5 shrink-0">•</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Opportunities */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span>💡</span> Opportunités
        </h3>
        <ul className="space-y-2">
          {analysis.opportunities.map((opp, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-green-500 mt-0.5 shrink-0">✓</span>
              {opp}
            </li>
          ))}
        </ul>
      </div>

      {/* Value proposition */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h3 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
          <span>🎯</span> Valeur d&apos;un site web pour ce business
        </h3>
        <p className="text-sm text-indigo-800">{analysis.websiteValue}</p>
      </div>

      {/* Approach */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <h3 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
          <span>🗣️</span> Approche commerciale recommandée
        </h3>
        <p className="text-sm text-emerald-800">
          {analysis.recommendedApproach}
        </p>
      </div>
    </div>
  );
}

function EmailsTab({
  outreaches,
  onMarkSent,
  onFollowUp,
  onCopy,
  copySuccess,
  isPending,
  expanded,
  setExpanded,
}: {
  outreaches: Outreach[];
  onMarkSent: (id: string) => void;
  onFollowUp: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  copySuccess: string | null;
  isPending: boolean;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
}) {
  if (outreaches.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-3">✉️</div>
        <p className="text-gray-500 font-medium">
          Aucun email généré
        </p>
        <p className="text-gray-400 text-sm mt-1">
          Analysez d&apos;abord le lead, puis générez un email personnalisé
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isPending && (
        <div className="bg-white rounded-xl border border-emerald-200 p-4 text-center">
          <div className="text-2xl mb-2 animate-spin">⟳</div>
          <p className="text-sm text-gray-500">Génération en cours...</p>
        </div>
      )}
      {outreaches.map((o, index) => (
        <div
          key={o.id}
          className={`bg-white rounded-xl border ${
            o.sentAt ? "border-blue-200" : "border-gray-200"
          } overflow-hidden`}
        >
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {o.sentAt ? (
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      ✓ Envoyé le{" "}
                      {new Date(o.sentAt).toLocaleDateString("fr-FR")}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      Brouillon
                    </span>
                  )}
                  {index === 0 && outreaches.length > 1 && (
                    <span className="text-xs text-gray-400">
                      (dernier généré)
                    </span>
                  )}
                </div>
                {o.subject && (
                  <div className="font-semibold text-gray-900 text-sm">
                    📧 {o.subject}
                  </div>
                )}
              </div>
              <button
                onClick={() =>
                  setExpanded(expanded === o.id ? null : o.id)
                }
                className="text-sm text-gray-500 hover:text-gray-700 shrink-0"
              >
                {expanded === o.id ? "▲ Réduire" : "▼ Voir"}
              </button>
            </div>

            {expanded === o.id && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {o.content}
                </pre>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button
                onClick={() =>
                  onCopy(
                    `Objet: ${o.subject}\n\n${o.content}`,
                    `copy-${o.id}`
                  )
                }
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {copySuccess === `copy-${o.id}` ? "✓ Copié !" : "📋 Copier"}
              </button>
              {!o.sentAt && (
                <button
                  onClick={() => onMarkSent(o.id)}
                  disabled={isPending}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  ✓ Marquer comme envoyé
                </button>
              )}
              {o.sentAt && (
                <button
                  onClick={() => onFollowUp(o.id)}
                  disabled={isPending}
                  className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  🔄 Générer une relance
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
