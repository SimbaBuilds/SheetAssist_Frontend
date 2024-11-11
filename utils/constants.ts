export const CALLBACK_ROUTES = {
    GOOGLE_CALLBACK: '/auth/google/callback',
    MICROSOFT_CALLBACK: '/auth/microsoft/callback',
    SUPABASE_CALLBACK: '/auth/callback',
    PERMISSIONS_CALLBACK: '/auth/permissions-callback'
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
  
  export const DOCUMENT_SCOPES = {
    google: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive'
    ].join(' '),
    microsoft: [
      'offline_access',
      'Files.ReadWrite.All',
      'Sites.ReadWrite.All'
    ].join(' ')
  } as const
  