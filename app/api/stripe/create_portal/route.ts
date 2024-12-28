import { createPortalSession } from '@/lib/stripe/portal';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const session = await createPortalSession({
      userId,
      returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    
    // Return more specific error messages when possible
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 });
    }
    return new NextResponse('Internal Error', { status: 500 });
  }
}