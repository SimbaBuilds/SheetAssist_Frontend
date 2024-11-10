import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { CALLBACK_ROUTES, REDIRECT_ROUTES } from "@/utils/constants"
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const PUBLIC_ROUTES = [
  '/',
  REDIRECT_ROUTES.LOGIN,
  '/auth/signup',
  '/auth/verify-email',
  '/auth/setup-permissions',
  CALLBACK_ROUTES.SUPABASE_CALLBACK,
  CALLBACK_ROUTES.GOOGLE_CALLBACK,
  CALLBACK_ROUTES.MICROSOFT_CALLBACK,
  REDIRECT_ROUTES.ERROR,
  '/demos',
  '/about',
  '/api/auth/signup'
] as const

const isPublicRoute = (path: string) => {
  return PUBLIC_ROUTES.includes(path as typeof PUBLIC_ROUTES[number]) ||
         path.startsWith('/_next') ||
         path.startsWith('/static') ||
         path.startsWith('/auth/callback') ||
         path.match(/\.(ico|png|jpg|jpeg|gif|svg)$/)
}

export async function middleware(request: NextRequest) {
  // Handle session refresh
  const response = await updateSession(request)
  
  const path = request.nextUrl.pathname

  // Allow all auth-related routes to proceed without redirect
  if (path.startsWith('/auth/')) {
    return response
  }

  // Get session from response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return response.cookies.get(name)?.value
        },
        set() {}, // We don't need to set cookies here
        remove() {}, // We don't need to remove cookies here
      },
    }
  )
  
  const { data: { session } } = await supabase.auth.getSession()

  // Protect non-public routes
  if (!isPublicRoute(path) && !session) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', path)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
