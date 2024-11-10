import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { CALLBACK_ROUTES, REDIRECT_ROUTES } from '@/utils/constants'

const PUBLIC_ROUTES = [
  '/',
  REDIRECT_ROUTES.LOGIN,
  '/auth/signup',
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
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname
  const isCallbackRoute = path.includes('/callback')

  // Always allow callback routes to proceed
  if (isCallbackRoute) {
    return res
  }

  // Redirect rules
  if (!isPublicRoute(path) && !path.startsWith('/api') && !session) {
    // Redirect to login if accessing protected route without session
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirectTo', path)
    return NextResponse.redirect(redirectUrl)
  }

  if (session?.user && path.startsWith('/auth') && !isCallbackRoute) {
    try {
      // Check if permissions are set up
      const { data: profile } = await supabase
        .from('user_profile')
        .select('permissions_setup_completed')
        .eq('id', session.user.id)
        .single()

      if (profile?.permissions_setup_completed) {
        // If permissions are set up, redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    } catch (error) {
      console.error('Error checking permissions:', error)
    }
    
    // If permissions are not set up or there was an error, allow access to auth routes
    return res
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
