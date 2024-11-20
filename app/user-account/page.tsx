import { UserAccountPage } from '@/components/authorized/UserAccountPage'
import { createClient } from '@/utils/supabase/server'
import type { UserProfile, UserUsage } from '@/types/supabase_tables'
import type { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export default async function UserAccount() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (!user || userError) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('user_profile')
    .select('*')
    .eq('id', user.id)
    .single()
  const { data: usage } = await supabase
    .from('user_usage')
    .select('*')
    .eq('id', user.id)
    .single()


  // Pass the initial data to the client component
  return (
    <UserAccountPage 
      profile={profile} 
      user={user} 
      usage={usage}
    />
  )
} 