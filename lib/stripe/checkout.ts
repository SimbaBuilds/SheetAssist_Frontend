'use server';

import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

interface CreateCheckoutSessionParams {
  userId: string;
  priceId: string;
  returnUrl: string;
}

export async function createCheckoutSession({
  userId,
  priceId,
  returnUrl,
}: CreateCheckoutSessionParams) {
  const supabase = await createClient();

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profile')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  // Get or create stripe customer
  let customerId = profile?.stripe_customer_id;
  
  if (!customerId) {
    // Get user email from auth
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.email) {
      throw new Error('User email not found');
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: userId,
      },
    });
    customerId = customer.id;

    // Save customer ID
    await supabase
      .from('user_profile')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: returnUrl,
    subscription_data: {
      metadata: {
        userId,
      },
    },
    payment_method_types: ['card'],
  });

  return session;
}
