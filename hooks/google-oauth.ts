import { CALLBACK_ROUTES } from "../utils/constants"
import axios from 'axios';

const GOOGLE_OAUTH_CONFIG = {
  client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
  redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}${CALLBACK_ROUTES.GOOGLE_CALLBACK}`,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive'
  ]
} as const

export function getGoogleOAuthURL(isPermissionsSetup: boolean = false): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  
  // Generate and store state
  const state = crypto.randomUUID()
  sessionStorage.setItem('googleOAuthState', state) // Store in sessionStorage

  url.searchParams.append('state', state)

  url.searchParams.append('client_id', GOOGLE_OAUTH_CONFIG.client_id)
  url.searchParams.append('redirect_uri', GOOGLE_OAUTH_CONFIG.redirect_uri)
  url.searchParams.append('response_type', 'code')
  url.searchParams.append('access_type', 'offline')
  url.searchParams.append('prompt', 'consent')

  if (isPermissionsSetup) {
    url.searchParams.append('scope', GOOGLE_OAUTH_CONFIG.scopes.join(' '))
    url.searchParams.append('include_granted_scopes', 'false')
  } else {
    url.searchParams.append('scope', 'openid email profile')
  }

  return url.toString()
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const tokenEndpoint = 'https://oauth2.googleapis.com/token';

  try {
    const response = await axios.post<GoogleTokenResponse>(tokenEndpoint, null, {
      params: {
        code,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw new Error('Failed to exchange code for tokens');
  }
}