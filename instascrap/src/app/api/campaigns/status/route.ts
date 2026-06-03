import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = await createRouteHandlerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const containerId = request.nextUrl.searchParams.get('containerId')
  if (!containerId) {
    return NextResponse.json({ error: 'containerId requis' }, { status: 400 })
  }

  if (!process.env.PHANTOMBUSTER_KEY) {
    return NextResponse.json({ error: 'Clé Phantombuster non configurée' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://api.phantombuster.com/api/v2/containers/fetch-output?id=${containerId}`,
      {
        headers: {
          'X-Phantombuster-Key': process.env.PHANTOMBUSTER_KEY,
        },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: `Erreur Phantombuster: ${res.status}` }, { status: res.status })
    }

    const data = await res.json() as { status?: string }

    // Met à jour le statut en BDD si terminal
    if (data?.status === 'finished' || data?.status === 'error') {
      await supabase
        .from('campaigns')
        .update({ status: data.status })
        .eq('pb_container_id', containerId)
        .eq('user_id', session.user.id)
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Campaign status error:', err)
    return NextResponse.json({ error: 'Erreur de suivi' }, { status: 500 })
  }
}
