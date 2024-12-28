import { base64url } from 'rfc4648'


export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64url.stringify(array).replace(/=/g, '')
}

export async function generatePKCEChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64url.stringify(new Uint8Array(hash)).replace(/=/g, '')
}
