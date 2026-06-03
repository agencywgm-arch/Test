import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase'
import { AccountProfile } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createRouteHandlerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: {
    igSession?: string
    targets?: AccountProfile[]
    messageTemplate?: string
    dailyLimit?: number
    campaignName?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const { igSession, targets, messageTemplate, dailyLimit, campaignName } = body

  if (!igSession || !targets?.length || !messageTemplate) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  if (!process.env.PHANTOMBUSTER_KEY) {
    return NextResponse.json({ error: 'Clé Phantombuster non configurée' }, { status: 500 })
  }

  try {
    const res = await fetch('https://api.phantombuster.com/api/v2/agents/launch', {
      method: 'POST',
      headers: {
        'X-Phantombuster-Key': process.env.PHANTOMBUSTER_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: process.env.PHANTOMBUSTER_AGENT_ID ?? '2498171544132422',
        argument: JSON.stringify({
          sessionCookie: igSession,
          usernames: targets.map(t => `https://www.instagram.com/${t.username}/`),
          message: messageTemplate,
          numberOfAddsPerLaunch: dailyLimit ?? 20,
          delay: 30,
        }),
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Erreur Phantombuster: ${text}` }, { status: res.status })
    }

    const result = await res.json() as { containerId?: string }
    const containerId = result?.containerId ?? null

    await supabase.from('campaigns').insert({
      user_id: session.user.id,
      name: campaignName ?? 'Nouvelle campagne',
      message_template: messageTemplate,
      daily_limit: dailyLimit ?? 20,
      targets,
      pb_container_id: containerId,
      status: 'running',
    })

    return NextResponse.json({ containerId })
  } catch (err) {
    console.error('Campaign launch error:', err)
    return NextResponse.json({ error: 'Erreur lors du lancement' }, { status: 500 })
  }
}
