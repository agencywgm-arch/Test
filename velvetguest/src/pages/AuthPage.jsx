import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage() {
  const { user, loading } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  if (loading) return null
  if (user) return <Navigate to="/restaurants" replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { name: form.name } },
        })
        if (err) throw err
        setSent(true)
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (err) throw err
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-apple-bg px-4">
        <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-sm">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-xl font-semibold text-apple-black mb-2">Vérifiez vos emails</h2>
          <p className="text-apple-gray text-sm">
            Un lien de confirmation vous a été envoyé à <strong>{form.email}</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-apple-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-3xl font-bold text-apple-black tracking-tight">VelvetGuest</span>
          <p className="text-apple-gray text-sm mt-1">La table connectée pour votre restaurant</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-apple-border">
          {/* Toggle */}
          <div className="flex bg-apple-bg rounded-2xl p-1 mb-8">
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-white text-apple-black shadow-sm'
                    : 'text-apple-gray'
                }`}
              >
                {m === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-apple-gray mb-1.5 uppercase tracking-wide">
                  Nom complet
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Jean Dupont"
                  className="w-full px-4 py-3 rounded-xl border border-apple-border bg-apple-bg text-apple-black placeholder-apple-gray/60 text-sm focus:outline-none focus:ring-2 focus:ring-apple-black/10 focus:border-apple-black/30 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-apple-gray mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={set('email')}
                placeholder="jean@monrestaurant.fr"
                className="w-full px-4 py-3 rounded-xl border border-apple-border bg-apple-bg text-apple-black placeholder-apple-gray/60 text-sm focus:outline-none focus:ring-2 focus:ring-apple-black/10 focus:border-apple-black/30 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-apple-gray mb-1.5 uppercase tracking-wide">
                Mot de passe
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-apple-border bg-apple-bg text-apple-black placeholder-apple-gray/60 text-sm focus:outline-none focus:ring-2 focus:ring-apple-black/10 focus:border-apple-black/30 transition"
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs bg-red-50 rounded-xl px-4 py-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-apple-black text-white py-3 rounded-xl text-sm font-semibold hover:bg-apple-black/90 transition disabled:opacity-50 mt-2"
            >
              {submitting
                ? '...'
                : mode === 'login'
                ? 'Se connecter'
                : 'Créer mon compte'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-apple-gray mt-6">
          {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà inscrit ? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            className="text-apple-black font-medium underline underline-offset-2"
          >
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  )
}
