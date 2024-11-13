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
      
      // Check existence in all tables
      const checks = await Promise.all([
        // Check user_profile
        supabase
          .from('user_profile')
          .select('id')
          .eq('id', user.id)
          .single(),
        
        // Check user_usage
        supabase
          .from('user_usage')
          .select('id')
          .eq('id', user.id)
          .single(),
          
        // Check error_messages
        supabase
          .from('error_messages')
          .select('id')
          .eq('user_id', user.id),
          
        // Check query_history
        supabase
          .from('query_history')
          .select('id')
          .eq('user_id', user.id),

        // Check user_documents_access
        supabase
          .from('user_documents_access')
          .select('user_id')
          .eq('user_id', user.id)
      ])

      // Delete data where it exists
      const deletions = await Promise.all([
        // Delete user_profile if exists
        (checks[0]?.data ?? null) && supabase
          .from('user_profile')
          .delete()
          .eq('id', user.id),
          
        // Delete user_usage if exists
        (checks[1]?.data ?? null) && supabase
          .from('user_usage')
          .delete()
          .eq('id', user.id),
          
        // Delete error_messages if exists
        (checks[2]?.data?.length ?? 0) > 0 && supabase
          .from('error_messages')
          .delete()
          .eq('user_id', user.id),
          
        // Delete query_history if exists
        (checks[3]?.data?.length ?? 0) > 0 && supabase
          .from('query_history')
          .delete()
          .eq('user_id', user.id),

        // Delete user_documents_access if exists
        (checks[4]?.data?.length ?? 0) > 0 && supabase
          .from('user_documents_access')
          .delete()
          .eq('user_id', user.id)
      ])

      // Check for errors in deletions
      deletions.forEach((result, index) => {
        if (result && result.error) {
          throw new Error(`Failed to delete from table ${index}: ${result.error.message}`)
        }
      })

      // Finally delete the user authentication record
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
