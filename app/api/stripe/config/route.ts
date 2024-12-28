import { NextResponse } from 'next/server';
import { SUBSCRIPTION_PLANS } from '@/types/stripe';

export async function GET() {
  return NextResponse.json({
    plans: SUBSCRIPTION_PLANS,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  });
}  