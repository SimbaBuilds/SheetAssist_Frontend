// Confirm email after Sign Up using Email and Email Verification

import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/auth/names'

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    
    if (!error) {
      try {
        // Get user data after verification
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          throw userError || new Error('No user found')
        }

        // Check if records exist
        const [profileExists, usageExists] = await Promise.all([
          supabase
            .from('user_profile')
            .select('id')
            .eq('id', user.id)
            .single(),
          supabase
            .from('user_usage')
            .select('user_id')
            .eq('user_id', user.id)
            .single()
        ]);

        // Create records if they don't exist
        if (profileExists.error || usageExists.error) {
          const [profileError, usageError] = await Promise.all([
            profileExists.error && supabase
              .from('user_profile')
              .insert({
                id: user.id,
                terms_acceptance: [{
                  acceptedAt: new Date().toISOString(),
                  termsVersion: "1.0"
                }]
              }),
            usageExists.error && supabase
              .from('user_usage')
              .insert({
                user_id: user.id
              })
          ]);

          // Check for errors in creation
          if (profileError?.error || usageError?.error) {
            throw new Error('Failed to create user records');
          }

          // Send welcome email if this is a new user
          try {
            await supabase.functions.invoke('send-welcome-email', {
              body: {
                userId: user.id,
                email: user.email,
                name: user.user_metadata?.full_name || user.email?.split('@')[0]
              }
            });
          } catch (emailError) {
            // Log error but don't fail the signup process
            console.error('Failed to send welcome email:', emailError);
          }
        }
      } catch (error) {
        console.error('Error in user setup:', error);
        // Continue with redirect even if setup has issues
      }
      
      // redirect user to specified redirect URL or root of app
      redirect(next)
    }
  }

  // redirect the user to an error page with some instructions
  redirect('/auth/error?error=Invalid verification link')
}