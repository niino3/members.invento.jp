import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/moneyforward';

export async function GET() {
  // CSRF 対策用の state パラメータ
  const state = Math.random().toString(36).substring(2, 15);

  const authUrl = getAuthorizationUrl(state);
  return NextResponse.redirect(authUrl);
}
