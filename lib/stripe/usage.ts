'use server';

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
  console.log(`[Stripe Usage] Starting usage tracking for ${type}:`, {
    userId,
    subscriptionId,
    quantity
  });
  
  try {
    // Get subscription items to find the correct price ID
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items']
    })
    console.log(`[Stripe Usage] Retrieved subscription:`, {
      subscriptionId,
      itemsCount: subscription.items.data.length
    });

    // Find the correct subscription item based on the usage type
    const subscriptionItem = subscription.items.data.find(item => 
      item.price.id === process.env[`STRIPE_${type.toUpperCase()}_OVERAGE_PRICE_ID`]
    )

    if (!subscriptionItem) {
      console.error(`[Stripe Usage] No subscription item found for ${type}`, {
        availablePriceIds: subscription.items.data.map(item => item.price.id)
      });
      throw new Error(`No subscription item found for ${type}`)
    }
    console.log(`[Stripe Usage] Found subscription item:`, {
      itemId: subscriptionItem.id,
      priceId: subscriptionItem.price.id
    });

    // Only report usage beyond the included 200
    const includedQuantity = 200
    const overageQuantity = Math.max(0, quantity - includedQuantity)

    if (overageQuantity > 0) {
      console.log(`[Stripe Usage] Reporting overage:`, {
        type,
        totalQuantity: quantity,
        includedQuantity,
        overageQuantity
      });
      
      // Report usage to Stripe
      const usageRecord = await reportUsage({
        subscriptionItemId: subscriptionItem.id,
        quantity: overageQuantity,
      })
      console.log(`[Stripe Usage] Successfully reported usage:`, {
        usageRecordId: usageRecord.id,
        timestamp: usageRecord.timestamp
      });
    } else {
      console.log(`[Stripe Usage] No overage to report:`, {
        type,
        quantity,
        includedQuantity
      });
    }
  } catch (error) {
    console.error(`[Stripe Usage] Error tracking usage:`, {
      type,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
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