import { useState } from 'react'
import { useSetupPermissions } from './useSetupPermissions'
import { UserProfile, UserUsage } from '@/types/supabase_tables'
import { useToast } from '@/components/ui/use-toast'

interface UseUserAccountReturn {
  isLoading: boolean
  userProfile: UserProfile | null
  userUsage: UserUsage | null
  isUpdating: boolean
  updateUserName: (firstName: string, lastName: string) => Promise<void>
  handleGooglePermissions: () => Promise<void>
  handleMicrosoftPermissions: () => Promise<void>
}

export function useUserAccount(): UseUserAccountReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userUsage, setUserUsage] = useState<UserUsage | null>(null)
  const { handleGoogleSetup, handleMicrosoftSetup } = useSetupPermissions()
  const { toast } = useToast()

  const updateUserName = async (firstName: string, lastName: string) => {
    try {
      setIsUpdating(true)
      // TODO: Implement Supabase update call here
      setUserProfile(prev => prev ? { ...prev, first_name: firstName, last_name: lastName } : null)
      toast({
        title: "Success",
        description: "Your name has been updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update your name. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleGooglePermissions = async () => {
    try {
      await handleGoogleSetup()
      setUserProfile(prev => prev ? { ...prev, google_permissions_set: true } : null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set up Google permissions. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleMicrosoftPermissions = async () => {
    try {
      await handleMicrosoftSetup()
      setUserProfile(prev => prev ? { ...prev, microsoft_permissions_set: true } : null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set up Microsoft permissions. Please try again.",
        variant: "destructive",
      })
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
  }
}
