import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const provider = requestUrl.searchParams.get('provider')
    
    if (!code) {
      return NextResponse.redirect(
        `${requestUrl.origin}/dashboard?error=missing_code`
      )
    }

    const supabase = createRouteHandlerClient({ cookies })
    
    // Exchange code for session
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Exchange error:', exchangeError)
      return NextResponse.redirect(
        `${requestUrl.origin}/dashboard?error=auth_exchange`
      )
    }

    if (!session?.user) {
      return NextResponse.redirect(
        `${requestUrl.origin}/dashboard?error=no_session`
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
        `${new URL(request.url).origin}/dashboard?error=profile_update`
      )
    }

    // Redirect to dashboard with success message
    return NextResponse.redirect(
      `${new URL(request.url).origin}/dashboard?setup=success`
    )
  } catch (error) {
    console.error('Permissions callback error:', error)
    return NextResponse.redirect(
      `${new URL(request.url).origin}/dashboard?error=unknown`
    )
  }
} 