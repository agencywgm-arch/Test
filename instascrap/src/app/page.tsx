import { createServerComponentClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createServerComponentClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
