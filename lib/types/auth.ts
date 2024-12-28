import type { User } from '@supabase/supabase-js'

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: Error | null
  permissionsStatus: PermissionsStatus | null
}

export interface PermissionsStatus {
  googlePermissionsSet: boolean
  microsoftPermissionsSet: boolean
  permissionsSetupCompleted: boolean
}

export interface SignUpResponse {
  success: boolean
  user?: User
  error?: string
}

export type Provider = 'google' | 'microsoft'

export interface PermissionSetupOptions {
  provider: 'google' | 'microsoft'
  onError?: (error: Error) => void
}

export interface PasswordStrength {
  score: number
  hasNumber: boolean
  hasLowerCase: boolean
  hasMinLength: boolean
}

export interface SignUpFormValues {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

export interface AuthCallbackParams {
  code: string | null
  setup?: 'permissions' | null
  provider?: 'google' | 'microsoft' | null
}


