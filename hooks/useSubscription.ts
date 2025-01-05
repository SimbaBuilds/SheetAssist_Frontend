import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { useToast } from '@/components/ui/use-toast'
import { SUBSCRIPTION_PLANS } from '@/lib/types/stripe'

export function useSubscription() {
  const [isLoading, setIsLoading] = useState(false)
  const [isPortalLoading, setIsPortalLoading] = useState(false)
  const { toast } = useToast()

  const checkout = async (priceId: string) => {
    try {
      setIsLoading(true)
      
      // Validate priceId before making request
      if (!priceId || typeof priceId !== 'string') {
        throw new Error('Invalid price ID')
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          priceId: priceId.trim() // Ensure no whitespace
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to initiate checkout')
      }

      const { sessionId } = await response.json()
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      
      if (!stripe) {
        throw new Error('Failed to load Stripe')
      }

      const { error } = await stripe.redirectToCheckout({ sessionId })
      if (error) throw error
      
    } catch (error) {
      console.error('Checkout error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to initiate checkout',
        className: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openPortal = async () => {
    try {
      setIsPortalLoading(true)
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
      })

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to open billing portal');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to open billing portal',
        className: 'destructive',
      });
    } finally {
      setIsPortalLoading(false);
    }
  }

  return {
    isLoading,
    isPortalLoading,
    checkout,
    openPortal,
  }
} 