import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/client';

interface UsageType {
  type: 'processing' | 'visualizations' | 'images'
  quantity: number
}

// Basic usage reporting function
export async function reportUsage({
  subscriptionItemId,
  quantity,
  timestamp = Math.floor(Date.now() / 1000),
}: {
  subscriptionItemId: string
  quantity: number
  timestamp?: number
}) {
  return stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity,
    timestamp,
    action: 'increment',
  })
}

// Advanced usage tracking with overage handling
export async function trackUsage({
  subscriptionId,
  type,
  quantity,
  userId
}: {
  subscriptionId: string
  type: UsageType['type']
  quantity: number
  userId: string
}) {
  const supabase = createClient()
  
  // Get subscription items to find the correct price ID
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items']
  })

  // Find the correct subscription item based on the usage type
  const subscriptionItem = subscription.items.data.find(item => 
    item.price.id === process.env[`NEXT_PUBLIC_STRIPE_${type.toUpperCase()}_OVERAGE_PRICE_ID`]
  )

  if (!subscriptionItem) {
    throw new Error(`No subscription item found for ${type}`)
  }

  // Only report usage beyond the included 200
  const includedQuantity = 200
  const overageQuantity = Math.max(0, quantity - includedQuantity)

  if (overageQuantity > 0) {
    // Report usage to Stripe
    await reportUsage({
      subscriptionItemId: subscriptionItem.id,
      quantity: overageQuantity,
    })

    // Calculate overage amount based on price per unit
    const pricePerUnit = subscriptionItem.price.unit_amount! / 100 // Convert cents to dollars
    const overageAmount = overageQuantity * pricePerUnit

    // Update user_usage table with new overage amount
    const { error } = await supabase
      .from('user_usage')
      .update({
        overage_this_month: overageAmount
      })
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating overage amount:', error)
      throw error
    }
  }
}

// Helper function to check if user is approaching usage limits
export async function checkUsageLimits({
  currentUsage
}: {
  currentUsage: number
}): Promise<{
  isApproachingLimit: boolean
  isOverLimit: boolean
  percentageUsed: number
}> {
  const includedQuantity = 200 // Pro plan limit
  const warningThreshold = 0.9 // 90% of limit

  const percentageUsed = (currentUsage / includedQuantity) * 100
  
  return {
    isApproachingLimit: percentageUsed >= warningThreshold * 100,
    isOverLimit: currentUsage > includedQuantity,
    percentageUsed,
  }
}

// Add this helper function
export async function isUserOnProPlan(userId: string): Promise<boolean> {
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('user_profile')
    .select('plan')
    .eq('id', userId)
    .single()
  
  return profile?.plan === 'pro'
}

// Add this helper to get subscription ID
export async function getUserSubscriptionId(userId: string): Promise<string | null> {
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('user_profile')
    .select('subscription_id')
    .eq('id', userId)
    .single()
  
  return profile?.subscription_id || null
}   