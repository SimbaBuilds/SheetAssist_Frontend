import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Check if we need to do Microsoft auth next
  const pendingMicrosoftAuth = requestUrl.searchParams.get('pendingMicrosoftAuth')
  
  if (pendingMicrosoftAuth) {
    // Clear the pending flag
    const response = NextResponse.redirect(`${requestUrl.origin}/auth/microsoft`)
    return response
  }

  // If no pending auth, redirect to dashboard
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
