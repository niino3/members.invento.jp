import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email, disabled } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // メールアドレスからユーザーを取得
    const userRecord = await adminAuth.getUserByEmail(email);
    
    // ユーザーアカウントの有効/無効を切り替え
    await adminAuth.updateUser(userRecord.uid, {
      disabled: disabled || false
    });

    return NextResponse.json({
      success: true,
      message: disabled ? 'User account disabled' : 'User account enabled',
      uid: userRecord.uid
    });

  } catch (error) {
    console.error('Error updating user account:', error);
    
    if ((error as any).code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update user account' },
      { status: 500 }
    );
  }
}