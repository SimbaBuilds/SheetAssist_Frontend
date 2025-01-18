import { createPortalSession } from '@/lib/stripe/portal';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Route Segment Config
export const runtime = 'nodejs'; // Using Node.js runtime for Stripe operations
export const dynamic = 'force-dynamic'; // Always process portal requests dynamically

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = await createPortalSession({
      userId,
      returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    
    return NextResponse.json({ 
      message: error instanceof Error ? error.message : 'Internal Error'
    }, { 
      status: error instanceof Error ? 400 : 500 
    });
  }
}