import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

export const createClient = () => {
  return createPagesBrowserClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookieOptions: {
      sameSite: 'none',
      secure: true,
      domain: '',
      path: '/'
    },
  })
}
