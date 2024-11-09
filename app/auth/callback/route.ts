import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const setup = requestUrl.searchParams.get('setup')
  const provider = requestUrl.searchParams.get('provider')
  
  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/error?message=No code provided`)
  }

  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error

    // If this was a permissions setup flow, update the user profile
    if (setup === 'permissions') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('user_profile')
          .update({ 
            permissions_setup_completed: true,
            [`${provider}_permissions_set`]: true,
          })
          .eq('id', user.id)
      }
    }

    // Redirect to dashboard
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
  } catch (error) {
    console.error('Error in callback:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/error?message=Failed to setup permissions`
    )
  }
}
