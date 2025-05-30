// Callback after integrating with Google or Microsoft

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DOCUMENT_SCOPES } from '@/lib/constants/scopes'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

function hasAllRequiredScopes(grantedScopes: string): boolean {
  const requiredScopes = DOCUMENT_SCOPES.google.split(' ')
  const grantedScopesList = grantedScopes.split(' ')
  
  return requiredScopes.every(scope => grantedScopesList.includes(scope))
}

async function exchangeCodeForTokens(code: string, provider: string, redirectUri: string) {
  const tokenUrl = provider === 'google' ? GOOGLE_TOKEN_URL : MICROSOFT_TOKEN_URL
  const clientId = provider === 'google' 
    ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID 
    : process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID
  const clientSecret = provider === 'google'
    ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET
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
  
  try {
    const code = requestUrl.searchParams.get('code')
    const provider = requestUrl.searchParams.get('state')
    const redirectUri = `${requestUrl.origin}/auth/google-permissions-callback`

    if (!code || !provider) {
      return NextResponse.redirect(
        `${requestUrl.origin}/dashboard?error=missing_params`
      )
    }

    const supabase = await createClient()
    
    // Get current user instead of session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.redirect(
        `${requestUrl.origin}/dashboard?error=no_user`
      )
    }

    // Exchange OAuth code for tokens
    const tokens = await exchangeCodeForTokens(code, provider, redirectUri)

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
    // First check if profile exists
    const { data: profileExists, error: profileCheckError } = await supabase
      .from('user_profile')
      .select('id')
      .eq('id', user.id)
      .single()

    const hasAllScopes = provider === 'google' ? hasAllRequiredScopes(tokens.scope) : true

    if (profileCheckError) {
      // Create profile if it doesn't exist
      const { error: createError } = await supabase
        .from('user_profile')
        .insert({
          id: user.id,
          google_permissions_set: provider === 'google' ? hasAllScopes : false,
          terms_acceptance: [{
            acceptedAt: new Date().toISOString(),
            termsVersion: "1.0"
          }]
        })

      if (createError) {
        console.error('Profile creation error:', createError)
        return NextResponse.redirect(
          `${requestUrl.origin}/dashboard?error=profile_creation`
        )
      }
    } else {
      // Update existing profile only if all scopes are present for Google
      if (provider === 'google' && hasAllScopes) {
        const { error: updateError } = await supabase
          .from('user_profile')
          .update({
            google_permissions_set: true
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('Profile update error:', updateError)
          return NextResponse.redirect(
            `${requestUrl.origin}/dashboard?error=profile_update`
          )
        }
      }
    }

    const response = NextResponse.redirect(
      `${requestUrl.origin}/dashboard?setup=${hasAllScopes ? 'success' : 'incomplete_permissions'}`
    )

    return response
  } catch (error) {
    console.error('Permissions callback error:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/dashboard?error=unknown`
    )
  }
} 