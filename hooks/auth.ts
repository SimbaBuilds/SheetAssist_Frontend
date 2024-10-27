import { useState, useEffect } from 'react'
import { User, AuthContextType } from '@/types/auth'

export function useAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  async function checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to check auth status:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  async function login(email: string, password: string) {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        throw new Error('Login failed')
      }
      await checkAuthStatus()
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  async function logout() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) {
        throw new Error('Logout failed')
      }
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  async function getToken(): Promise<string | null> {
    try {
      const response = await fetch('/api/auth/token')
      if (response.ok) {
        const data = await response.json()
        return data.token
      }
      return null
    } catch (error) {
      console.error('Failed to get token:', error)
      return null
    }
  }


  const clearGoogleCache = () => {
    // Clear Google's OAuth cache
    window.location.href = 'https://accounts.google.com/logout';
  }

  async function initiateGoogleLogin(): Promise<string | null> {
    try {
      const response = await fetch('/api/auth/signin/google');
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
        return data.url; // Return the URL
      }
      throw new Error('No auth URL received');
    } catch (error) {
      console.error('Error initiating Google login:', error);
      return null; // Return null on error
    }
  }

  return {
    user,
    login,
    logout,
    isLoading,
    getToken,
    initiateGoogleLogin,
    clearGoogleCache
  }
}
