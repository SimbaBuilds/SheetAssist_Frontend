import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LoginPage from '@/components/pages/LoginPage'

export default async function Page() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // If user is already logged in, redirect to dashboard
  if (session) {
    redirect('/dashboard')
  }

  return <LoginPage />
}