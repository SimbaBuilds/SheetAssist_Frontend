import { NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/hooks/google-oauth'
import { CALLBACK_ROUTES } from '@/utils/constants'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=No code provided`)
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      code,
      `${process.env.NEXT_PUBLIC_SITE_URL}${CALLBACK_ROUTES.GOOGLE_CALLBACK}`
    )

    const supabase = createRouteHandlerClient({ cookies })

    // Check if user exists and email verification status
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw userError
    }

    if (!user) {
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/error?error=${encodeURIComponent(
          'Please verify your email before setting up Google permissions'
        )}`
      )
    }

    // Check if email is verified
    if (!user.email_confirmed_at) {
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/verify-email?message=${encodeURIComponent(
          'Please check your email and verify your account before setting up Google permissions'
        )}`
      )
    }

    // If we get here, user is verified - proceed with token storage
    const storeResponse = await fetch(
      `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/auth/store-google-tokens`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          tokens,
        }),
      }
    )

    if (!storeResponse.ok) {
      throw new Error('Failed to store tokens')
    }

    // Update user profile
    const { error: updateError } = await supabase
      .from('user_profile')
      .update({ google_permissions_set: true })
      .eq('id', user.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
  } catch (error) {
    console.error('Error in Google callback:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Failed to setup Google permissions'
      )}`
    )
  }
}
