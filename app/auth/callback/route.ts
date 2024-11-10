// For SUPABASE auth callback

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  
  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    
    try {
      await supabase.auth.exchangeCodeForSession(code)
      
      // After successful verification, update user profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        console.log('Updating email verification status for user:', user.id)
        const { error: updateError } = await supabase
          .from('user_profile')
          .update({ 
            email_verified: true 
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('Error updating email verification status:', updateError)
          throw updateError
        }
        console.log('Email verification status updated successfully')
      }

      // Redirect to permissions setup
      return NextResponse.redirect(new URL('/auth/setup-permissions', requestUrl.origin))
    } catch (error) {
      console.error('Error in auth callback:', error)
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent('Failed to verify email')}`, requestUrl.origin)
      )
    }
  }

  // Return to home page if no code present
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
