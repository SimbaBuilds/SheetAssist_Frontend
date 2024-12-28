import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { useToast } from '@/components/ui/use-toast'
import { SUBSCRIPTION_PLANS } from '@/types/stripe'

export function useSubscription() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const checkout = async (priceId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })

      const { sessionId } = await response.json()
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      await stripe?.redirectToCheckout({ sessionId })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initiate checkout. Please try again.',
        className: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openPortal = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
      })
      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to open billing portal. Please try again.',
        className: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    checkout,
    openPortal,
  }
} 