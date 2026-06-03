'use client'

import { AccountProfile } from '@/types'

interface Props {
  account: AccountProfile
  selected: boolean
  onToggle: (username: string) => void
  viewMode?: 'grid' | 'list'
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function engColor(e: number): string {
  if (e >= 5) return '#34d399'
  if (e >= 3) return '#fbbf24'
  return '#f87171'
}

const PALETTE = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export default function AccountCard({ account, selected, onToggle, viewMode = 'grid' }: Props) {
  const initials = (account.fullName || account.username)
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const accentColor = PALETTE[account.username.charCodeAt(0) % PALETTE.length]

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onToggle(account.username)}
        className="flex items-center gap-4 px-4 py-3 cursor-pointer transition-all"
        style={{
          background: selected ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${selected ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: '10px',
        }}
      >
        {/* Checkbox */}
        <div
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
          style={{
            borderColor: selected ? '#8b5cf6' : 'rgba(255,255,255,0.25)',
            background: selected ? '#8b5cf6' : 'transparent',
          }}
        >
          {selected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs overflow-hidden"
          style={{ background: accentColor }}
        >
          {account.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatar} alt={account.username} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm" style={{ color: '#e8e8f0' }}>
              @{account.username}
            </span>
            {account.verified && <VerifiedBadge />}
            {account.isPrivate && <span className="text-xs" style={{ color: '#6b7280' }}>🔒</span>}
          </div>
          {account.fullName && (
            <p className="text-xs truncate" style={{ color: '#6b7280' }}>
              {account.fullName}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <Stat label="abonnés" value={fmt(account.followers)} />
          <span className="text-sm font-semibold" style={{ color: engColor(account.engagement) }}>
            {account.engagement.toFixed(1)}%
          </span>
          <Stat label="posts" value={String(account.posts)} />
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {account.email && <Badge color="#34d399" label="✉ Email" />}
          {account.website && <Badge color="#60a5fa" label="🔗 Site" />}
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => onToggle(account.username)}
      className="p-4 cursor-pointer transition-all flex flex-col gap-3"
      style={{
        background: selected ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${selected ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '14px',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{
            borderColor: selected ? '#8b5cf6' : 'rgba(255,255,255,0.25)',
            background: selected ? '#8b5cf6' : 'transparent',
          }}
        >
          {selected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm overflow-hidden"
          style={{ background: accentColor }}
        >
          {account.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatar} alt={account.username} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: '#e8e8f0' }}>
              @{account.username}
            </span>
            {account.verified && <VerifiedBadge />}
            {account.isPrivate && <span className="text-xs" style={{ color: '#6b7280' }}>🔒</span>}
          </div>
          {account.fullName && (
            <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
              {account.fullName}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {account.bio && (
        <p
          className="text-xs leading-relaxed overflow-hidden"
          style={{
            color: '#6b7280',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {account.bio}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="text-xs" style={{ color: '#9ca3af' }}>
          <span className="font-semibold" style={{ color: '#e8e8f0' }}>{fmt(account.followers)}</span> abonnés
        </div>
        <div className="text-xs font-semibold" style={{ color: engColor(account.engagement) }}>
          {account.engagement.toFixed(1)}% eng.
        </div>
        <div className="text-xs" style={{ color: '#9ca3af' }}>
          <span className="font-semibold" style={{ color: '#e8e8f0' }}>{account.posts}</span> posts
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {account.email && <Badge color="#34d399" label="✉ Email" />}
        {account.website && <Badge color="#60a5fa" label="🔗 Site" />}
        {account.category && <Badge color="#8b5cf6" label={account.category} />}
      </div>
    </div>
  )
}

function VerifiedBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
      <circle cx="7" cy="7" r="7" fill="#3b82f6" />
      <path d="M4 7L6 9L10 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        color,
        background: `${color}18`,
        border: `1px solid ${color}33`,
      }}
    >
      {label}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs text-center" style={{ color: '#6b7280' }}>
      <div className="font-semibold" style={{ color: '#e8e8f0' }}>{value}</div>
      <div>{label}</div>
    </div>
  )
}
