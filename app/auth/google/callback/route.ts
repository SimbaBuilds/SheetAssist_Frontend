import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/auth/setup-permissions'
  
  if (!code) {
    return NextResponse.redirect(new URL('/auth/error?error=No code provided', requestUrl))
  }

  try {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { data: { session }, error: authError } = await supabase.auth.exchangeCodeForSession(code)
    if (authError) throw authError

    // Get user data
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw userError || new Error('No user found')
    }

    // Check if user profile exists
    const { data: profile } = await supabase
      .from('user_profile')
      .select()
      .eq('id', user.id)
      .single()

    if (!profile) {
      // Create user profile
      await supabase.from('user_profile').insert([
        {
          id: user.id,
          email: user.email,
          google_permissions_set: false,
          microsoft_permissions_set: false,
          permissions_setup_completed: false,
          plan: 'free'
        }
      ])

      // Create user usage record
      await supabase.from('user_usage').insert([
        {
          user_id: user.id,
          recent_urls: [],
          recent_queries: [],
          requests_this_week: 0,
          requests_this_month: 0,
          requests_previous_3_months: 0
        }
      ])
    }

    // Use the same redirect pattern as the confirm route
    return NextResponse.redirect(new URL(next, requestUrl.origin))

  } catch (error) {
    console.error('Error in Google callback:', error)
    return NextResponse.redirect(
      new URL(`/auth/error?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Authentication failed'
      )}`, requestUrl.origin)
    )
  }
}
