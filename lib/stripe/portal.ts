import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

interface CreatePortalSessionParams {
  userId: string;
  returnUrl: string;
}

export async function createPortalSession({
  userId,
  returnUrl,
}: CreatePortalSessionParams) {
  const supabase = await createClient();

  // Get user's stripe customer id
  const { data: profile } = await supabase
    .from('user_profile')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!profile?.stripe_customer_id) {
    throw new Error('No Stripe customer found');
  }

  // Create Stripe portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: returnUrl,
  });

  return session;
}
