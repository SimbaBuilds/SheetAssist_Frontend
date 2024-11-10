import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LoginPage from '@/components/pages/LoginPage'
import { Toaster } from 'sonner'

export default async function Page() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    redirect('/dashboard')
  }

  return (
    <>
      <Toaster position="top-center" richColors />
      <LoginPage />
    </>
  )
}