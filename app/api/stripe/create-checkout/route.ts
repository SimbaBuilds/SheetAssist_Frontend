import { createCheckoutSession } from '@/lib/stripe/checkout';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        // Validate request body
        const body = await req.json();
        if (!body.priceId || typeof body.priceId !== 'string') {
            return new NextResponse('Invalid price ID', { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user?.id) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Check if user already has an active subscription
        const { data: profile } = await supabase
            .from('user_profile')
            .select('subscription_status, price_id')
            .eq('id', user.id)
            .single();

        // Prevent duplicate subscriptions
        if (profile?.subscription_status === 'active' && profile?.price_id === body.priceId) {
            return new NextResponse('Already subscribed to this plan', { status: 400 });
        }

        const session = await createCheckoutSession({
            userId: user.id,
            priceId: body.priceId,
            returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
        });

        return NextResponse.json({ sessionId: session.id });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return new NextResponse(
            error instanceof Error ? error.message : 'Internal Error', 
            { status: error instanceof Error ? 400 : 500 }
        );
    }
}