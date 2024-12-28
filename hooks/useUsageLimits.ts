import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { UserProfile, UserUsage } from '@/lib/supabase/supabase_tables'
import { PLAN_REQUEST_LIMITS, VIS_GEN_LIMITS } from '@/lib/constants/pricing'

interface UsageLimits {
  isLoading: boolean
  hasReachedRequestLimit: boolean
  hasReachedVisualizationLimit: boolean
  currentPlan: UserProfile['plan']
  requestsRemaining: number
  visualizationsRemaining: number
  requestsUsed: number
  visualizationsUsed: number
  requestLimit: number
  visualizationLimit: number
  hasReachedOverageLimit: boolean
  overageRemaining: number
  overageHardLimit: number
  overageThisMonth: number
}

const OVERAGE_BUFFER = 0.08 // 8 cents buffer

export function useUsageLimits(): UsageLimits {
  const { user } = useAuth()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [usage, setUsage] = useState<UserUsage | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    async function fetchUsageData() {
      if (!user?.id) return

      setIsLoading(true)
      try {
        const [usageResult, profileResult] = await Promise.all([
          supabase
            .from('user_usage')
            .select('*')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('user_profile')
            .select('*')
            .eq('id', user.id)
            .single()
        ])

        if (usageResult.data) setUsage(usageResult.data)
        if (profileResult.data) setProfile(profileResult.data)
      } catch (error) {
        console.error('Error fetching usage data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsageData()
  }, [user?.id])

  const currentPlan = profile?.plan || 'free'
  const requestLimit = PLAN_REQUEST_LIMITS[currentPlan]
  const visualizationLimit = VIS_GEN_LIMITS[currentPlan]
  
  const requestsUsed = usage?.requests_this_month || 0
  const visualizationsUsed = usage?.visualizations_this_month || 0
  const overageHardLimit = usage?.overage_hard_limit || 0
  const overageThisMonth = usage?.overage_this_month || 0

  // For pro users, check both standard limits and overage limits
  const hasReachedOverageLimit = currentPlan === 'pro' && 
    (overageThisMonth + OVERAGE_BUFFER >= overageHardLimit)

  // For free users, only check standard limits
  // For pro users, check both standard limits and overage
  const hasReachedRequestLimit = currentPlan === 'free' 
    ? requestsUsed >= requestLimit
    : requestsUsed >= requestLimit || hasReachedOverageLimit

  const hasReachedVisualizationLimit = currentPlan === 'free'
    ? visualizationsUsed >= visualizationLimit
    : visualizationsUsed >= visualizationLimit || hasReachedOverageLimit

  return {
    isLoading,
    hasReachedRequestLimit,
    hasReachedVisualizationLimit,
    hasReachedOverageLimit,
    currentPlan,
    requestsRemaining: Math.max(0, requestLimit - requestsUsed),
    visualizationsRemaining: Math.max(0, visualizationLimit - visualizationsUsed),
    requestsUsed,
    visualizationsUsed,
    requestLimit,
    visualizationLimit,
    overageRemaining: Math.max(0, overageHardLimit - overageThisMonth - OVERAGE_BUFFER),
    overageHardLimit,
    overageThisMonth
  }
} 