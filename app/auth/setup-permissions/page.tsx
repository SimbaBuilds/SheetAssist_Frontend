import { SetupPermissionsPage } from '@/components/pages/signup/SetupPermissionsPage'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function Page() {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
    redirect('/auth/login')
  }
  return <SetupPermissionsPage />
} 