import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function RestaurantsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', logo_emoji: '🍽️', tables_count: 4 })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRestaurants(data ?? [])
        setLoading(false)
      })
  }, [user])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function slugify(name) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  async function createRestaurant(e) {
    e.preventDefault()
    setCreating(true)
    setError('')

    const slug = `${slugify(form.name)}-${Math.random().toString(36).slice(2, 6)}`

    const { data, error: err } = await supabase
      .from('restaurants')
      .insert({ ...form, owner_id: user.id, slug, tables_count: Number(form.tables_count) })
      .select()
      .single()

    if (err) {
      setError(err.message)
      setCreating(false)
      return
    }

    setRestaurants((prev) => [data, ...prev])
    setShowCreate(false)
    setForm({ name: '', address: '', logo_emoji: '🍽️', tables_count: 4 })
    setCreating(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-apple-bg">
      {/* Nav */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-apple-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-bold text-apple-black tracking-tight">VelvetGuest</span>
          <button
            onClick={signOut}
            className="text-sm text-apple-gray hover:text-apple-black transition"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-apple-black tracking-tight">Mes restaurants</h1>
            <p className="text-apple-gray mt-1 text-sm">Gérez vos établissements et vos menus</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-apple-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-apple-black/90 transition"
          >
            + Nouveau
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-apple-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-apple-border">
            <div className="text-5xl mb-4">🍽️</div>
            <h2 className="text-lg font-semibold text-apple-black mb-1">Aucun restaurant</h2>
            <p className="text-apple-gray text-sm mb-6">Créez votre premier établissement pour commencer</p>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-apple-black text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-apple-black/90 transition"
            >
              Créer un restaurant
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {restaurants.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/restaurants/${r.id}`)}
                className="bg-white rounded-2xl p-6 border border-apple-border text-left hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-apple-bg rounded-2xl flex items-center justify-center text-3xl">
                    {r.logo_emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-apple-black truncate group-hover:text-apple-black">
                      {r.name}
                    </h2>
                    <p className="text-apple-gray text-xs mt-0.5 truncate">{r.address || '—'}</p>
                    <p className="text-apple-gray text-xs mt-1">
                      {r.tables_count} table{r.tables_count > 1 ? 's' : ''}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-apple-border group-hover:text-apple-gray transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-apple-black mb-6">Nouveau restaurant</h2>
            <form onSubmit={createRestaurant} className="space-y-4">
              <div className="flex gap-3">
                <div className="shrink-0">
                  <label className="block text-xs font-medium text-apple-gray mb-1.5 uppercase tracking-wide">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={form.logo_emoji}
                    onChange={set('logo_emoji')}
                    className="w-16 text-center px-2 py-3 rounded-xl border border-apple-border bg-apple-bg text-2xl focus:outline-none focus:ring-2 focus:ring-apple-black/10"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-apple-gray mb-1.5 uppercase tracking-wide">
                    Nom du restaurant
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={set('name')}
                    placeholder="Le Petit Bistro"
                    className="w-full px-4 py-3 rounded-xl border border-apple-border bg-apple-bg text-apple-black placeholder-apple-gray/60 text-sm focus:outline-none focus:ring-2 focus:ring-apple-black/10 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-apple-gray mb-1.5 uppercase tracking-wide">
                  Adresse
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={set('address')}
                  placeholder="12 rue de la Paix, Paris"
                  className="w-full px-4 py-3 rounded-xl border border-apple-border bg-apple-bg text-apple-black placeholder-apple-gray/60 text-sm focus:outline-none focus:ring-2 focus:ring-apple-black/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-apple-gray mb-1.5 uppercase tracking-wide">
                  Nombre de tables
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.tables_count}
                  onChange={set('tables_count')}
                  className="w-full px-4 py-3 rounded-xl border border-apple-border bg-apple-bg text-apple-black text-sm focus:outline-none focus:ring-2 focus:ring-apple-black/10 transition"
                />
              </div>

              {error && (
                <p className="text-red-500 text-xs bg-red-50 rounded-xl px-4 py-3">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setError('') }}
                  className="flex-1 py-3 rounded-xl border border-apple-border text-sm font-medium text-apple-gray hover:text-apple-black transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-apple-black text-white py-3 rounded-xl text-sm font-semibold hover:bg-apple-black/90 transition disabled:opacity-50"
                >
                  {creating ? '...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
