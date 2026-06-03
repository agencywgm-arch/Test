import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nightlife Paris — AI Automation Stack",
  description: "Automatisation 80% des tâches d'un promoteur nightlife parisien. 3 agents IA, stack 100% gratuite, MVP 30 jours.",
};

const agents = [
  {
    number: "01",
    title: "Content Automation",
    color: "from-violet-600 to-purple-700",
    accent: "violet",
    icon: "✦",
    steps: [
      { icon: "⬡", label: "Apify scrape restaurants Paris (Google Maps, TripAdvisor)" },
      { icon: "◈", label: "Gemini score les photos — top 5 retenues" },
      { icon: "◉", label: "Génère textes carrousel + CTA fixe" },
      { icon: "◎", label: "Preview envoyée au promoteur via Telegram" },
      { icon: "◆", label: "Publication Instagram + TikTok après validation" },
    ],
  },
  {
    number: "02",
    title: "Client DM Automation",
    color: "from-pink-600 to-rose-700",
    accent: "pink",
    icon: "◈",
    steps: [
      { icon: "⬡", label: "ManyChat capte chaque nouveau DM Instagram" },
      { icon: "◈", label: "Bot répond aux FAQ (gratuit?, critères?, amie?)" },
      { icon: "◉", label: "Collecte profil : prénom, âge, Instagram, email" },
      { icon: "◎", label: "n8n qualifie le profil automatiquement" },
      { icon: "◆", label: "Décision promoteur sur Telegram → réponse finale" },
    ],
  },
  {
    number: "03",
    title: "Staff Automation",
    color: "from-amber-500 to-orange-600",
    accent: "amber",
    icon: "◉",
    steps: [
      { icon: "⬡", label: "Briefing automatique J-2 (Telegram/WhatsApp)" },
      { icon: "◈", label: "Staff confirme présence OUI/NON" },
      { icon: "◉", label: "Relance automatique si pas de réponse 12h" },
      { icon: "◎", label: "Escalade immédiate promoteur : absences, incidents" },
      { icon: "◆", label: "Rapport post-événement J+1 → Google Sheets" },
    ],
  },
];

const stack = [
  { name: "n8n", role: "Orchestration", host: "Railway", free: true },
  { name: "Google Sheets", role: "CRM central", host: "Google", free: true },
  { name: "ManyChat", role: "DM Instagram", host: "ManyChat", free: "1 000 contacts" },
  { name: "Apify", role: "Scraping restaurants", host: "Apify", free: "5€ crédits/mois" },
  { name: "Gemini 1.5 Flash", role: "Génération textes + scoring", host: "Google AI", free: "quasi gratuit" },
  { name: "Canva", role: "Visuels carrousels", host: "Canva", free: true },
  { name: "Telegram Bot", role: "Alertes + validations", host: "Telegram", free: true },
];

const timeline = [
  { week: "S1", title: "Infrastructure", desc: "n8n sur Railway + Google Sheets CRM + structure données", done: false },
  { week: "S2", title: "Agent DM", desc: "ManyChat flows + connexion Google Sheets + alertes Telegram", done: false },
  { week: "S3", title: "Agent Contenu", desc: "Apify + Gemini + Canva + validation Telegram avant publication", done: false },
  { week: "S4", title: "Agent Staff + Go Live", desc: "Agent Staff + tests end-to-end des 3 agents + mise en production", done: false },
];

export default function NightlifePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-zinc-950 to-pink-950/30" />
        <div className="relative max-w-5xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-1.5 text-xs text-zinc-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            MVP 30 jours · Stack 100% gratuite · 0–5€/mois
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Nightlife Paris
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">
              AI Automation Stack
            </span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
            3 agents IA qui automatisent 80% des tâches d'un promoteur nightlife parisien —
            création de contenu, DMs Instagram, gestion du staff.
            Validation humaine obligatoire à chaque étape clé.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://github.com/agencywgm-arch/test/tree/claude/nightlife-paris-ai-automation-fLc0d/nightlife-automation"
              className="inline-flex items-center gap-2 bg-white text-zinc-900 font-medium px-5 py-2.5 rounded-lg hover:bg-zinc-100 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Voir le code
            </a>
            <a
              href="/nightlife#setup"
              className="inline-flex items-center gap-2 border border-zinc-700 text-zinc-300 font-medium px-5 py-2.5 rounded-lg hover:border-zinc-500 hover:text-white transition-colors"
            >
              Guide setup →
            </a>
          </div>
        </div>
      </section>

      {/* Règle globale */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-zinc-900 border border-amber-500/30 rounded-xl p-6 flex gap-4">
          <span className="text-amber-400 text-2xl mt-0.5">⚡</span>
          <div>
            <h3 className="font-semibold text-amber-400 mb-1">Règle globale — Validation promoteur obligatoire</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Aucun message sortant, aucune publication, aucune décision finale ne part sans validation explicite du promoteur.
              Le promoteur reçoit toujours sur Telegram : le contenu ou résumé +{" "}
              <span className="text-green-400 font-medium">Valider ✅</span>{" "}
              <span className="text-red-400 font-medium">Refuser ❌</span>{" "}
              <span className="text-blue-400 font-medium">Plus d'infos ℹ️</span>
            </p>
          </div>
        </div>
      </section>

      {/* 3 Agents */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold mb-8 text-center text-zinc-100">Les 3 agents</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div key={agent.number} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors">
              <div className={`bg-gradient-to-r ${agent.color} p-5`}>
                <div className="flex items-start justify-between">
                  <span className="text-white/60 text-xs font-mono">AGENT {agent.number}</span>
                  <span className="text-white/40 text-xl">{agent.icon}</span>
                </div>
                <h3 className="text-white font-bold text-lg mt-2">{agent.title}</h3>
              </div>
              <div className="p-5 space-y-3">
                {agent.steps.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-zinc-600 text-sm mt-0.5 shrink-0">{step.icon}</span>
                    <p className="text-zinc-400 text-sm leading-snug">{step.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section className="border-t border-zinc-800 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-8 text-center text-zinc-100">Architecture</h2>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 font-mono text-xs text-zinc-400 overflow-x-auto">
            <pre>{`┌──────────────────────────────────────────────────────────────┐
│                     PROMOTEUR TELEGRAM                       │
│             Valider ✅  /  Refuser ❌  /  Plus d'infos ℹ️    │
└───────────────────────┬──────────────────────────────────────┘
                        │  Validation humaine obligatoire
          ┌─────────────┼─────────────┐
          │             │             │
    AGENT 1        AGENT 2        AGENT 3
    Contenu          DMs            Staff
      │               │               │
   Apify           ManyChat       Telegram
   Gemini          n8n webhook    n8n scheduler
   Canva           Google Sheets  Google Sheets
   Instagram/TikTok
          │             │               │
          └─────────────┴───────────────┘
                        │
                  GOOGLE SHEETS CRM
               (source de vérité centrale)`}</pre>
          </div>
        </div>
      </section>

      {/* Stack */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-2 text-center text-zinc-100">Stack technique</h2>
        <p className="text-center text-zinc-500 text-sm mb-8">100% gratuite · 0–5€/mois</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stack.map((item) => (
            <div key={item.name} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
              <div>
                <div className="font-medium text-zinc-200 text-sm">{item.name}</div>
                <div className="text-zinc-500 text-xs mt-0.5">{item.role}</div>
                <div className="text-green-400/70 text-xs mt-1">
                  {item.free === true ? "Gratuit" : item.free}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline MVP */}
      <section id="setup" className="border-t border-zinc-800 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-2 text-center text-zinc-100">MVP — 4 semaines</h2>
          <p className="text-center text-zinc-500 text-sm mb-10">Plan d'implémentation semaine par semaine</p>
          <div className="space-y-4">
            {timeline.map((item, i) => (
              <div key={item.week} className="flex gap-6 items-start">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center">
                  <span className="text-violet-400 text-xs font-mono">{item.week}</span>
                </div>
                <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-zinc-200">{item.title}</span>
                    <span className="text-zinc-600 text-xs font-mono">Semaine {i + 1}</span>
                  </div>
                  <p className="text-zinc-400 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Files structure */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-8 text-center text-zinc-100">Fichiers inclus</h2>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 font-mono text-sm">
          <div className="space-y-1 text-zinc-400">
            {[
              { indent: 0, name: "nightlife-automation/", type: "dir" },
              { indent: 1, name: "n8n/", type: "dir" },
              { indent: 2, name: "agent1-content.json", type: "file", desc: "Workflow scraping → Gemini → validation → publication" },
              { indent: 2, name: "agent2-dm.json", type: "file", desc: "Workflow DM Instagram → qualification → décision" },
              { indent: 2, name: "agent3-staff.json", type: "file", desc: "Workflow briefing → confirmations → feedback" },
              { indent: 2, name: "promoteur-webhook.json", type: "file", desc: "Router webhook Telegram → workflows" },
              { indent: 1, name: "sheets/", type: "dir" },
              { indent: 2, name: "crm-structure.md", type: "file", desc: "Structure des 6 onglets Google Sheets" },
              { indent: 1, name: "manychat/", type: "dir" },
              { indent: 2, name: "flows.md", type: "file", desc: "7 flows ManyChat complets en français" },
              { indent: 1, name: "config/", type: "dir" },
              { indent: 2, name: "env.example", type: "file", desc: "Variables d'environnement complètes" },
              { indent: 2, name: "railway.toml", type: "file", desc: "Config déploiement Railway" },
              { indent: 2, name: "Dockerfile.n8n", type: "file", desc: "Image Docker n8n pour Railway" },
              { indent: 1, name: "scripts/", type: "dir" },
              { indent: 2, name: "setup-sheets.js", type: "file", desc: "Auto-configure les 6 onglets Google Sheets" },
              { indent: 2, name: "test-telegram.js", type: "file", desc: "Teste le bot et les boutons de validation" },
              { indent: 2, name: "test-gemini.js", type: "file", desc: "Teste l'API Gemini (scoring + génération contenu)" },
              { indent: 1, name: "README.md", type: "file", desc: "Guide setup complet S1→S4" },
            ].map((item, i) => (
              <div key={i} className="flex items-baseline gap-2" style={{ paddingLeft: `${item.indent * 20}px` }}>
                <span className="text-zinc-600">{item.indent > 0 ? (item.type === "dir" ? "├── " : "│   ├── ") : ""}</span>
                <span className={item.type === "dir" ? "text-blue-400" : "text-zinc-300"}>{item.name}</span>
                {item.desc && <span className="text-zinc-600 text-xs hidden sm:inline">— {item.desc}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Risques */}
      <section className="border-t border-zinc-800 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-8 text-center text-zinc-100">Risques & conformité</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: "🔒", title: "Meta officiel uniquement", desc: "Utiliser uniquement ManyChat (partenaire Meta officiel) pour les DMs — jamais d'outil non approuvé" },
              { icon: "🇪🇺", title: "RGPD dès le départ", desc: "Mention RGPD dans le bot DM dès le premier contact avec collecte de consentement explicite" },
              { icon: "👤", title: "Validation humaine systématique", desc: "Aucun message sortant ni publication sans feu vert explicite du promoteur via Telegram" },
              { icon: "💰", title: "Cap de dépenses IA", desc: "Configurer une alerte budget dans Google Cloud Console dès le début pour Gemini / OpenAI" },
            ].map((item) => (
              <div key={item.title} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                <div className="flex gap-3 items-start">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div>
                    <div className="font-medium text-zinc-200 mb-1">{item.title}</div>
                    <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 text-center text-zinc-600 text-sm">
        <p>Nightlife Paris AI Automation Stack · Coût total : 0–5€/mois</p>
      </footer>
    </div>
  );
}
