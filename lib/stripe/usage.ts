'use server';

import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/client';

interface UsageType {
  type: 'processing' | 'visualizations' | 'images'
  quantity: number
}

// Basic usage reporting function
export async function reportUsage({
  stripeCustomerId,
  eventName,
  quantity,
}: {
  stripeCustomerId: string
  eventName: string
  quantity: number
}) {
  return stripe.billing.meterEvents.create({
    event_name: eventName,
    payload: {
      value: quantity.toString(),
      stripe_customer_id: stripeCustomerId,
    },
  });
}

// Advanced usage tracking with overage handling
export async function trackUsage({
  subscriptionId,
  type,
  quantity,
  imagesToLog,
  userId
}: {
  subscriptionId: string
  type: UsageType['type']
  quantity: number
  imagesToLog?: number
  userId: string
}) {
  console.log(`[Stripe Usage] Starting usage tracking for ${type}:`, {
    userId,
    subscriptionId,
    quantity
  });
  
  try {
    // Get subscription to find customer ID
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const stripeCustomerId = subscription.customer as string;
    
    // Map type to event name
    const eventName = {
      'processing': 'standard_processing_04',
      'visualizations': 'vizualization_04',
      'images': 'image_input_04'
    }[type];

    if (!eventName) {
      throw new Error(`Invalid usage type: ${type}`);
    }

    // Only report usage beyond the included 200
    const includedQuantity = 200;
    const overageQuantity = Math.max(0, quantity - includedQuantity);

    if (overageQuantity > 0) {
      console.log(`[Stripe Usage] Reporting overage:`, {
        type,
        eventName,
        totalQuantity: quantity,
        includedQuantity,
        overageQuantity
      });
      
      // Report usage to Stripe using meter events
      const meterEvent = await reportUsage({
        stripeCustomerId,
        eventName,
        quantity: eventName === 'image_input_04' ? imagesToLog || 1 : 1,
      });
      
      console.log(`[Stripe Usage] Successfully reported usage:`, {
        eventName,
        quantity: overageQuantity,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`[Stripe Usage] No overage to report:`, {
        type,
        eventName,
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