import { NextRequest, NextResponse } from 'next/server';

/**
 * GET: mfBilling 設定済み顧客一覧を取得
 */
export async function GET() {
  try {
    const admin = await import('firebase-admin');
    if (!admin.default.apps.length) {
      admin.default.initializeApp({
        credential: admin.default.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        }),
      });
    }

    const db = admin.default.firestore();
    const snapshot = await db.collection('customers').get();

    const customers: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.mfBilling) {
        customers.push({
          id: doc.id,
          companyName: data.companyName,
          companyNameKana: data.companyNameKana || '',
          contractStatus: data.contractStatus || 'active',
          paymentMethod: data.paymentMethod || '',
          mfBilling: data.mfBilling,
        });
      }
    });

    // カナ順ソート
    customers.sort((a, b) => (a.companyNameKana || a.companyName).localeCompare(b.companyNameKana || b.companyName, 'ja'));

    return NextResponse.json({ customers });
  } catch (err) {
    console.error('Failed to get billing customers:', err);
    return NextResponse.json({ error: 'Failed to fetch', details: String(err) }, { status: 500 });
  }
}

/**
 * PUT: 顧客の mfBilling を更新
 */
export async function PUT(request: NextRequest) {
  try {
    const { customerId, mfBilling } = await request.json();

    if (!customerId || !mfBilling) {
      return NextResponse.json({ error: 'customerId and mfBilling required' }, { status: 400 });
    }

    const admin = await import('firebase-admin');
    if (!admin.default.apps.length) {
      admin.default.initializeApp({
        credential: admin.default.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        }),
      });
    }

    const db = admin.default.firestore();

    await db.collection('customers').doc(customerId).update({
      mfBilling,
      updatedAt: admin.default.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to update billing:', err);
    return NextResponse.json({ error: 'Failed to update', details: String(err) }, { status: 500 });
  }
}
