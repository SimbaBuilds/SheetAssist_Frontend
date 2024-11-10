import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const PUBLIC_PATHS = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
  '/auth/confirm',
  '/auth/verify-email',
  '/auth/error',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/demos',
] as const

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public routes
  if (PUBLIC_PATHS.includes(pathname as any)) {
    return NextResponse.next()
  }

  // For /private route, ensure session exists
  if (pathname === '/private') {
    const response = await updateSession(request)
    const url = new URL(request.url)
    
    // If no session, redirect to login
    if (!response.ok) {
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
    
    return response
  }

  // Handle other protected routes
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
