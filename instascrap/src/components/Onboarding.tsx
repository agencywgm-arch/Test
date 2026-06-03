'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-browser'

interface Props {
  userId: string
}

const STEPS = [
  { num: 1, title: 'Cookie Instagram', subtitle: 'Votre session de connexion' },
  { num: 2, title: 'Clé RapidAPI', subtitle: 'Pour scraper les profils' },
  { num: 3, title: 'Clé Phantombuster', subtitle: 'Pour envoyer des DMs' },
]

export default function Onboarding({ userId }: Props) {
  const [step, setStep] = useState(1)
  const [igSession, setIgSession] = useState('')
  const [rapidapiKey, setRapidapiKey] = useState('')
  const [pbKey, setPbKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()
  const router = useRouter()

  const handleComplete = async () => {
    setLoading(true)
    setError(null)

    const { error: dbError } = await supabase.from('user_settings').upsert({
      user_id: userId,
      ig_session: igSession.trim(),
      rapidapi_key: rapidapiKey.trim(),
      pb_key: pbKey.trim(),
    })

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#08080f' }}>
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(139,92,246,0.15) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <LogoIcon />
            <span className="text-2xl font-bold" style={{ color: '#e8e8f0' }}>InstaScrap</span>
          </div>
          <h1 className="text-xl font-bold mb-1" style={{ color: '#e8e8f0' }}>Configuration initiale</h1>
          <p className="text-sm" style={{ color: '#6b7280' }}>3 étapes pour commencer la prospection</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all"
                  style={{
                    background: step > s.num ? '#8b5cf6' : step === s.num ? 'linear-gradient(135deg,#8b5cf6,#ec4899)' : 'rgba(255,255,255,0.05)',
                    color: step >= s.num ? 'white' : '#6b7280',
                    border: step >= s.num ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold" style={{ color: step >= s.num ? '#e8e8f0' : '#6b7280' }}>
                    {s.title}
                  </div>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="w-8 h-0.5 mx-1 flex-shrink-0"
                  style={{ background: step > s.num ? '#8b5cf6' : 'rgba(255,255,255,0.07)' }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {step === 1 && (
            <Step1 value={igSession} onChange={setIgSession} />
          )}
          {step === 2 && (
            <Step2 value={rapidapiKey} onChange={setRapidapiKey} />
          )}
          {step === 3 && (
            <Step3 value={pbKey} onChange={setPbKey} />
          )}

          {error && (
            <div
              className="mt-4 text-sm px-4 py-3 rounded-xl"
              style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e8e8f0',
                }}
              >
                Retour
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={() => {
                  if (step === 1 && igSession.trim().length < 20) {
                    setError('Le cookie sessionid doit faire au moins 20 caractères.')
                    return
                  }
                  setError(null)
                  setStep(s => s + 1)
                }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-opacity"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
              >
                Suivant →
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading || pbKey.trim().length < 8}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
              >
                {loading ? 'Enregistrement…' : 'Terminer la configuration'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Step1({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: '#e8e8f0' }}>Cookie Instagram (sessionid)</h2>
        <p className="text-sm" style={{ color: '#6b7280' }}>
          Pas de mot de passe. On utilise uniquement votre cookie de session, jamais vos identifiants.
        </p>
      </div>

      <div
        className="rounded-xl p-4 space-y-2"
        style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)' }}
      >
        <p className="text-xs font-semibold mb-2" style={{ color: '#8b5cf6' }}>Guide étape par étape :</p>
        {[
          'Ouvre instagram.com dans Chrome et connecte-toi',
          'Appuie sur F12 (Windows) ou Cmd+Option+I (Mac)',
          'Clique sur l\'onglet "Application"',
          'Dans le menu gauche : Cookies → https://www.instagram.com',
          'Trouve la ligne "sessionid" → copie la valeur complète',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2 text-xs" style={{ color: '#9ca3af' }}>
            <span
              className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
              style={{ background: 'rgba(139,92,246,0.2)', color: '#8b5cf6' }}
            >
              {i + 1}
            </span>
            {step}
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#e8e8f0' }}>
          Valeur du sessionid
        </label>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Collez votre sessionid ici…"
          rows={3}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all"
          style={{
            background: 'rgba(139,92,246,0.05)',
            border: '1px solid rgba(139,92,246,0.2)',
            color: '#e8e8f0',
          }}
          onFocus={e => { e.currentTarget.style.border = '1px solid rgba(139,92,246,0.5)' }}
          onBlur={e => { e.currentTarget.style.border = '1px solid rgba(139,92,246,0.2)' }}
        />
        <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
          {value.length > 0 ? (
            value.length >= 20
              ? <span style={{ color: '#34d399' }}>✓ Valide ({value.length} caractères)</span>
              : <span style={{ color: '#f87171' }}>Trop court — minimum 20 caractères ({value.length}/20)</span>
          ) : 'Minimum 20 caractères'}
        </p>
      </div>
    </div>
  )
}

function Step2({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: '#e8e8f0' }}>Clé RapidAPI</h2>
        <p className="text-sm" style={{ color: '#6b7280' }}>
          Utilisée pour scraper les profils Instagram via l&apos;API Instagram Scraper.
        </p>
      </div>

      <div
        className="rounded-xl p-4 space-y-2"
        style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)' }}
      >
        <p className="text-xs font-semibold mb-2" style={{ color: '#8b5cf6' }}>Comment obtenir votre clé :</p>
        <p className="text-xs" style={{ color: '#9ca3af' }}>
          1. Allez sur{' '}
          <a
            href="https://rapidapi.com/social-api1-instagram/api/instagram-scraper-api2"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: '#8b5cf6' }}
          >
            rapidapi.com → Instagram Scraper API
          </a>
        </p>
        <p className="text-xs" style={{ color: '#9ca3af' }}>2. Créez un compte gratuit → Subscribe → plan Basic (100 requêtes/mois gratuit)</p>
        <p className="text-xs" style={{ color: '#9ca3af' }}>3. Copiez votre X-RapidAPI-Key depuis l&apos;onglet "Header Parameters"</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#e8e8f0' }}>
          X-RapidAPI-Key
        </label>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Votre clé RapidAPI…"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
          style={{
            background: 'rgba(139,92,246,0.05)',
            border: '1px solid rgba(139,92,246,0.2)',
            color: '#e8e8f0',
          }}
          onFocus={e => { e.currentTarget.style.border = '1px solid rgba(139,92,246,0.5)' }}
          onBlur={e => { e.currentTarget.style.border = '1px solid rgba(139,92,246,0.2)' }}
        />
      </div>
    </div>
  )
}

function Step3({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: '#e8e8f0' }}>Clé Phantombuster</h2>
        <p className="text-sm" style={{ color: '#6b7280' }}>
          Utilisée pour lancer des campagnes de DMs automatisées sur Instagram.
        </p>
      </div>

      <div
        className="rounded-xl p-4 space-y-2"
        style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)' }}
      >
        <p className="text-xs font-semibold mb-2" style={{ color: '#8b5cf6' }}>Comment obtenir votre clé :</p>
        <p className="text-xs" style={{ color: '#9ca3af' }}>
          1. Créez un compte sur{' '}
          <a
            href="https://phantombuster.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: '#8b5cf6' }}
          >
            phantombuster.com
          </a>
        </p>
        <p className="text-xs" style={{ color: '#9ca3af' }}>2. Allez dans Dashboard → Settings (icône engrenage)</p>
        <p className="text-xs" style={{ color: '#9ca3af' }}>3. Section "API Key" → copiez votre clé</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#e8e8f0' }}>
          Clé API Phantombuster
        </label>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Votre clé Phantombuster…"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
          style={{
            background: 'rgba(139,92,246,0.05)',
            border: '1px solid rgba(139,92,246,0.2)',
            color: '#e8e8f0',
          }}
          onFocus={e => { e.currentTarget.style.border = '1px solid rgba(139,92,246,0.5)' }}
          onBlur={e => { e.currentTarget.style.border = '1px solid rgba(139,92,246,0.2)' }}
        />
      </div>
    </div>
  )
}

function LogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="url(#lg)" />
      <path d="M8 20L14 9L20 20M11 16H17" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="28" y2="28">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
    </svg>
  )
}
