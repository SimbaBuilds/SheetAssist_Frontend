import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

export type SubscriptionStatus = 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid' | 'inactive';

interface UserProfileUpdate {
  subscription_id?: string | null;
  subscription_status?: SubscriptionStatus;
  current_period_end?: Date | null;
  price_id?: string | null;
  stripe_customer_id?: string;
}

export async function handleStripeWebhook(event: Stripe.Event) {
  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;
        
        const update: UserProfileUpdate = {
          subscription_id: subscription.id,
          subscription_status: subscription.status as SubscriptionStatus,
          current_period_end: new Date(subscription.current_period_end * 1000),
          price_id: subscription.items.data[0]?.price.id
        };
        
        const { error } = await supabase
          .from('user_profile')
          .update(update)
          .eq('stripe_customer_id', stripeCustomerId);

        if (error) {
          console.error('Error updating subscription:', error);
          throw error;
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        // Reset the user's subscription status
        const { error } = await supabase
          .from('user_profile')
          .update({
            subscription_status: 'inactive',
            subscription_id: null,
            current_period_end: null,
            price_id: null
          })
          .eq('stripe_customer_id', stripeCustomerId);

        if (error) throw error;
        break;
      }

      case 'customer.created': {
        const customer = event.data.object as Stripe.Customer;
        
        // If metadata contains userId, link the Stripe customer to our user
        if (customer.metadata?.userId) {
          const { error } = await supabase
            .from('user_profile')
            .update({
              stripe_customer_id: customer.id
            })
            .eq('id', customer.metadata.userId);

          if (error) throw error;
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = invoice.subscription as string;
        
        if (subscription) {
          // Fetch full subscription details
          const subscriptionDetails = await stripe.subscriptions.retrieve(subscription);
          const stripeCustomerId = subscriptionDetails.customer as string;
          
          // Update subscription status and period end
          const { error } = await supabase
            .from('user_profile')
            .update({
              subscription_status: subscriptionDetails.status,
              current_period_end: new Date(subscriptionDetails.current_period_end * 1000)
            })
            .eq('stripe_customer_id', stripeCustomerId);

          if (error) throw error;
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = invoice.customer as string;
        
        // Update subscription status to past_due
        const { error } = await supabase
          .from('user_profile')
          .update({
            subscription_status: 'past_due'
          })
          .eq('stripe_customer_id', stripeCustomerId);

        if (error) throw error;
        break;
      }
    }
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    throw error;
  }
}
