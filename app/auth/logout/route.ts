import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.detail }, { status: response.status });
    }

    return NextResponse.json({ message: 'Logout successful' });
  } catch (error) {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
