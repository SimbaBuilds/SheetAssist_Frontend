import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  
  if (error) {
    console.error('Microsoft OAuth error:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?error=${encodeURIComponent(error)}`
    )
  }
  
  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/error?message=No code provided`)
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          code,
          redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/microsoft/callback`,
          grant_type: 'authorization_code',
        }),
      }
    )

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Token exchange error:', errorData)
      throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`)
    }

    const tokens = await tokenResponse.json()

    // Get the current user from Supabase
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Update user's profile
    const { error: updateError } = await supabase
      .from('user_profile')
      .update({ microsoft_permissions_set: true })
      .eq('id', user.id)

    if (updateError) {
      throw updateError
    }

    // Store tokens in backend
    const storeResponse = await fetch(
      `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/auth/store-microsoft-tokens`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, tokens }),
        credentials: 'include',
      }
    )

    if (!storeResponse.ok) {
      throw new Error('Failed to store tokens')
    }

    return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
  } catch (error) {
    console.error('Error in Microsoft callback:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Failed to setup Microsoft permissions'
      )}`
    )
  }
} 