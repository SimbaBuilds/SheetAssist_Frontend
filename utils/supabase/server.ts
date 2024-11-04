import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'


// Create a Supabase serever side client, 
// name sensetive URL and key are in .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
export function createClient() {
  return createServerComponentClient({
    cookies,
  })
}
