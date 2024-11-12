import { useState } from 'react'
import { useSetupPermissions } from './useSetupPermissions'
import { UserProfile, UserUsage } from '@/types/supabase_tables'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'

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
