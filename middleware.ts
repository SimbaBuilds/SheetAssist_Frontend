import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { CALLBACK_ROUTES, REDIRECT_ROUTES } from "@/utils/constants"

const PUBLIC_ROUTES = [
  '/',
  REDIRECT_ROUTES.LOGIN,
  '/auth/signup',
  '/auth/verify-email',
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

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({
    req,
    res
  })

  // Get session
  const { data: { session } } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname
  
  // Allow all auth-related routes to proceed without redirect
  if (path.startsWith('/auth/')) {
    return res
  }

  // Protect non-public routes
  if (!isPublicRoute(path) && !session) {
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirectTo', path)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
