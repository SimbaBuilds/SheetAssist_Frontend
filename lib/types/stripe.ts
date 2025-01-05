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
      name: 'Free',
      priceId: null,
    },
    PRO: {
      name: 'Pro',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? 'price_1QaoofP3MuCplnDXz2qwqGuQ',
    },
  } as const;   