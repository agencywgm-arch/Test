'use client'

import { useState, useEffect, useRef } from 'react'
import { Campaign } from '@/types'
import { createClientComponentClient } from '@/lib/supabase-browser'

interface Props {
  userId: string
}

interface CampaignStatus {
  status?: string
  output?: string
  duration?: number
  exitCode?: number
}

export default function TrackingPanel({ userId }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [statuses, setStatuses] = useState<Record<string, CampaignStatus>>({})
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const supabase = createClientComponentClient()

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setCampaigns(data as Campaign[])
    setLoading(false)
  }

  const fetchStatus = async (containerId: string) => {
    try {
      const res = await fetch(`/api/campaigns/status?containerId=${containerId}`)
      if (res.ok) {
        const data = await res.json() as CampaignStatus
        setStatuses(prev => ({ ...prev, [containerId]: data }))

        // Mettre à jour le statut local si terminal
        if (data.status === 'finished' || data.status === 'error') {
          setCampaigns(prev =>
            prev.map(c =>
              c.pb_container_id === containerId ? { ...c, status: data.status! } : c
            )
          )
        }
      }
    } catch {
      // ignore
    }
  }

  const pollActive = async () => {
    const active = campaigns.filter(
      c => c.status === 'running' && c.pb_container_id
    )
    for (const c of active) {
      if (c.pb_container_id) await fetchStatus(c.pb_container_id)
    }
  }

  useEffect(() => {
    loadCampaigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    const hasActive = campaigns.some(c => c.status === 'running' && c.pb_container_id)
    if (hasActive) {
      pollActive()
      intervalRef.current = setInterval(pollActive, 30_000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm" style={{ color: '#6b7280' }}>Chargement…</div>
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div
        className="rounded-2xl flex flex-col items-center justify-center py-16 text-center"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="text-4xl mb-3">📊</div>
        <p className="font-medium mb-1" style={{ color: '#e8e8f0' }}>Aucune campagne</p>
        <p className="text-sm" style={{ color: '#6b7280' }}>Lancez votre première campagne depuis l&apos;onglet Campagne DM</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: '#e8e8f0' }}>
          {campaigns.length} campagne{campaigns.length > 1 ? 's' : ''}
        </h2>
        <a
          href="https://phantombuster.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline"
          style={{ color: '#8b5cf6' }}
        >
          Voir sur Phantombuster →
        </a>
      </div>

      <div className="space-y-4">
        {campaigns.map(campaign => {
          const containerStatus = campaign.pb_container_id
            ? statuses[campaign.pb_container_id]
            : null
          const isActive = campaign.status === 'running'

          return (
            <div
              key={campaign.id}
              className="rounded-xl p-5"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {/* En-tête */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm" style={{ color: '#e8e8f0' }}>{campaign.name}</h3>
                    {isActive && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#fbbf24' }}>
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{ background: '#fbbf24', animation: 'pulse 2s infinite' }}
                        />
                        En cours — mise à jour toutes les 30s
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                    {new Date(campaign.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <StatusBadge status={campaign.status} />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <Stat label="Cibles" value={String(Array.isArray(campaign.targets) ? campaign.targets.length : 0)} />
                <Stat label="Limite/jour" value={`${campaign.daily_limit} DMs`} />
                {containerStatus?.duration != null && (
                  <Stat label="Durée" value={`${Math.round(containerStatus.duration)}s`} />
                )}
                {containerStatus?.exitCode != null && (
                  <Stat
                    label="Code sortie"
                    value={String(containerStatus.exitCode)}
                    color={containerStatus.exitCode === 0 ? '#34d399' : '#f87171'}
                  />
                )}
              </div>

              {/* Message template */}
              <div
                className="rounded-lg p-3 mb-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: '#6b7280' }}>Message template</p>
                <p className="text-xs" style={{ color: '#9ca3af' }}>{campaign.message_template}</p>
              </div>

              {/* Logs Phantombuster */}
              {containerStatus?.output && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: '#6b7280' }}>Logs Phantombuster</p>
                  <div
                    className="rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-xs"
                    style={{ background: 'rgba(0,0,0,0.3)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    {containerStatus.output.split('\n').map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                </div>
              )}

              {campaign.pb_container_id && (
                <p className="text-xs mt-2 font-mono" style={{ color: '#4b5563' }}>
                  Container: {campaign.pb_container_id}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    running: { color: '#fbbf24', label: '▶ En cours' },
    finished: { color: '#34d399', label: '✓ Terminé' },
    error: { color: '#f87171', label: '✕ Erreur' },
    pending: { color: '#6b7280', label: '⏳ En attente' },
  }
  const { color, label } = map[status] ?? { color: '#6b7280', label: status }
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
      style={{ color, background: `${color}18`, border: `1px solid ${color}33` }}
    >
      {label}
    </span>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="rounded-lg p-2.5 text-center"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="text-sm font-bold" style={{ color: color ?? '#e8e8f0' }}>{value}</div>
      <div className="text-xs" style={{ color: '#6b7280' }}>{label}</div>
    </div>
  )
}
