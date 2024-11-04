import { createClient } from '@supabase/supabase-js'
// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Define types for Deno namespace
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

// Create a single supabase client for interacting with your database
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Define the request type
interface RequestEvent {
  headers: Headers
}

serve(async (req: RequestEvent) => {
  try {
    // Verify the request is authorized
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Get all users
    const { data: users, error: fetchError } = await supabase
      .from('user_usage')
      .select('*')

    if (fetchError) {
      throw fetchError
    }

    // Update each user's usage
    const updates = users?.map(user => 
      supabase
        .from('user_usage')
        .update({
          requests_previous_3_months: user.requests_this_month,
          requests_this_month: 0,
          requests_this_week: 0
        })
        .eq('id', user.id)
    ) ?? []

    await Promise.all(updates)

    return new Response(
      JSON.stringify({ message: 'Monthly usage reset successful' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    // Proper error handling with type checking
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 