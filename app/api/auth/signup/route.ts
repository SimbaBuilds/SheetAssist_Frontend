import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, password } = await request.json()
    const supabase = createRouteHandlerClient({ cookies })
    
    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }


    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Create user profile with permission tracking
    const { error: profileError } = await supabase
      .from('user_profile')
      .insert({
        id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        google_permissions_set: false,
        microsoft_permissions_set: false,
        permissions_setup_completed: false,
        plan: 'free'
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Initialize usage tracking
    const { error: usageError } = await supabase
      .from('user_usage')
      .insert({
        user_id: authData.user.id,
        recent_urls: [],
        recent_queries: [],
        requests_this_week: 0,
        requests_this_month: 0,
        requests_previous_3_months: 0
      })

    if (usageError) {
      console.error('Usage tracking initialization error:', usageError)
      return NextResponse.json(
        { error: 'Failed to initialize usage tracking' },
        { status: 500 }
      )
    }

    // // Set up database trigger for auto trial
    // const { error: trialError } = await supabase.rpc('start_trial', {
    //   user_id: authData.user.id
    // })

    // if (trialError) {
    //   console.error('Trial setup error:', trialError)
    //   // Don't return error - trial setup is not critical
    // }

    return NextResponse.json({ 
      success: true,
      user: authData.user,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 