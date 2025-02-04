import { UserAccountPage } from '@/components/authorized/UserAccountPage'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function UserAccount() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (!user || userError) {
    redirect('/auth/login')
  }

  // Check if records exist
  const [profileExists, usageExists] = await Promise.all([
    supabase
      .from('user_profile')
      .select('id')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_usage')
      .select('user_id')
      .eq('user_id', user.id)
      .single()
  ]);

  // Create records if they don't exist
  if (profileExists.error || usageExists.error) {
    await Promise.all([
      profileExists.error && supabase
        .from('user_profile')
        .insert({
          id: user.id,
        }),
      usageExists.error && supabase
        .from('user_usage')
        .insert({
          user_id: user.id,
        })
    ]);
  }

  // Now fetch the complete data
  const [{ data: profile }, { data: usage }] = await Promise.all([
    supabase
      .from('user_profile')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .single()
  ]);

  // Pass the initial data to the client component
  return (
    <UserAccountPage 
      profile={profile} 
      user={user} 
      usage={usage}
    />
  )
} 