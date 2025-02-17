import { useState, useEffect, useCallback } from 'react'
import { useSetupPermissions } from './useSetupPermissions'
import { UserProfile, UserUsage, Organizations } from '@/lib/supabase/tables'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'

interface UseUserAccountProps {
  initialProfile: UserProfile
  initialUsage: UserUsage
  user: User
}

interface UseUserAccountReturn {
  isInitializing: boolean
  isLoading: boolean
  userProfile: UserProfile
  userUsage: UserUsage
  isUpdating: boolean
  updateUserName: (firstName: string, lastName: string, organizationName: string | null) => Promise<void>
  handleGooglePermissions: () => Promise<void>
  handleMicrosoftPermissions: () => Promise<void>
  isDeletingAccount: boolean
  deleteAccount: () => Promise<void>
  updateSheetModificationPreference: (allow: boolean) => Promise<void>
  handleGoogleReconnect: () => Promise<void>
  handleMicrosoftReconnect: () => Promise<void>
  updateOverageLimit: (limit: number | null) => Promise<void>
  organizationSuggestions: Organizations[]
  searchTerm: string
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>
}

export function useUserAccount({ 
  initialProfile, 
  initialUsage, 
  user 
}: UseUserAccountProps): UseUserAccountReturn {
  const [isInitializing, setIsInitializing] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile>(initialProfile)
  const [userUsage, setUserUsage] = useState<UserUsage>(initialUsage)
  const [organizationSuggestions, setOrganizationSuggestions] = useState<Organizations[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)
  const { handleGoogleSetup, handleMicrosoftSetup } = useSetupPermissions()
  const { toast } = useToast()
  const supabase = createClient()
  const router = useRouter()
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  useEffect(() => {
    const initializeUserAccount = async () => {
      try {
        const { data: profile } = await supabase
          .from('user_profile')
          .select('*')
          .eq('id', user.id)
          .single()
        
        const { data: usage } = await supabase
          .from('user_usage')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (profile) setUserProfile(profile)
        if (usage) setUserUsage(usage)
      } catch (error) {
        console.error('Error initializing user account:', error)
      } finally {
        setIsInitializing(false)
      }
    }

    initializeUserAccount()
  }, [user.id])

  const searchOrganizations = useCallback(async (term: string) => {
    if (!term) {
      setOrganizationSuggestions([])
      return
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .ilike('name', `%${term}%`)
      .limit(5)

    if (!error && data) {
      setOrganizationSuggestions(data)
    }
  }, [supabase])

  // Effect to handle debounced search
  useEffect(() => {
    searchOrganizations(debouncedSearch)
  }, [debouncedSearch, searchOrganizations])

  const createOrganization = async (name: string) => {
    const { data, error } = await supabase
      .from('organizations')
      .insert({ name })
      .select()
      .single()

    if (error) throw error
    return data
  }

  const updateUserName = async (firstName: string, lastName: string, organizationName: string | null) => {
    try {
      setIsUpdating(true)
      let organizationId: string | null = null

      if (organizationName) {
        // Check if organization exists
        const { data: existingOrg } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', organizationName)
          .single()

        if (existingOrg) {
          organizationId = existingOrg.id
        } else {
          // Create new organization
          const newOrg = await createOrganization(organizationName)
          organizationId = newOrg.id
        }
      }

      const { error } = await supabase
        .from('user_profile')
        .update({ 
          first_name: firstName, 
          last_name: lastName,
          organization_id: organizationId
        })
        .eq('id', user.id)

      if (error) throw error

      setUserProfile(prev => ({ 
        ...prev, 
        first_name: firstName, 
        last_name: lastName,
        organization_id: organizationId
      }))
      
      toast({
        title: "Success",
        description: "Your profile has been updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update your profile. Please try again.",
        className: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleGooglePermissions = async () => {
    try {
      setIsUpdating(true)
      await handleGoogleSetup()
      toast({
        title: "Success",
        description: "Google permissions have been set up successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set up Google permissions. Please try again.",
        className: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleMicrosoftPermissions = async () => {
    try {
      setIsUpdating(true)
      await handleMicrosoftSetup()
      
      const { error } = await supabase
        .from('user_profile')
        .update({ microsoft_permissions_set: true })
        .eq('id', user.id)

      if (error) throw error

      setUserProfile(prev => ({ ...prev, microsoft_permissions_set: true }))
      
      toast({
        title: "Success",
        description: "Microsoft permissions have been set up successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set up Microsoft permissions. Please try again.",
        className: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteAccount = async () => {
    try {
      setIsDeletingAccount(true)
      
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete account')
      }

      // Sign out the user client-side
      await supabase.auth.signOut()
      
      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted.",
      })
      
      router.push('/auth/login')
    } catch (error) {
      console.error('Account deletion failed:', error)
      
      const errorMessage = error instanceof Error 
        ? error.message
        : "Failed to delete your account. Please try again."
      
      toast({
        title: "Error",
        description: errorMessage,
        className: "destructive",
      })
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const updateSheetModificationPreference = async (allow: boolean) => {
    try {
      console.log('[useUserAccount] Updating sheet modification preference:', {
        currentValue: userProfile.direct_sheet_modification,
        newValue: allow
      })
      
      setIsUpdating(true)
      const { error } = await supabase
        .from('user_profile')
        .update({ 
          direct_sheet_modification: allow,
        })
        .eq('id', user.id)

      if (error) throw error

      console.log('[useUserAccount] Successfully updated sheet modification preference')
      
      setUserProfile(prev => ({ 
        ...prev, 
        direct_sheet_modification: allow,
      }))
      
      toast({
        title: "Success",
        description: `Append to existing sheet ${allow ? 'enabled' : 'disabled'}.`,
      })
    } catch (error) {
      console.error('[useUserAccount] Failed to update sheet modification preference:', error)
      toast({
        title: "Error",
        description: "Failed to update sheet modification preference.",
        className: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleGoogleReconnect = async () => {
    try {
      setIsUpdating(true)
      await handleGoogleSetup()
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reconnect Google account. Please try again.",
        className: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleMicrosoftReconnect = async () => {
    try {
      setIsUpdating(true)
      await handleMicrosoftSetup()
      

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reconnect Microsoft account. Please try again.",
        className: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const updateOverageLimit = async (limit: number | null) => {
    try {
      setIsUpdating(true)
      const { error } = await supabase
        .from('user_usage')
        .update({ 
          overage_hard_limit: limit ?? 0,
        })
        .eq('user_id', user.id)

      if (error) throw error

      setUserUsage(prev => ({ 
        ...prev, 
        overage_hard_limit: limit ?? 0,
      }))
      
      toast({
        title: "Success",
        description: limit === null 
          ? "Overage limit removed successfully."
          : `Overage limit set to $${limit}.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update overage limit.",
        className: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return {
    isInitializing,
    isLoading,
    userProfile,
    userUsage,
    isUpdating,
    updateUserName,
    handleGooglePermissions,
    handleMicrosoftPermissions,
    isDeletingAccount,
    deleteAccount,
    updateSheetModificationPreference,
    handleGoogleReconnect,
    handleMicrosoftReconnect,
    updateOverageLimit,
    organizationSuggestions,
    searchTerm,
    setSearchTerm
  }
}
