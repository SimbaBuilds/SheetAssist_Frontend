import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { handleStripeWebhook } from '@/lib/stripe/webhooks';

// Route Segment Config
export const runtime = 'nodejs'; // Using Node.js runtime for Stripe webhook handling
export const dynamic = 'force-dynamic'; // Always process webhooks dynamically
export const maxDuration = 59; // Allow longer processing time for webhooks

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = headers().get('stripe-signature');

    // Debug logging
    console.log('Webhook Secret:', process.env.STRIPE_WEBHOOK_SECRET?.slice(0, 5) + '...');
    console.log('Raw Body Length:', rawBody.length);
    console.log('Raw Body Type:', typeof rawBody);
    console.log('First 100 chars of Raw Body:', rawBody.slice(0, 100));

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('Missing signature or webhook secret');
      return new NextResponse('Webhook signature or secret missing', { status: 400 });
    }

    try {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      
      console.log('Event successfully constructed:', event.type);
      await handleStripeWebhook(event);
      return NextResponse.json({ received: true });
    } catch (verifyError) {
      console.error('Verification Error Details:', {
        signatureHeader: signature.slice(0, 50),
        bodyPreview: rawBody.slice(0, 50) + '...'
      });
      throw verifyError;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message.slice(0, 50),
        name: error.name.slice(0, 50),
        stack: error.stack?.slice(0, 50),
      });
    }
    return new NextResponse(
      error instanceof Error ? error.message.slice(0, 50) : 'Webhook handler failed',
      { status: 400 }
    );
  }
}