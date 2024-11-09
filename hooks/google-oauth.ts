import { CALLBACK_ROUTES } from "../utils/constants"

const GOOGLE_OAUTH_CONFIG = {
  client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
  redirect_uri: 'http://localhost:3000/auth/google/callback', // Hardcode for development
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive'
  ]
} as const

export function getGoogleOAuthURL(): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  
  url.searchParams.append('client_id', GOOGLE_OAUTH_CONFIG.client_id)
  url.searchParams.append('redirect_uri', GOOGLE_OAUTH_CONFIG.redirect_uri)
  url.searchParams.append('response_type', 'code')
  url.searchParams.append('access_type', 'offline')
  url.searchParams.append('prompt', 'consent')
  url.searchParams.append('scope', GOOGLE_OAUTH_CONFIG.scopes.join(' '))

  return url.toString()
}