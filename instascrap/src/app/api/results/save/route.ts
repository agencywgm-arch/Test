import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase'
import { AccountProfile } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createRouteHandlerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: { query?: string; accounts?: AccountProfile[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const { query, accounts } = body
  if (!query || !accounts) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const { error } = await supabase.from('scrape_results').insert({
    user_id: session.user.id,
    query,
    accounts,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
