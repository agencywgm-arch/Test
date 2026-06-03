"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  updateProspectStatus,
  deleteProspect,
  type ProspectStatus,
} from "@/lib/prospecting-actions";

const STATUS_CONFIG: Record<
  ProspectStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  NEW: {
    label: "Nouveau",
    color: "text-gray-600",
    bg: "bg-gray-100",
    border: "border-gray-300",
  },
  CONTACTED: {
    label: "Contacté",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-300",
  },
  INTERESTED: {
    label: "Intéressé",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-300",
  },
  PROPOSAL: {
    label: "Proposition",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-300",
  },
  WON: {
    label: "Gagné",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-300",
  },
  LOST: {
    label: "Perdu",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-300",
  },
};

const STATUSES: ProspectStatus[] = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "PROPOSAL",
  "WON",
  "LOST",
];

function scoreColor(score: number | null) {
  if (!score) return "text-gray-400";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function scoreBadge(score: number | null) {
  if (!score) return "bg-gray-100 text-gray-400";
  if (score >= 80) return "bg-green-100 text-green-700";
  if (score >= 60) return "bg-yellow-100 text-yellow-700";
  if (score >= 40) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

type Prospect = {
  id: string;
  businessName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  businessType: string;
  city: string | null;
  status: string;
  score: number | null;
  website: string | null;
  createdAt: Date;
  outreaches: { id: string; sentAt: Date | null }[];
};

type Stats = {
  total: number;
  won: number;
  contacted: number;
  conversionRate: number;
  avgScore: number | null;
  analyzed: number;
};

export default function ProspectingDashboard({
  prospects,
  stats,
}: {
  prospects: Prospect[];
  stats: Stats;
}) {
  const [filter, setFilter] = useState<ProspectStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [, startTransition] = useTransition();

  const filtered = prospects.filter((p) => {
    const matchStatus = filter === "ALL" || p.status === filter;
    const matchSearch =
      !search ||
      p.businessName.toLowerCase().includes(search.toLowerCase()) ||
      (p.city || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.contactName || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  function handleStatusChange(
    prospectId: string,
    newStatus: ProspectStatus
  ) {
    startTransition(() => {
      updateProspectStatus(prospectId, newStatus);
    });
  }

  function handleDelete(prospectId: string) {
    if (!confirm("Supprimer ce prospect ?")) return;
    startTransition(() => {
      deleteProspect(prospectId);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🎯 Prospection IA
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Outil de vente de sites web automatisé par agent IA
              </p>
            </div>
            <Link
              href="/prospecting/new"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              <span>+</span> Ajouter un prospect
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total prospects" value={stats.total} icon="👥" />
          <StatCard
            label="Contactés"
            value={stats.contacted}
            icon="📨"
            color="text-blue-600"
          />
          <StatCard
            label="Gagnés"
            value={stats.won}
            icon="🏆"
            color="text-green-600"
          />
          <StatCard
            label="Conversion"
            value={`${stats.conversionRate}%`}
            icon="📈"
            color="text-purple-600"
          />
          <StatCard
            label="Score moyen IA"
            value={stats.avgScore ? `${stats.avgScore}/100` : "—"}
            icon="🤖"
            color="text-indigo-600"
          />
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Rechercher un prospect..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === "list"
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              ☰ Liste
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === "kanban"
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              ⊞ Kanban
            </button>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === "ALL"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
            }`}
          >
            Tous ({prospects.length})
          </button>
          {STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const count = prospects.filter((p) => p.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  filter === s
                    ? `${cfg.bg} ${cfg.color} ${cfg.border} border`
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                }`}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Views */}
        {view === "list" ? (
          <ListView
            prospects={filtered}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        ) : (
          <KanbanView
            prospects={filtered}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color = "text-gray-900",
}: {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ListView({
  prospects,
  onStatusChange,
  onDelete,
}: {
  prospects: Prospect[];
  onStatusChange: (id: string, status: ProspectStatus) => void;
  onDelete: (id: string) => void;
}) {
  if (prospects.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-gray-500 font-medium">Aucun prospect trouvé</p>
        <p className="text-gray-400 text-sm mt-1">
          Ajoutez votre premier prospect pour commencer
        </p>
        <Link
          href="/prospecting/new"
          className="inline-block mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Ajouter un prospect
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Business
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Contact
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Ville
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Score IA
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Statut
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {prospects.map((p) => {
            const cfg = STATUS_CONFIG[p.status as ProspectStatus];
            const emailsSent = p.outreaches.filter((o) => o.sentAt).length;
            return (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900 text-sm">
                    {p.businessName}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {p.businessType}
                    {p.website && (
                      <span className="ml-2 text-green-600">✓ Site</span>
                    )}
                    {!p.website && (
                      <span className="ml-2 text-red-500">✗ Sans site</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p.contactName && (
                    <div className="text-sm text-gray-700">{p.contactName}</div>
                  )}
                  {p.email && (
                    <div className="text-xs text-gray-500">{p.email}</div>
                  )}
                  {p.phone && (
                    <div className="text-xs text-gray-500">{p.phone}</div>
                  )}
                  {!p.contactName && !p.email && !p.phone && (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {p.city || "—"}
                </td>
                <td className="px-4 py-3">
                  {p.score !== null ? (
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${scoreBadge(p.score)}`}
                    >
                      {p.score}/100
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Non analysé</span>
                  )}
                  {emailsSent > 0 && (
                    <div className="text-xs text-blue-500 mt-1">
                      {emailsSent} email{emailsSent > 1 ? "s" : ""} envoyé
                      {emailsSent > 1 ? "s" : ""}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={p.status}
                    onChange={(e) =>
                      onStatusChange(p.id, e.target.value as ProspectStatus)
                    }
                    className={`text-xs font-medium px-2 py-1 rounded-full border cursor-pointer ${cfg.bg} ${cfg.color} ${cfg.border}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_CONFIG[s].label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/prospecting/${p.id}`}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Ouvrir →
                    </Link>
                    <button
                      onClick={() => onDelete(p.id)}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KanbanView({
  prospects,
  onStatusChange,
}: {
  prospects: Prospect[];
  onStatusChange: (id: string, status: ProspectStatus) => void;
}) {
  const activeStatuses: ProspectStatus[] = [
    "NEW",
    "CONTACTED",
    "INTERESTED",
    "PROPOSAL",
    "WON",
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {activeStatuses.map((status) => {
        const cfg = STATUS_CONFIG[status];
        const columnProspects = prospects.filter((p) => p.status === status);
        return (
          <div key={status} className="flex-shrink-0 w-64">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-t-lg ${cfg.bg} border ${cfg.border} border-b-0`}
            >
              <span className={`text-sm font-semibold ${cfg.color}`}>
                {cfg.label}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full bg-white ${cfg.color} font-bold`}
              >
                {columnProspects.length}
              </span>
            </div>
            <div
              className={`min-h-48 border ${cfg.border} rounded-b-lg rounded-tr-lg p-2 space-y-2 bg-white`}
            >
              {columnProspects.map((p) => (
                <KanbanCard
                  key={p.id}
                  prospect={p}
                  onStatusChange={onStatusChange}
                />
              ))}
              {columnProspects.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-xs">
                  Aucun prospect
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  prospect,
  onStatusChange,
}: {
  prospect: Prospect;
  onStatusChange: (id: string, status: ProspectStatus) => void;
}) {
  const nextStatus: Record<string, ProspectStatus | null> = {
    NEW: "CONTACTED",
    CONTACTED: "INTERESTED",
    INTERESTED: "PROPOSAL",
    PROPOSAL: "WON",
    WON: null,
    LOST: null,
  };

  const next = nextStatus[prospect.status];

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
      <Link href={`/prospecting/${prospect.id}`}>
        <div className="font-semibold text-gray-900 text-sm leading-tight mb-1">
          {prospect.businessName}
        </div>
      </Link>
      <div className="text-xs text-gray-500 mb-2">
        {prospect.city || ""}
        {prospect.city && prospect.businessType && " · "}
        {prospect.businessType}
      </div>
      <div className="flex items-center justify-between">
        {prospect.score !== null ? (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBadge(prospect.score)}`}
          >
            {prospect.score}/100
          </span>
        ) : (
          <span className="text-xs text-gray-400">Non analysé</span>
        )}
        {next && (
          <button
            onClick={() => onStatusChange(prospect.id, next)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            → {STATUS_CONFIG[next].label}
          </button>
        )}
      </div>
    </div>
  );
}
