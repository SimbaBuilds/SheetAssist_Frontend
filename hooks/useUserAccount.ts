import { useState } from 'react'
import { useSetupPermissions } from './useSetupPermissions'
import { UserProfile, UserUsage } from '@/lib/supabase/tables'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface UseUserAccountProps {
  initialProfile: UserProfile
  initialUsage: UserUsage
  user: User
}

interface UseUserAccountReturn {
  isLoading: boolean
  userProfile: UserProfile
  userUsage: UserUsage
  isUpdating: boolean
  updateUserName: (firstName: string, lastName: string) => Promise<void>
  handleGooglePermissions: () => Promise<void>
  handleMicrosoftPermissions: () => Promise<void>
  isDeletingAccount: boolean
  deleteAccount: () => Promise<void>
  updateSheetModificationPreference: (allow: boolean) => Promise<void>
  handleGoogleReconnect: () => Promise<void>
  handleMicrosoftReconnect: () => Promise<void>
  updateOverageLimit: (limit: number | null) => Promise<void>
}

export function useUserAccount({ 
  initialProfile, 
  initialUsage, 
  user 
}: UseUserAccountProps): UseUserAccountReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile>(initialProfile)
  const [userUsage, setUserUsage] = useState<UserUsage>(initialUsage)
  const { handleGoogleSetup, handleMicrosoftSetup } = useSetupPermissions()
  const { toast } = useToast()
  const supabase = createClient()
  const router = useRouter()
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  const updateUserName = async (firstName: string, lastName: string) => {
    try {
      setIsUpdating(true)
      const { error } = await supabase
        .from('user_profile')
        .update({ 
          first_name: firstName, 
          last_name: lastName 
        })
        .eq('id', user.id)

      if (error) throw error

      setUserProfile(prev => ({ ...prev, first_name: firstName, last_name: lastName }))
      
      toast({
        title: "Success",
        description: "Your name has been updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update your name. Please try again.",
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
      
      const { error } = await supabase
        .from('user_profile')
        .update({ google_permissions_set: true })
        .eq('id', user.id)

      if (error) throw error

      setUserProfile(prev => ({ ...prev, google_permissions_set: true }))
      
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
      
      toast({
        title: "Success",
        description: "Google account reconnected successfully.",
      })
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
      
      toast({
        title: "Success",
        description: "Microsoft account reconnected successfully.",
      })
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
  }
}
