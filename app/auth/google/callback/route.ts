import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/error?message=No code provided`)
  }

  try {
    // Exchange the code for tokens with Google directly
    const tokens = await exchangeCodeForTokens(code)
    
    // Get the current user from Supabase to update their profile
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Failed to get current user')
    }

    // Update the user's profile to mark Google permissions as set
    const { error: updateError } = await supabase
      .from('user_profile')
      .update({ google_permissions_set: true })
      .eq('id', user.id)

    if (updateError) {
      throw updateError
    }

    // Store tokens securely (implement based on your backend architecture)
    await storeGoogleTokens(user.id, tokens)

    return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
  } catch (error) {
    console.error('Error in Google callback:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error occurred')}`
    )
  }
}

async function exchangeCodeForTokens(code: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to exchange code: ${error.error_description}`)
  }

  return response.json()
}

async function storeGoogleTokens(userId: string, tokens: any) {
  // Store tokens securely in your backend
  // This could be a call to your Python backend or another secure storage solution
  const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/auth/store-google-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      tokens
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to store Google tokens')
  }

  return response.json()
}
