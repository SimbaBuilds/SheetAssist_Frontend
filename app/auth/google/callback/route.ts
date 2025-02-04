// Callback after Sign Up with Google

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'


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
      const [profileError, usageError] = await Promise.all([
        profileExists.error && supabase
          .from('user_profile')
          .insert({
            id: user.id
          }),
        usageExists.error && supabase
          .from('user_usage')
          .insert({
            user_id: user.id
          })
      ]);

      // Check for errors in creation
      if (profileError?.error || usageError?.error) {
        throw new Error('Failed to create user records');
      }
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
