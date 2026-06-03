'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)

  const supabase = createClientComponentClient()
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Vérifiez votre email pour confirmer votre compte.')
    }
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#08080f' }}
    >
      {/* Arrière-plan décoratif */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(139,92,246,0.15) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-2 mb-2"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#grad)" />
              <path
                d="M10 22L16 10L22 22M13 18H19"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#8b5cf6" />
                  <stop offset="1" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-2xl font-bold" style={{ WebkitTextFillColor: 'initial', color: '#e8e8f0' }}>
              InstaScrap
            </span>
          </div>
          <p style={{ color: '#6b7280' }} className="text-sm">
            {isSignUp ? 'Créez votre compte' : 'Connectez-vous à votre compte'}
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2"
                style={{ color: '#e8e8f0' }}
              >
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="vous@exemple.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'rgba(139,92,246,0.05)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  color: '#e8e8f0',
                }}
                onFocus={e => {
                  e.currentTarget.style.border = '1px solid rgba(139,92,246,0.5)'
                  e.currentTarget.style.background = 'rgba(139,92,246,0.08)'
                }}
                onBlur={e => {
                  e.currentTarget.style.border = '1px solid rgba(139,92,246,0.2)'
                  e.currentTarget.style.background = 'rgba(139,92,246,0.05)'
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
                style={{ color: '#e8e8f0' }}
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'rgba(139,92,246,0.05)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  color: '#e8e8f0',
                }}
                onFocus={e => {
                  e.currentTarget.style.border = '1px solid rgba(139,92,246,0.5)'
                  e.currentTarget.style.background = 'rgba(139,92,246,0.08)'
                }}
                onBlur={e => {
                  e.currentTarget.style.border = '1px solid rgba(139,92,246,0.2)'
                  e.currentTarget.style.background = 'rgba(139,92,246,0.05)'
                }}
              />
            </div>

            {error && (
              <div
                className="text-sm px-4 py-3 rounded-xl"
                style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
              >
                {error}
              </div>
            )}

            {message && (
              <div
                className="text-sm px-4 py-3 rounded-xl"
                style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              }}
            >
              {loading ? 'Chargement…' : isSignUp ? 'Créer un compte' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
                setMessage(null)
              }}
              className="text-sm transition-colors"
              style={{ color: '#6b7280' }}
            >
              {isSignUp ? (
                <>
                  Déjà un compte ?{' '}
                  <span style={{ color: '#8b5cf6' }} className="font-medium">
                    Se connecter
                  </span>
                </>
              ) : (
                <>
                  Pas encore de compte ?{' '}
                  <span style={{ color: '#8b5cf6' }} className="font-medium">
                    Créer un compte
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
