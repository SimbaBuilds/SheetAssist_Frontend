// For SUPABASE auth callback

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const setup = requestUrl.searchParams.get('setup')
  const provider = requestUrl.searchParams.get('provider')
  
  // Log incoming parameters for debugging
  console.log('Callback params:', { code: !!code, setup, provider })
  
  if (!code) {
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?message=${encodeURIComponent('No code provided')}`
    )
  }

  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Exchange the code for a session
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('Session exchange error:', sessionError)
      throw sessionError
    }

    // If this is a regular email verification (not OAuth setup)
    if (!setup && !provider && data?.user) {
      // Update user profile to mark email as verified
      const { error: updateError } = await supabase
        .from('user_profile')
        .update({ 
          email_verified: true,
          last_sign_in: new Date().toISOString()
        })
        .eq('id', data.user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw updateError
      }

      // Redirect to permissions setup
      return NextResponse.redirect(`${requestUrl.origin}/auth/setup-permissions`)
    }

    // If this was a permissions setup flow (OAuth), update the user profile
    if (setup === 'permissions' && data?.user) {
      const { error: updateError } = await supabase
        .from('user_profile')
        .update({ 
          [`${provider}_permissions_set`]: true,
          permissions_setup_completed: true,
          last_sign_in: new Date().toISOString()
        })
        .eq('id', data.user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw updateError
      }

      // Redirect to dashboard after successful permissions setup
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
    }

    // Default redirect to dashboard
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`)

  } catch (error) {
    console.error('Error in callback:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Authentication failed'
      )}`
    )
  }
}
