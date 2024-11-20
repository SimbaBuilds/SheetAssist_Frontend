import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LoginPage from '@/components/public/LoginPage'
import { Toaster } from 'sonner'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <>
      <Toaster position="top-center" richColors />
      <LoginPage />
    </>
  )
}