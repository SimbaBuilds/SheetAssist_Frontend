import Stripe from 'stripe';

// Ensure this code only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('This file can only be imported server-side');
}

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is missing in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});   