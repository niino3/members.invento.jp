import { NextResponse } from 'next/server';
import { getMFToken, refreshAccessToken } from '@/lib/moneyforward';

export async function POST() {
  try {
    const token = await getMFToken();
    if (!token) {
      return NextResponse.json(
        { error: 'No token found. Please authenticate first.' },
        { status: 401 }
      );
    }

    const refreshed = await refreshAccessToken(token.refreshToken);

    return NextResponse.json({
      message: 'Token refreshed successfully',
      expiresAt: new Date(refreshed.expiresAt).toISOString(),
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    return NextResponse.json(
      { error: 'Failed to refresh token', details: String(err) },
      { status: 500 }
    );
  }
}
