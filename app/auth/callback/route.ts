import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    
    if (!code) {
      return NextResponse.redirect(new URL('/auth/error', request.url))
    }

    const supabase = createRouteHandlerClient({ cookies })
    
    // Exchange the code for a session
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('Session exchange error:', sessionError)
      return NextResponse.redirect(new URL('/auth/error', request.url))
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.redirect(new URL('/auth/error', request.url))
    }

    // For new Google sign-ups, create or update user profile
    if (user.app_metadata.provider === 'google') {
      const { error: profileError } = await supabase
        .from('user_profile')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: user.user_metadata.full_name?.split(' ')[0] || '',
          last_name: user.user_metadata.full_name?.split(' ').slice(1).join(' ') || '',
          google_permissions_set: true,
          permissions_setup_completed: true,
          plan: 'free'
        })

      if (profileError) {
        console.error('Failed to create/update user profile:', profileError)
      }

      // Initialize usage tracking for new users
      const { data: existingUsage } = await supabase
        .from('user_usage')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!existingUsage) {
        await supabase
          .from('user_usage')
          .insert({
            user_id: user.id,
            recent_urls: [],
            recent_queries: [],
            requests_this_week: 0,
            requests_this_month: 0,
            requests_previous_3_months: 0
          })
      }
    }

    // For new Microsoft sign-ups, create or update user profile
    if (user.app_metadata.provider === 'azure') {
      const { error: profileError } = await supabase
        .from('user_profile')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: user.user_metadata.full_name?.split(' ')[0] || '',
          last_name: user.user_metadata.full_name?.split(' ').slice(1).join(' ') || '',
          microsoft_permissions_set: true,
          permissions_setup_completed: true,
          plan: 'free'
        })

      if (profileError) {
        console.error('Failed to create/update user profile:', profileError)
      }

      // Initialize usage tracking for new users
      const { data: existingUsage } = await supabase
        .from('user_usage')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!existingUsage) {
        await supabase
          .from('user_usage')
          .insert({
            user_id: user.id,
            recent_urls: [],
            recent_queries: [],
            requests_this_week: 0,
            requests_this_month: 0,
            requests_previous_3_months: 0
          })
      }
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }
}
