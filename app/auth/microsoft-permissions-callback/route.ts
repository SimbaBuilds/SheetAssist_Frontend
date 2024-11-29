import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!,
      client_secret: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_SECRET!,
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
  
  try {
    const code = requestUrl.searchParams.get('code')
    const provider = 'microsoft' // Hardcoded since this is the Microsoft callback
    const redirectUri = `${requestUrl.origin}/auth/microsoft-permissions-callback`

    if (!code) {
      return NextResponse.redirect(
        `${requestUrl.origin}/dashboard?error=missing_params`
      )
    }

    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.redirect(
        `${requestUrl.origin}/dashboard?error=no_user`
      )
    }

    // Exchange OAuth code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri)

    // Check if user already has access record
    const { data: existingAccess, error: accessCheckError } = await supabase
      .from('user_documents_access')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single()

    // Prepare token data
    const tokenData = {
      user_id: user.id,
      provider,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      token_type: tokens.token_type,
      scope: tokens.scope,
    }

    // If record exists, update it. If not, insert new record
    const { error: tokenError } = await supabase
      .from('user_documents_access')
      .upsert(tokenData, {
        onConflict: 'user_id,provider',
        ignoreDuplicates: false
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
        microsoft_permissions_set: true,
        permissions_setup_completed: true,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.redirect(
        `${requestUrl.origin}/dashboard?error=profile_update`
      )
    }

    return NextResponse.redirect(
      `${requestUrl.origin}/dashboard?setup=success`
    )
  } catch (error) {
    console.error('Permissions callback error:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/dashboard?error=unknown`
    )
  }
}
