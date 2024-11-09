import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, password } = await request.json()
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('user_profile')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
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
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // Create user profile with permission tracking
    const { error: profileError } = await supabase
      .from('user_profile')
      .insert({
        id: authData.user!.id,
        email,
        first_name: firstName,
        last_name: lastName,
        google_permissions_set: false,
        microsoft_permissions_set: false,
        permissions_setup_completed: false,
        plan: 'free'
      })

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Initialize usage tracking
    const { error: usageError } = await supabase
      .from('user_usage')
      .insert({
        user_id: authData.user!.id,
        recent_urls: [],
        recent_queries: [],
        requests_this_week: 0,
        requests_this_month: 0,
        requests_previous_3_months: 0
      })

    if (usageError) {
      return NextResponse.json(
        { error: 'Failed to initialize usage tracking' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      user: authData.user,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 