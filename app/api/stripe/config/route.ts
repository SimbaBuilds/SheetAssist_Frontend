import { NextResponse } from 'next/server';
import { SUBSCRIPTION_PLANS } from '@/lib/types/stripe';

// Route Segment Config
export const runtime = 'nodejs'; // Using Node.js runtime for Stripe operations
export const dynamic = 'force-dynamic'; // Ensure fresh data on each request

export async function GET() {
  return NextResponse.json({
    plans: SUBSCRIPTION_PLANS,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  });
}  