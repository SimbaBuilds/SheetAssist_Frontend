import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { CALLBACK_ROUTES, API_ROUTES } from '@/utils/constants'

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=No code provided`)
  }

  try {
    // Initialize Supabase client
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!)

    // Store tokens securely via API route
    const storeResponse = await fetch(`${requestUrl.origin}/api/google/store-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens })
    })

    if (!storeResponse.ok) {
      throw new Error('Failed to store tokens')
    }

    // Update user profile to mark Google permissions as set
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

async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const tokenEndpoint = 'https://oauth2.googleapis.com/token'
  
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Missing required Google OAuth credentials')
  }

  const params = new URLSearchParams({
    code,
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Google OAuth error: ${errorData.error_description || errorData.error || 'Unknown error'}`)
    }

    return response.json()
  } catch (error) {
    console.error('Token exchange error:', error)
    throw new Error('Failed to exchange authorization code for tokens')
  }
}
