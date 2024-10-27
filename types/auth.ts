export interface User {
  id: string
  email: string
  // Add any other user properties you need
}

export interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
  getToken: () => Promise<string | null>
  initiateGoogleLogin: () => Promise<string | null>
  clearGoogleCache: () => void
}
