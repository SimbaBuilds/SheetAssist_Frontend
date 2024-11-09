const MICROSOFT_OAUTH_CONFIG = {
  client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!,
  redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/microsoft/callback`,
  scopes: [
    'offline_access',
    'Files.ReadWrite.All',
    'Sites.ReadWrite.All'
  ]
} as const

export function getMicrosoftOAuthURL(): string {
  const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
  
  // Generate state for security
  const state = crypto.randomUUID()
  
  url.searchParams.append('client_id', MICROSOFT_OAUTH_CONFIG.client_id)
  url.searchParams.append('redirect_uri', MICROSOFT_OAUTH_CONFIG.redirect_uri)
  url.searchParams.append('response_type', 'code')
  url.searchParams.append('scope', MICROSOFT_OAUTH_CONFIG.scopes.join(' '))
  url.searchParams.append('state', state)
  url.searchParams.append('prompt', 'consent')

  // Store state in session for validation
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('microsoftOAuthState', state)
  }

  return url.toString()
}
