import { NextResponse } from 'next/server';
import { getPartners } from '@/lib/moneyforward';

export async function GET() {
  try {
    const data = await getPartners();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Failed to get partners:', err);
    return NextResponse.json(
      { error: 'Failed to get partners', details: String(err) },
      { status: 500 }
    );
  }
}
