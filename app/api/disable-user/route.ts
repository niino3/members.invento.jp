import { NextRequest, NextResponse } from 'next/server';

// Firebase Admin SDKの初期化関数（実行時のみ呼び出される）
async function getAdminAuth() {
  // 動的インポートでビルド時のエラーを回避
  const admin = await import('firebase-admin');
  
  if (!admin.default.apps.length) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    // 環境変数がすべて設定されている場合のみ初期化
    if (privateKey && clientEmail && projectId) {
      admin.default.initializeApp({
        credential: admin.default.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey,
        }),
      });
    } else {
      throw new Error('Firebase Admin SDK環境変数が設定されていません');
    }
  }
  
  return admin.default.auth();
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

    // Firebase Admin SDKを取得（実行時のみ）
    const auth = await getAdminAuth();
    
    // メールアドレスからユーザーを取得
    const userRecord = await auth.getUserByEmail(email);
    
    // ユーザーアカウントの有効/無効を切り替え
    await auth.updateUser(userRecord.uid, {
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