import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!, // Make sure this is set in your .env
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
} 