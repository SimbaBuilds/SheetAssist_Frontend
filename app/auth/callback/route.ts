// For SUPABASE auth callback

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const setup = requestUrl.searchParams.get('setup')
  const provider = requestUrl.searchParams.get('provider')
  
  // Log incoming parameters for debugging
  console.log('Callback params:', { code: !!code, setup, provider })
  
  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/error?message=No code provided`)
  }

  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Exchange the code for a session
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('Session exchange error:', sessionError)
      throw sessionError
    }

    // If this was a permissions setup flow, update the user profile
    if (setup === 'permissions' && data?.user) {
      const { error: updateError } = await supabase
        .from('user_profile')
        .update({ 
          permissions_setup_completed: true,
          [`${provider}_permissions_set`]: true,
        })
        .eq('id', data.user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw updateError
      }
    }

    // Redirect to dashboard
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
  } catch (error) {
    console.error('Error in callback:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?error=${encodeURIComponent(errorMessage)}`
    )
  }
}
