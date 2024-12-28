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
  } as const;   