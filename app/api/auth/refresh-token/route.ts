import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { provider, refresh_token, user_id } = await request.json();

    if (!provider || !refresh_token || !user_id) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (provider !== 'microsoft') {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Prepare the token refresh request
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refresh_token,
      grant_type: 'refresh_token',
      scope: 'email Files.Read Files.ReadWrite.Selected offline_access User.Read'
    });

    // Make the token refresh request
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Token refresh failed:', data);
      return NextResponse.json(
        { 
          error: data.error,
          message: data.error_description 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    });

  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 