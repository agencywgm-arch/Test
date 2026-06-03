'use client'

import { useState, useEffect } from 'react'
import { AccountProfile, Campaign } from '@/types'
import { createClientComponentClient } from '@/lib/supabase-browser'

interface Props {
  targets: AccountProfile[]
  igSession: string
  userId: string
}

export default function CampaignPanel({ targets, igSession, userId }: Props) {
  const [campaignName, setCampaignName] = useState('')
  const [messageTemplate, setMessageTemplate] = useState('Bonjour {fullName} ! 👋')
  const [dailyLimit, setDailyLimit] = useState(20)
  const [launching, setLaunching] = useState(false)
  const [lastContainerId, setLastContainerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  const supabase = createClientComponentClient()

  useEffect(() => {
    loadCampaigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setCampaigns(data as Campaign[])
  }

  const renderPreview = (username: string, fullName: string) => {
    return messageTemplate
      .replace(/\{username\}/g, username)
      .replace(/\{fullName\}/g, fullName || username)
  }

  const handleLaunch = async () => {
    if (!targets.length) { setError('Aucune cible sélectionnée.'); return }
    if (!messageTemplate.trim()) { setError('Le message est requis.'); return }
    setError(null)
    setLaunching(true)

    const res = await fetch('/api/campaigns/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        igSession,
        targets,
        messageTemplate,
        dailyLimit,
        campaignName: campaignName || `Campagne ${new Date().toLocaleDateString('fr-FR')}`,
      }),
    })

    const data = await res.json() as { containerId?: string; error?: string }
    setLaunching(false)

    if (!res.ok || data.error) {
      setError(data.error ?? 'Erreur lors du lancement.')
    } else {
      setLastContainerId(data.containerId ?? null)
      loadCampaigns()
    }
  }

  const limitColor = dailyLimit <= 20 ? '#34d399' : dailyLimit <= 30 ? '#fbbf24' : '#f87171'
  const previewTargets = targets.slice(0, 3)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Formulaire */}
      <div className="lg:col-span-2 space-y-4">
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h2 className="text-base font-bold" style={{ color: '#e8e8f0' }}>Nouvelle campagne DM</h2>

          {/* Nom */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>Nom de la campagne</label>
            <input
              type="text"
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              placeholder={`Campagne ${new Date().toLocaleDateString('fr-FR')}`}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', color: '#e8e8f0' }}
              onFocus={e => { e.currentTarget.style.border = '1px solid rgba(139,92,246,0.5)' }}
              onBlur={e => { e.currentTarget.style.border = '1px solid rgba(139,92,246,0.2)' }}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>
              Message{' '}
              <span style={{ color: '#6b7280' }}>— variables : {'{username}'}, {'{fullName}'}</span>
            </label>
            <textarea
              value={messageTemplate}
              onChange={e => setMessageTemplate(e.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', color: '#e8e8f0' }}
              onFocus={e => { e.currentTarget.style.border = '1px solid rgba(139,92,246,0.5)' }}
              onBlur={e => { e.currentTarget.style.border = '1px solid rgba(139,92,246,0.2)' }}
            />
          </div>

          {/* Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: '#9ca3af' }}>Limite quotidienne</label>
              <span className="text-sm font-bold" style={{ color: limitColor }}>{dailyLimit} DMs/jour</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              value={dailyLimit}
              onChange={e => setDailyLimit(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: '#6b7280' }}>
              <span>5</span>
              <span style={{ color: '#34d399' }}>≤20 recommandé</span>
              <span>50</span>
            </div>
          </div>

          {/* Résumé cibles */}
          <div
            className="rounded-xl p-3 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <span className="text-sm" style={{ color: '#9ca3af' }}>
              Cibles sélectionnées
            </span>
            <span className="font-bold text-sm" style={{ color: targets.length > 0 ? '#8b5cf6' : '#6b7280' }}>
              {targets.length} compte{targets.length !== 1 ? 's' : ''}
            </span>
          </div>

          {error && (
            <div
              className="text-sm px-4 py-3 rounded-xl"
              style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
            >
              {error}
            </div>
          )}

          {lastContainerId && (
            <div
              className="text-sm px-4 py-3 rounded-xl space-y-1"
              style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}
            >
              <div className="font-semibold">✓ Campagne lancée !</div>
              <div className="text-xs font-mono opacity-75">Container ID : {lastContainerId}</div>
            </div>
          )}

          <button
            onClick={handleLaunch}
            disabled={launching || targets.length === 0}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)' }}
          >
            {launching ? 'Lancement en cours…' : `Lancer la campagne (${targets.length} cibles)`}
          </button>
        </div>

        {/* Conseils anti-ban */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}
        >
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#fbbf24' }}>⚠ Conseils anti-ban</h3>
          <ul className="space-y-1">
            {[
              'Maximum 20–30 DMs/jour pour éviter les restrictions',
              'Utilisez un compte Instagram avec au moins 3 mois d\'ancienneté',
              'Personnalisez votre message avec {username} ou {fullName}',
              'Faites des pauses entre les campagnes (1–2 jours)',
              'Ne ciblez pas des comptes privés ou inactifs',
            ].map((tip, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#9ca3af' }}>
                <span style={{ color: '#fbbf24' }}>•</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Aperçu + Historique */}
      <div className="space-y-4">
        {/* Aperçu live */}
        {previewTargets.length > 0 && (
          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#e8e8f0' }}>Aperçu du message</h3>
            <div className="space-y-2">
              {previewTargets.map(t => (
                <div
                  key={t.username}
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}
                >
                  <p className="text-xs font-semibold mb-1.5" style={{ color: '#8b5cf6' }}>→ @{t.username}</p>
                  <p className="text-xs whitespace-pre-wrap" style={{ color: '#e8e8f0' }}>
                    {renderPreview(t.username, t.fullName)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historique */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#e8e8f0' }}>Historique des campagnes</h3>
          {campaigns.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: '#6b7280' }}>Aucune campagne pour l&apos;instant</p>
          ) : (
            <div className="space-y-2">
              {campaigns.map(c => (
                <div
                  key={c.id}
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#e8e8f0' }}>{c.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                        {new Date(c.created_at).toLocaleDateString('fr-FR')} · {Array.isArray(c.targets) ? c.targets.length : 0} cibles
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    running: { color: '#fbbf24', label: 'En cours' },
    finished: { color: '#34d399', label: 'Terminé' },
    error: { color: '#f87171', label: 'Erreur' },
    pending: { color: '#6b7280', label: 'En attente' },
  }
  const { color, label } = map[status] ?? { color: '#6b7280', label: status }
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
      style={{ color, background: `${color}18`, border: `1px solid ${color}33` }}
    >
      {label}
    </span>
  )
}
