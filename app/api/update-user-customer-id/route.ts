import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, customerId } = await req.json();

    if (!email || !customerId) {
      return NextResponse.json({ error: 'Email and customerId are required' }, { status: 400 });
    }

    // Firebase Admin SDKを動的インポート（ビルド時のエラーを回避）
    const admin = await import('firebase-admin');
    
    // 初期化（まだ初期化されていない場合）
    if (!admin.default.apps.length) {
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      
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

    const db = admin.default.firestore();

    // Find user document by email
    const usersQuery = await db.collection('users')
      .where('email', '==', email)
      .get();

    if (usersQuery.empty) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update the user's customerId
    const userDoc = usersQuery.docs[0];
    await userDoc.ref.update({
      customerId: customerId,
      updatedAt: new Date()
    });

    console.log('Successfully updated user customerId:', {
      email,
      customerId,
      userDocId: userDoc.id
    });

    return NextResponse.json({ 
      success: true, 
      message: 'User customerId updated successfully',
      userDocId: userDoc.id
    });

  } catch (error) {
    console.error('Error updating user customerId:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}