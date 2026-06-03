import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase'
import { normalizeProfile } from '@/lib/rapidapi'

export async function POST(request: NextRequest) {
  const supabase = await createRouteHandlerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: { username?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const { username } = body
  if (!username?.trim()) {
    return NextResponse.json({ error: 'Le username est requis' }, { status: 400 })
  }

  if (!process.env.RAPIDAPI_KEY) {
    return NextResponse.json({ error: 'Clé RapidAPI non configurée' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${encodeURIComponent(username.trim())}`,
      {
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com',
        },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: `Erreur RapidAPI: ${res.status}` }, { status: res.status })
    }

    const raw = await res.json()
    const profile = normalizeProfile(raw)

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('User scrape error:', err)
    return NextResponse.json({ error: 'Erreur lors du scraping' }, { status: 500 })
  }
}
