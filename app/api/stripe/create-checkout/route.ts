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
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        const { priceId } = body;

        if (!userId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const session = await createCheckoutSession({
            userId,
            priceId,
            returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
        });

        return NextResponse.json({ sessionId: session.id });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        
        // Return more specific error messages when possible
        if (error instanceof Error) {
            return new NextResponse(error.message, { status: 400 });
        }
        return new NextResponse('Internal Error', { status: 500 });
    }
}