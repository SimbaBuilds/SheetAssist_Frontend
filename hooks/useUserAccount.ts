import { useState } from 'react'
import { useSetupPermissions } from './useSetupPermissions'
import { UserProfile, UserUsage } from '@/types/supabase_tables'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/utils/supabase/client'
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
      
      // Delete user data from user_profile and user_usage tables
      const { error: profileError } = await supabase
        .from('user_profile')
        .delete()
        .eq('id', user.id)

      if (profileError) throw profileError

      const { error: usageError } = await supabase
        .from('user_usage')
        .delete()
        .eq('user_id', user.id)

      if (usageError) throw usageError

      const { error: tokensError } = await supabase
        .from('user_documents_access')
        .delete()
        .eq('user_id', user.id)

      if (tokensError) throw tokensError

      // Delete the user authentication record
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id)
      
      if (authError) throw authError

      // Sign out the user
      await supabase.auth.signOut()
      
      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted.",
      })
      
      router.push('/auth/login')
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete your account. Please try again.",
        className: "destructive",
      })
    } finally {
      setIsDeletingAccount(false)
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
  }
}
