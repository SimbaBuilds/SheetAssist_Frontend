import { Names } from '@/components/public/signup/Names'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Page() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/auth/login')
  }

  // Check if user has a profile record
  const { data: profile, error: profileError } = await supabase
    .from('user_profile')
    .select('id')
    .eq('id', data.user.id)
    .single()

  // If profile doesn't exist, create it
  if (profileError) {
    const { error: createError } = await supabase
      .from('user_profile')
      .insert({ id: data.user.id, terms_acceptance: [{
        acceptedAt: new Date().toISOString(),
        termsVersion: "1.0"
      }] })

    if (createError) {
      console.error('Error creating user profile:', createError)
      redirect('/error')
    }
  }

  // Also ensure user_usage record exists
  const { data: usage, error: usageError } = await supabase
    .from('user_usage')
    .select('user_id')
    .eq('user_id', data.user.id)
    .single()

  // If usage record doesn't exist, create it
  if (usageError) {
    const { error: createUsageError } = await supabase
      .from('user_usage')
      .insert({ user_id: data.user.id })

    if (createUsageError) {
      console.error('Error creating user usage record:', createUsageError)
      redirect('/error')
    }
  }

  return <Names />
} 