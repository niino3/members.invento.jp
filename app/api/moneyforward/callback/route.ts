import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/moneyforward';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json(
      { error: `OAuth error: ${error}`, description: searchParams.get('error_description') },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: 'Authorization code not found' },
      { status: 400 }
    );
  }

  try {
    const token = await exchangeCodeForToken(code);

    // 認証成功 → 請求管理ページにリダイレクト
    const baseUrl = process.env.MF_REDIRECT_URI!.replace('/api/moneyforward/callback', '');
    return NextResponse.redirect(`${baseUrl}/admin/billing?auth=success`);
  } catch (err) {
    console.error('Token exchange error:', err);
    return NextResponse.json(
      { error: 'Failed to exchange token', details: String(err) },
      { status: 500 }
    );
  }
}
