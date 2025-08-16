import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

// 安全な初期パスワードを生成
function generateSecurePassword(length = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  // 各種文字種から最低1文字ずつ
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // 残りの文字をランダムに
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // パスワードをシャッフル
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export async function POST(request: NextRequest) {
  try {
    const { email, customerId, role = 'user' } = await request.json();

    if (!email || !customerId) {
      return NextResponse.json(
        { error: 'メールアドレスと顧客IDが必要です' },
        { status: 400 }
      );
    }

    // 安全な初期パスワードを生成
    const initialPassword = generateSecurePassword(12);

    // Firebase Authenticationにユーザーを作成
    const userRecord = await adminAuth.createUser({
      email,
      password: initialPassword,
      emailVerified: false,
    });

    // Firestoreにユーザードキュメントを作成
    await adminDb.collection('users').doc(userRecord.uid).set({
      email,
      role,
      customerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });


    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      initialPassword,
      message: 'ユーザーアカウントが作成されました。初期パスワードを顧客に伝えてください。'
    });

  } catch (error) {
    console.error('User creation error:', error);
    
    if ((error as any).code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'このメールアドレスは既に使用されています' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'ユーザー作成に失敗しました' },
      { status: 500 }
    );
  }
}