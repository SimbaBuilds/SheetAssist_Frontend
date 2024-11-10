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
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) throw error

      // Successful authentication, redirect to private page
      return NextResponse.redirect(new URL('/private', requestUrl.origin))
    } catch (error) {
      console.error('Error in auth callback:', error)
      return NextResponse.redirect(
        new URL('/auth/error', requestUrl.origin)
      )
    }
  }

  // Return to home page if no code
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
