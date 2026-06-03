import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = await createRouteHandlerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: { hashtag?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const { hashtag } = body
  if (!hashtag?.trim()) {
    return NextResponse.json({ error: 'Le hashtag est requis' }, { status: 400 })
  }

  if (!process.env.RAPIDAPI_KEY) {
    return NextResponse.json({ error: 'Clé RapidAPI non configurée' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://instagram-scraper-api2.p.rapidapi.com/v1/hashtag?hashtag=${encodeURIComponent(hashtag.trim())}`,
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

    const data = await res.json()
    const items: unknown[] = data?.data?.items ?? data?.items ?? []
    const usernames = new Set<string>()

    for (const item of items) {
      const record = item as Record<string, unknown>
      const user = (record?.user ?? record?.owner) as Record<string, unknown> | undefined
      const username = user?.username as string | undefined
      if (username) usernames.add(username)
    }

    return NextResponse.json({ usernames: Array.from(usernames) })
  } catch (err) {
    console.error('Hashtag scrape error:', err)
    return NextResponse.json({ error: 'Erreur lors du scraping' }, { status: 500 })
  }
}
