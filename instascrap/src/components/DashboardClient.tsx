'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-browser'
import { AccountProfile, UserSettings } from '@/types'
import ScrapingPanel from './ScrapingPanel'
import CampaignPanel from './CampaignPanel'
import TrackingPanel from './TrackingPanel'

interface Props {
  userSettings: UserSettings
  userId: string
  userEmail: string
}

const TABS = [
  { id: 'scraping', label: '🔍 Scraping' },
  { id: 'campaign', label: '✉ Campagne DM' },
  { id: 'tracking', label: '📊 Suivi' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function DashboardClient({ userSettings, userId, userEmail }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('scraping')
  const [selectedAccounts, setSelectedAccounts] = useState<AccountProfile[]>([])
  const [signingOut, setSigningOut] = useState(false)

  const supabase = createClientComponentClient()
  const router = useRouter()

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const goToCampaign = () => setActiveTab('campaign')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#08080f' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          background: 'linear-gradient(to right, #0d0d1a, #180a2a)',
          borderBottom: '1px solid rgba(139,92,246,0.2)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-3">
          <LogoIcon />
          <span className="font-bold text-lg tracking-tight" style={{ color: '#e8e8f0' }}>
            InstaScrap
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm hidden sm:block" style={{ color: '#6b7280' }}>{userEmail}</span>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#9ca3af',
            }}
          >
            {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 px-6 pt-5 pb-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2.5 text-sm font-medium transition-all relative"
            style={{
              color: activeTab === tab.id ? '#e8e8f0' : '#6b7280',
              borderBottom: activeTab === tab.id ? '2px solid #8b5cf6' : '2px solid transparent',
            }}
          >
            {tab.label}
            {tab.id === 'campaign' && selectedAccounts.length > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', fontSize: '10px' }}
              >
                {selectedAccounts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full">
        {activeTab === 'scraping' && (
          <ScrapingPanel
            selectedAccounts={selectedAccounts}
            setSelectedAccounts={setSelectedAccounts}
            onCreateCampaign={goToCampaign}
          />
        )}
        {activeTab === 'campaign' && (
          <CampaignPanel
            targets={selectedAccounts}
            igSession={userSettings.ig_session}
            userId={userId}
          />
        )}
        {activeTab === 'tracking' && (
          <TrackingPanel userId={userId} />
        )}
      </main>
    </div>
  )
}

function LogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="url(#dlg)" />
      <path
        d="M8 20L14 9L20 20M11 16H17"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="dlg" x1="0" y1="0" x2="28" y2="28">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
    </svg>
  )
}
