import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/auth/setup-permissions'
  
  if (!code) {
    redirect('/auth/error?error=No code provided')
  }

  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Handle the OAuth callback
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      throw error
    }

    // Get user data
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw userError || new Error('No user found')
    }

    // Check if user profile exists and create if it doesn't
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select()
      .eq('id', user.id)
      .single()

    if (!profile && !profileError) {
      await supabase.from('user_profile').insert([
        {
          id: user.id,
          email: user.email,
          google_permissions_set: false
        }
      ])
    }

    // Redirect to setup permissions
    redirect(next)
  } catch (error) {
    console.error('Error in Google callback:', error)
    redirect(`/auth/error?error=${encodeURIComponent(
      error instanceof Error ? error.message : 'Authentication failed'
    )}`)
  }
}
