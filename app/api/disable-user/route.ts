import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Firebase Admin SDKの初期化（ビルド時にはスキップ）
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  // 環境変数がすべて設定されている場合のみ初期化
  if (privateKey && clientEmail && projectId) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey,
        }),
      });
    } catch (error) {
      // ビルド時にはエラーを無視
      if (process.env.NEXT_PHASE !== 'phase-production-build' && 
          process.env.NEXT_PHASE !== 'phase-development-build') {
        console.error('Firebase Admin SDK初期化エラー:', error);
      }
    }
  }
}

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
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // ユーザーアカウントの有効/無効を切り替え
    await admin.auth().updateUser(userRecord.uid, {
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