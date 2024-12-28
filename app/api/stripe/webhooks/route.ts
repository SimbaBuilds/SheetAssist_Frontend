import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { handleStripeWebhook } from '@/lib/stripe/webhooks';

   export async function POST(req: Request) {
     const body = await req.text();
     const signature = headers().get('stripe-signature')!;

     try {
       const event = stripe.webhooks.constructEvent(
         body,
         signature,
         process.env.STRIPE_WEBHOOK_SECRET!
       );

       await handleStripeWebhook(event);
       return NextResponse.json({ received: true });
     } catch (error) {
       console.error('Stripe webhook error:', error);
       return new NextResponse('Webhook Error', { status: 400 });
     }
   }