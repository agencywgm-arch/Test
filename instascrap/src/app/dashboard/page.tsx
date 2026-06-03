import { createServerComponentClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Onboarding from '@/components/Onboarding'
import DashboardClient from '@/components/DashboardClient'
import { UserSettings } from '@/types'

export default async function DashboardPage() {
  const supabase = await createServerComponentClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (!settings) {
    return <Onboarding userId={session.user.id} />
  }

  return (
    <DashboardClient
      userSettings={settings as UserSettings}
      userId={session.user.id}
      userEmail={session.user.email ?? ''}
    />
  )
}
