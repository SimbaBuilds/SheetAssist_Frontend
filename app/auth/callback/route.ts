import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const provider = requestUrl.searchParams.get('provider')
    
    if (!code) {
      return NextResponse.redirect(new URL('/auth/error', request.url))
    }

    const supabase = createRouteHandlerClient({ cookies })
    
    // Exchange the code for a session
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('Session exchange error:', sessionError)
      return NextResponse.redirect(new URL('/auth/error', request.url))
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.redirect(new URL('/auth/error', request.url))
    }

    // Update permissions status if this was an OAuth callback
    if (provider) {
      const { error: updateError } = await supabase
        .from('user_profile')
        .update({
          [`${provider}_permissions_set`]: true,
          permissions_setup_completed: true
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to update permissions status:', updateError)
      }
    }

    // Check for pending Microsoft auth
    const pendingMicrosoft = requestUrl.searchParams.get('pendingMicrosoft')
    if (pendingMicrosoft === 'true') {
      const { data: microsoftAuthData, error: microsoftError } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?provider=microsoft`,
          queryParams: {
            prompt: 'consent',
            access_type: 'offline',
          },
        },
      })

      if (!microsoftError && microsoftAuthData?.url) {
        return NextResponse.redirect(microsoftAuthData.url)
      }
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }
}
