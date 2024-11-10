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

    // Get the current session
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      throw new Error('No authenticated session found')
    }

    // Store tokens via your backend
    const storeResponse = await fetch(
      `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/auth/store-google-tokens`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session.user.id,
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
      .eq('id', session.user.id)

    if (updateError) {
      throw updateError
    }

    // Log cookies
    const cookieHeader = request.headers.get('cookie')
    console.log('Cookie Header:', cookieHeader)

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
