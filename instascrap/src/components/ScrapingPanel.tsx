'use client'

import { useState, useCallback } from 'react'
import { AccountProfile } from '@/types'
import AccountCard from './AccountCard'

interface Filters {
  minFollowers: number | ''
  maxFollowers: number | ''
  minEngagement: number | ''
  emailOnly: boolean
  verifiedOnly: boolean
}

interface Props {
  selectedAccounts: AccountProfile[]
  setSelectedAccounts: (accounts: AccountProfile[]) => void
  onCreateCampaign: () => void
}

interface LogEntry {
  text: string
  type: 'info' | 'success' | 'error' | 'warn'
}

const DEFAULT_FILTERS: Filters = {
  minFollowers: '',
  maxFollowers: '',
  minEngagement: '',
  emailOnly: false,
  verifiedOnly: false,
}

export default function ScrapingPanel({ selectedAccounts, setSelectedAccounts, onCreateCampaign }: Props) {
  const [mode, setMode] = useState<'hashtag' | 'usernames'>('hashtag')
  const [hashtagInput, setHashtagInput] = useState('')
  const [usernamesInput, setUsernamesInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [results, setResults] = useState<AccountProfile[]>([])
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const addLog = useCallback((text: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-49), { text, type }])
  }, [])

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

  const fetchProfile = async (username: string): Promise<AccountProfile | null> => {
    const res = await fetch('/api/scrape/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    if (!res.ok) return null
    const data = await res.json() as { profile?: AccountProfile }
    return data.profile ?? null
  }

  const handleScrape = async () => {
    setLoading(true)
    setLogs([])
    setResults([])
    setSelectedSet(new Set())
    setProgress({ current: 0, total: 0 })

    try {
      let usernamesToFetch: string[] = []

      if (mode === 'hashtag') {
        const tag = hashtagInput.replace(/^#/, '').trim()
        if (!tag) { addLog('Entrez un hashtag.', 'error'); setLoading(false); return }

        addLog(`Recherche des posts pour #${tag}…`, 'info')
        const res = await fetch('/api/scrape/hashtag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hashtag: tag }),
        })
        const data = await res.json() as { usernames?: string[]; error?: string }
        if (!res.ok || data.error) {
          addLog(data.error ?? 'Erreur hashtag', 'error')
          setLoading(false)
          return
        }
        usernamesToFetch = data.usernames ?? []
        addLog(`${usernamesToFetch.length} comptes trouvés pour #${tag}`, 'success')
      } else {
        const raw = usernamesInput
          .split(/[\n,]+/)
          .map(u => u.replace(/^@/, '').trim())
          .filter(Boolean)
        usernamesToFetch = [...new Set(raw)].slice(0, 15)
        if (!usernamesToFetch.length) {
          addLog('Entrez au moins un username.', 'error')
          setLoading(false)
          return
        }
        addLog(`${usernamesToFetch.length} comptes à analyser…`, 'info')
      }

      setProgress({ current: 0, total: usernamesToFetch.length })

      const profiles: AccountProfile[] = []

      for (let i = 0; i < usernamesToFetch.length; i++) {
        const username = usernamesToFetch[i]
        addLog(`Analyse de @${username}…`, 'info')
        const profile = await fetchProfile(username)
        if (profile) {
          profiles.push(profile)
          addLog(`✓ @${username} — ${profile.followers.toLocaleString()} abonnés`, 'success')
        } else {
          addLog(`⚠ @${username} introuvable`, 'warn')
        }
        setProgress({ current: i + 1, total: usernamesToFetch.length })
        setResults([...profiles])

        if (i < usernamesToFetch.length - 1) await delay(400)
      }

      addLog(`Terminé — ${profiles.length} profils récupérés.`, 'success')

      // Auto-save
      if (profiles.length > 0) {
        const query = mode === 'hashtag' ? `#${hashtagInput.replace(/^#/, '').trim()}` : usernamesInput.slice(0, 50)
        fetch('/api/results/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, accounts: profiles }),
        }).catch(() => {})
      }
    } catch (err) {
      addLog('Erreur inattendue.', 'error')
      console.error(err)
    }

    setLoading(false)
  }

  const filteredResults = results.filter(a => {
    if (filters.minFollowers !== '' && a.followers < Number(filters.minFollowers)) return false
    if (filters.maxFollowers !== '' && a.followers > Number(filters.maxFollowers)) return false
    if (filters.minEngagement !== '' && a.engagement < Number(filters.minEngagement)) return false
    if (filters.emailOnly && !a.email) return false
    if (filters.verifiedOnly && !a.verified) return false
    return true
  })

  const toggleSelect = (username: string) => {
    setSelectedSet(prev => {
      const next = new Set(prev)
      if (next.has(username)) next.delete(username)
      else next.add(username)
      syncSelectedAccounts(next)
      return next
    })
  }

  const syncSelectedAccounts = (set: Set<string>) => {
    setSelectedAccounts(results.filter(a => set.has(a.username)))
  }

  const selectAll = () => {
    const next = new Set(filteredResults.map(a => a.username))
    setSelectedSet(next)
    syncSelectedAccounts(next)
  }

  const clearSelection = () => {
    setSelectedSet(new Set())
    setSelectedAccounts([])
  }

  const exportCSV = () => {
    const rows = results.filter(a => selectedSet.has(a.username))
    if (!rows.length) return

    const headers = ['username', 'fullName', 'followers', 'following', 'posts', 'engagement', 'bio', 'email', 'website', 'verified', 'isPrivate', 'category']
    const csv = [
      headers.join(','),
      ...rows.map(a =>
        [
          a.username,
          `"${(a.fullName ?? '').replace(/"/g, '""')}"`,
          a.followers,
          a.following,
          a.posts,
          a.engagement,
          `"${(a.bio ?? '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          a.email ?? '',
          a.website ?? '',
          a.verified,
          a.isPrivate,
          a.category ?? '',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `instascrap_${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const selectedCount = selectedSet.size

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {(['hashtag', 'usernames'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: mode === m ? 'linear-gradient(135deg,#8b5cf6,#ec4899)' : 'transparent',
              color: mode === m ? 'white' : '#6b7280',
            }}
          >
            {m === 'hashtag' ? '# Hashtag' : '@ Usernames'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Panneau gauche — Entrée + Filtres */}
        <div className="space-y-4">
          {/* Input */}
          <Card title={mode === 'hashtag' ? 'Hashtag à scraper' : 'Usernames à analyser'}>
            {mode === 'hashtag' ? (
              <div>
                <input
                  value={hashtagInput}
                  onChange={e => setHashtagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && handleScrape()}
                  placeholder="#fitness, #marketing…"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', color: '#e8e8f0' }}
                />
              </div>
            ) : (
              <div>
                <textarea
                  value={usernamesInput}
                  onChange={e => setUsernamesInput(e.target.value)}
                  placeholder="username1&#10;username2&#10;username3&#10;(max 15)"
                  rows={5}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', color: '#e8e8f0' }}
                />
                <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Séparez par virgule ou saut de ligne. Max 15.</p>
              </div>
            )}

            <button
              onClick={handleScrape}
              disabled={loading}
              className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)' }}
            >
              {loading ? `Scraping… (${progress.current}/${progress.total})` : 'Lancer le scraping'}
            </button>

            {loading && progress.total > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1" style={{ color: '#6b7280' }}>
                  <span>Progression</span>
                  <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                      background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
                    }}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Filtres */}
          <Card title="Filtres">
            <div className="space-y-3">
              <FilterInput label="Abonnés min" value={filters.minFollowers} onChange={v => setFilters(f => ({ ...f, minFollowers: v }))} placeholder="ex : 1000" />
              <FilterInput label="Abonnés max" value={filters.maxFollowers} onChange={v => setFilters(f => ({ ...f, maxFollowers: v }))} placeholder="ex : 100000" />
              <FilterInput label="Engagement min (%)" value={filters.minEngagement} onChange={v => setFilters(f => ({ ...f, minEngagement: v }))} placeholder="ex : 3" />

              <label className="flex items-center gap-2 cursor-pointer">
                <Toggle checked={filters.emailOnly} onChange={v => setFilters(f => ({ ...f, emailOnly: v }))} />
                <span className="text-xs" style={{ color: '#e8e8f0' }}>Email dans la bio uniquement</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <Toggle checked={filters.verifiedOnly} onChange={v => setFilters(f => ({ ...f, verifiedOnly: v }))} />
                <span className="text-xs" style={{ color: '#e8e8f0' }}>Certifiés uniquement</span>
              </label>
            </div>
          </Card>

          {/* Logs */}
          {logs.length > 0 && (
            <Card title="Logs">
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {logs.map((l, i) => (
                  <div
                    key={i}
                    className="text-xs font-mono"
                    style={{
                      color: l.type === 'success' ? '#34d399' : l.type === 'error' ? '#f87171' : l.type === 'warn' ? '#fbbf24' : '#9ca3af',
                    }}
                  >
                    {l.text}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Panneau droit — Résultats */}
        <div className="lg:col-span-2 space-y-4">
          {filteredResults.length > 0 && (
            <>
              {/* Barre d'actions */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: '#e8e8f0' }}>
                    {filteredResults.length} compte{filteredResults.length > 1 ? 's' : ''}
                    {results.length !== filteredResults.length && ` (${results.length} total)`}
                  </span>
                  {selectedCount > 0 && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}
                    >
                      {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* View toggle */}
                  <div
                    className="flex gap-1 p-0.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <button
                      onClick={() => setViewMode('grid')}
                      className="p-1.5 rounded"
                      style={{ background: viewMode === 'grid' ? 'rgba(139,92,246,0.2)' : 'transparent', color: viewMode === 'grid' ? '#8b5cf6' : '#6b7280' }}
                    >
                      <GridIcon />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className="p-1.5 rounded"
                      style={{ background: viewMode === 'list' ? 'rgba(139,92,246,0.2)' : 'transparent', color: viewMode === 'list' ? '#8b5cf6' : '#6b7280' }}
                    >
                      <ListIcon />
                    </button>
                  </div>

                  <button
                    onClick={selectAll}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e8f0' }}
                  >
                    Tout sélectionner
                  </button>

                  {selectedCount > 0 && (
                    <>
                      <button
                        onClick={clearSelection}
                        className="text-xs px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#6b7280' }}
                      >
                        Désélectionner
                      </button>
                      <button
                        onClick={exportCSV}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}
                      >
                        ↓ Export CSV
                      </button>
                      <button
                        onClick={onCreateCampaign}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)' }}
                      >
                        Créer campagne DM →
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Grille ou liste */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredResults.map(account => (
                    <AccountCard
                      key={account.username}
                      account={account}
                      selected={selectedSet.has(account.username)}
                      onToggle={toggleSelect}
                      viewMode="grid"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredResults.map(account => (
                    <AccountCard
                      key={account.username}
                      account={account}
                      selected={selectedSet.has(account.username)}
                      onToggle={toggleSelect}
                      viewMode="list"
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {!loading && results.length === 0 && (
            <div
              className="rounded-2xl flex flex-col items-center justify-center py-16 text-center"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-medium mb-1" style={{ color: '#e8e8f0' }}>Aucun résultat pour l&apos;instant</p>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                {mode === 'hashtag'
                  ? 'Entrez un hashtag et lancez le scraping'
                  : 'Entrez des usernames et lancez l\'analyse'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: '#e8e8f0' }}>{title}</h3>
      {children}
    </div>
  )
}

function FilterInput({
  label, value, onChange, placeholder,
}: { label: string; value: number | ''; onChange: (v: number | '') => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-xs outline-none"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#e8e8f0' }}
      />
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="w-8 h-4 rounded-full relative cursor-pointer flex-shrink-0 transition-all"
      style={{ background: checked ? '#8b5cf6' : 'rgba(255,255,255,0.1)' }}
    >
      <div
        className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
        style={{ background: 'white', left: checked ? '17px' : '2px' }}
      />
    </div>
  )
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="0" y="0" width="6" height="6" rx="1" />
      <rect x="8" y="0" width="6" height="6" rx="1" />
      <rect x="0" y="8" width="6" height="6" rx="1" />
      <rect x="8" y="8" width="6" height="6" rx="1" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 3.5h10M2 7h10M2 10.5h10" strokeLinecap="round" />
    </svg>
  )
}
