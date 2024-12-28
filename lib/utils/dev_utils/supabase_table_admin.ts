import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Initialize Supabase client with type safety
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY as string

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey)

async function setupUserUsageTable(): Promise<void> {
  // Function implementation will go here
  // You can add table creation logic using supabase.rpc() or raw SQL queries
}

// For development/CLI usage
if (require.main === module) {
  setupUserUsageTable()
    .catch((error) => {
      console.error('Error setting up tables:', error)
      process.exit(1)
    })
}

export { supabase, setupUserUsageTable }
