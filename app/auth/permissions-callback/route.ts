import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

async function exchangeCodeForTokens(code: string, provider: string, redirectUri: string) {
  const tokenUrl = provider === 'google' ? GOOGLE_TOKEN_URL : MICROSOFT_TOKEN_URL
  const clientId = provider === 'google' 
    ? process.env.GOOGLE_CLIENT_ID 
    : process.env.MICROSOFT_CLIENT_ID
  const clientSecret = provider === 'google'
    ? process.env.GOOGLE_CLIENT_SECRET
    : process.env.MICROSOFT_CLIENT_SECRET

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId!,
      client_secret: clientSecret!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${await response.text()}`)
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const cookieStore = cookies()
  
  try {
    const code = requestUrl.searchParams.get('code')
    const provider = requestUrl.searchParams.get('state')
    const redirectUri = `${requestUrl.origin}/auth/permissions-callback`

    if (!code || !provider) {
      return NextResponse.redirect(
        `${requestUrl.origin}/dashboard?error=missing_params`
      )
    }

    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return NextResponse.redirect(
        `${requestUrl.origin}/dashboard?error=no_session`
      )
    }

    // Exchange OAuth code for tokens
    const tokens = await exchangeCodeForTokens(code, provider, redirectUri)

    // Store tokens in database
    const { error: tokenError } = await supabase
      .from('user_documents_access')
      .upsert({
        user_id: session.user.id,
        provider,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        token_type: tokens.token_type,
        scope: tokens.scope,
      })

    if (tokenError) {
      console.error('Token storage error:', tokenError)
      return NextResponse.redirect(
        `${requestUrl.origin}/dashboard?error=token_storage`
      )
    }

    // Update user_profile with permissions
    const { error: updateError } = await supabase
      .from('user_profile')
      .update({
        [`${provider}_permissions_set`]: true,
        permissions_setup_completed: true,
      })
      .eq('id', session.user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.redirect(
        `${requestUrl.origin}/dashboard?error=profile_update`
      )
    }

    const response = NextResponse.redirect(
      `${requestUrl.origin}/dashboard?setup=success`
    )

    // Get the current cookies from Supabase client
    const supabaseCookies = await supabase.auth.getSession()
    const currentCookies = cookieStore.getAll()

    // Merge cookies, prioritizing Supabase session cookies
    currentCookies.forEach(cookie => {
      response.cookies.set(cookie.name, cookie.value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
    })

    return response
  } catch (error) {
    console.error('Permissions callback error:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/dashboard?error=unknown`
    )
  }
} 