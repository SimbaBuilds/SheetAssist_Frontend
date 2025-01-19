import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { UserProfile, UserUsage } from '@/lib/supabase/tables'
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

const COST_PER_OVERAGE = 0.08 // 8 cents per overage item

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

  // Calculate overage costs for requests and visualizations beyond limits
  const requestOverages = Math.max(0, requestsUsed - requestLimit)
  const visualizationOverages = Math.max(0, visualizationsUsed - visualizationLimit)
  
  // Total potential cost of next operation
  const nextOperationCost = COST_PER_OVERAGE

  // For pro users, check if next operation would exceed overage limit
  const hasReachedOverageLimit = currentPlan === 'pro' && 
    (overageThisMonth + nextOperationCost > overageHardLimit)

  // For free users, check standard limits
  // For pro users, only show overage message after 200 requests
  const hasReachedRequestLimit = currentPlan === 'free' 
    ? requestsUsed >= requestLimit
    : requestsUsed >= requestLimit && hasReachedOverageLimit

  const hasReachedVisualizationLimit = currentPlan === 'free'
    ? visualizationsUsed >= visualizationLimit
    : visualizationsUsed >= visualizationLimit && hasReachedOverageLimit

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
    overageRemaining: Math.max(0, overageHardLimit - overageThisMonth - nextOperationCost),
    overageHardLimit,
    overageThisMonth
  }
} 