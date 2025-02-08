import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export const PUBLIC_PATHS = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
  '/auth/google/callback',
  '/auth/confirm',
  '/auth/verify-email',
  '/auth/error',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/setup-permissions', 
  'auth/names',
  '/demos',
  '/contact-us',
  '/terms-of-service',
  '/privacy-policy',
  '/scopes-note',
  '/api/contact',
  '/.well-known/microsoft-identity-association.json',
  '/api/stripe/webhooks',
  '/api/stripe/create-portal',
  '/api/stripe/create-checkout',

] as const

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  
  // Special handling for password reset
  if (pathname === '/auth/reset-password' && searchParams.has('code')) {
    return NextResponse.next()
  }

  if (PUBLIC_PATHS.includes(pathname as any)) {
    return NextResponse.next()
  }

  const response = await updateSession(request)
  
  // Check for session in all protected routes (including dashboard)
  if (!response.ok) {
    const url = new URL(request.url)
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
