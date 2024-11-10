// For SUPABASE auth callback after email verification

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    
    try {
      // Retrieve code verifier from cookies
      const codeVerifier = cookies().get('code_verifier')?.value

      if (!codeVerifier) {
        throw new Error('Code verifier not found in cookies')
      }

      // Exchange code for session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code, { codeVerifier })
      
      if (exchangeError) throw exchangeError
      if (!data.session) throw new Error('No session returned')

      // Clear code_verifier cookie
      const response = NextResponse.redirect(new URL('/auth/setup-permissions', requestUrl.origin))
      response.cookies.delete('code_verifier')
      return response
    } catch (error) {
      console.error('Error in auth callback:', error)
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(
          error instanceof Error ? error.message : 'Failed to verify email'
        )}`, requestUrl.origin)
      )
    }
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
