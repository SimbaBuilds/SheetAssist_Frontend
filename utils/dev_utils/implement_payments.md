## Implement Stripe Payments (Next.js App Router)

### 0. Prerequisites -- COMPLETED
1. Stripe account setup
   - Create Stripe account
   - Enable test mode
   - Configure products and pricing in Stripe Dashboard
   - Set up webhook endpoints

### 1. Initial Setup 
1. Install dependencies   ```bash
   npm install stripe @stripe/stripe-js
   npm install --save-dev @types/stripe   ```


2. Environment Configuration   ```env
   # .env.local
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_PRO=price_...   ```

3. Create Stripe Instance   ```typescript:lib/stripe.ts
   import Stripe from 'stripe';

   export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
     apiVersion: '2024-12-18.acacia',
     typescript: true,
   });   ```

### 2. Database Schema -- COMPLETE
1. Update user_profiles table   ```sql
   alter table user_profile add column
     stripe_customer_id text,
     subscription_id text,
     subscription_status subscription_status_type default 'inactive',
     current_period_end timestamptz,
     price_id text,


### 3. Types and Constants -- COMPLETE
1. Create types file   ```typescript:types/stripe.ts
   export interface SubscriptionPlan {
     id: string;
     name: string;
     description: string;
     priceId: string;
     price: number;
     limits: {
       processing: number;
       visualizations: number;
       images: number;
     };
   }

   export const SUBSCRIPTION_PLANS = {
     FREE: {
       id: 'free',
       name: 'Free',
       description: 'For personal use',
       priceId: null,
       price: 0,
       limits: {
         processing: 10,
         visualizations: 10,
         images: 10,
       },
     },
     PRO: {
       id: 'pro',
       name: 'Pro',
       description: 'For power users',
       priceId: process.env.STRIPE_PRICE_ID_PRO,
       price: 10,
       limits: {
         processing: 200,
         visualizations: 200,
         images: 200,
       },
     },
   } as const;   ```

### 4. API Routes -- COMPLETE
1. Create config route   ```typescript:app/api/stripe/config/route.ts
   import { NextResponse } from 'next/server';
   import { SUBSCRIPTION_PLANS } from '@/types/stripe';

   export async function GET() {
     return NextResponse.json({
       plans: SUBSCRIPTION_PLANS,
       publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
     });
   }   ```

2. Create checkout route   ```typescript:app/api/stripe/create-checkout/route.ts
   import { createCheckoutSession } from '@/lib/stripe/checkout';
   import { auth } from '@clerk/nextjs';
   import { NextResponse } from 'next/server';

   export async function POST(req: Request) {
     try {
       const { userId } = auth();
       const { priceId } = await req.json();

       if (!userId) {
         return new NextResponse('Unauthorized', { status: 401 });
       }

       const session = await createCheckoutSession({
         userId,
         priceId,
         returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
       });

       return NextResponse.json({ sessionId: session.id });
     } catch (error) {
       console.error('Stripe checkout error:', error);
       return new NextResponse('Internal Error', { status: 500 });
     }
   }   ```

3. Create portal route   ```typescript:app/api/stripe/create-portal/route.ts
   import { createPortalSession } from '@/lib/stripe/portal';
   import { auth } from '@clerk/nextjs';
   import { NextResponse } from 'next/server';

   export async function POST(req: Request) {
     try {
       const { userId } = auth();
       if (!userId) {
         return new NextResponse('Unauthorized', { status: 401 });
       }

       const session = await createPortalSession({
         userId,
         returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
       });

       return NextResponse.json({ url: session.url });
     } catch (error) {
       console.error('Stripe portal error:', error);
       return new NextResponse('Internal Error', { status: 500 });
     }
   }   ```

4. Create webhook route   ```typescript:app/api/stripe/webhooks/route.ts
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
   }   ```

### 5. UI Components -- COMPLETE
1. Create pricing table component   ```typescript:components/billing/PricingTable.tsx
   'use client';

   import { Button } from '@/components/ui/button';
   import { SUBSCRIPTION_PLANS } from '@/types/stripe';
   import { useSubscription } from '@/hooks/useSubscription';

   export function PricingTable() {
     const { currentPlan, isLoading, checkout } = useSubscription();

     // Implementation details...
   }   ```

2. Create subscription management button   ```typescript:components/billing/ManageSubscriptionButton.tsx
   'use client';

   import { Button } from '@/components/ui/button';
   import { useSubscription } from '@/hooks/useSubscription';

   export function ManageSubscriptionButton() {
     const { openPortal, isLoading } = useSubscription();

     // Implementation details...
   }   ```

### 6. Usage Tracking
1. Create usage tracking utility   ```typescript:lib/stripe/usage.ts
   import { stripe } from '@/lib/stripe';

   export async function reportUsage({
     subscriptionItemId,
     quantity,
     timestamp = Math.floor(Date.now() / 1000),
   }: {
     subscriptionItemId: string;
     quantity: number;
     timestamp?: number;
   }) {
     return stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
       quantity,
       timestamp,
       action: 'increment',
     });
   }   ```

interface UsageType {
  type: 'processing' | 'visualizations' | 'images';
  quantity: number;
}

export async function trackUsage({
  subscriptionId,
  type,
  quantity,
}: {
  subscriptionId: string;
  type: UsageType['type'];
  quantity: number;
}) {
  // Get subscription items to find the correct price ID
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items']
  });

  // Find the correct subscription item based on the usage type
  const subscriptionItem = subscription.items.data.find(item => 
    item.price.id === process.env[`${type.toUpperCase()}_OVERAGE_PRICE_ID`]
  );

  if (!subscriptionItem) {
    throw new Error(`No subscription item found for ${type}`);
  }

  // Only report usage beyond the included 200
  const includedQuantity = 200;
  const overageQuantity = Math.max(0, quantity - includedQuantity);

  if (overageQuantity > 0) {
    await stripe.subscriptionItems.createUsageRecord(
      subscriptionItem.id,
      {
        quantity: overageQuantity,
        timestamp: Math.floor(Date.now() / 1000),
        action: 'increment',
      }
    );
  }
}

### 7. Testing
1. Local webhook testing   ```bash
   # Install Stripe CLI
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhooks   ```

2. Test mode indicator   ```typescript:components/billing/TestModeIndicator.tsx
   export function TestModeIndicator() {
     if (process.env.NODE_ENV === 'production') return null;
     
     return (
       <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-md text-sm">
         Stripe Test Mode Active
       </div>
     );
   }   ```

### Pricing Overview
Free Tier:
- 10 data processing requests/month
- 10 visualizations/month
- 10 input images/month

Pro Tier ($10/month):
- 200 data processing requests/month
- 200 visualizations/month
- 200 input images/month

Overage Charges (Pro Plan):
- $0.08 per additional request/visualization/image
- Configurable hard limit in Account Settings

