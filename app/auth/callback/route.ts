import { createClient } from '@/utils/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth error:', error)
        return NextResponse.redirect(
          new URL('/auth/error', requestUrl.origin)
        )
      }

      // Successful authentication, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))

    } catch (error) {
      console.error('Error in auth callback:', error)
      return NextResponse.redirect(
        new URL('/auth/error', requestUrl.origin)
      )
    }
  }

  return NextResponse.redirect(
    new URL('/auth/error?error=No code provided', requestUrl.origin)
  )
}
