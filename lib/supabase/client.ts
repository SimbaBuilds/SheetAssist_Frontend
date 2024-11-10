import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

export const createClient = () => {
  return createPagesBrowserClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookieOptions: {
      name: 'sb-access-token',
      domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '',
      path: '/',
      sameSite: 'None',
      secure: true,
    },
  })
}
