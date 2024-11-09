export const CALLBACK_ROUTES = {
  GOOGLE_CALLBACK: '/auth/google/callback',
  MICROSOFT_CALLBACK: '/auth/microsoft/callback',
  SUPABASE_CALLBACK: '/auth/callback',
} as const

export const API_ROUTES = {
  STORE_GOOGLE_TOKENS: '/auth/store-google-tokens',
  STORE_MICROSOFT_TOKENS: '/auth/store-microsoft-tokens'
} as const

export const REDIRECT_ROUTES = {
  DASHBOARD: '/dashboard',
  LOGIN: '/auth/login',
  ERROR: '/auth/error'
} as const 