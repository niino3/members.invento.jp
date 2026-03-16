import { NextRequest, NextResponse } from 'next/server';
import { mfApiRequest } from '@/lib/moneyforward';

export async function POST(request: NextRequest) {
  try {
    const { billingIds } = await request.json();
    if (!billingIds || !Array.isArray(billingIds) || billingIds.length === 0) {
      return NextResponse.json({ error: 'billingIds array required' }, { status: 400 });
    }

    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        }),
      });
    }

    const db = admin.firestore();

    const results: {
      billingId: string;
      customerName: string;
      success: boolean;
      error?: string;
    }[] = [];

    for (const billingId of billingIds) {
      // Firestore から billing ドキュメントを取得
      const billingDoc = await db.collection('billing').doc(billingId).get();
      if (!billingDoc.exists) {
        results.push({ billingId, customerName: '', success: false, error: 'Billing not found' });
        continue;
      }

      const billingData = billingDoc.data()!;
      const mfBillingId = billingData.mfBillingId;

      if (!mfBillingId) {
        results.push({
          billingId,
          customerName: billingData.customerName,
          success: false,
          error: 'MF billing not created yet',
        });
        continue;
      }

      if (billingData.sentAt) {
        results.push({
          billingId,
          customerName: billingData.customerName,
          success: true,
          error: 'Already sent',
        });
        continue;
      }

      try {
        // MF API でメール送信
        const response = await mfApiRequest(`/api/v3/billings/${mfBillingId}/delivery`, {
          method: 'POST',
          body: JSON.stringify({ delivery_method: 'email' }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`MF API error: ${response.status} ${errorText}`);
        }

        // sentAt を記録
        await db.collection('billing').doc(billingId).update({
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'pending', // 送信済み（未入金）
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        results.push({
          billingId,
          customerName: billingData.customerName,
          success: true,
        });
      } catch (err) {
        console.error(`Failed to send billing ${billingId}:`, err);
        results.push({
          billingId,
          customerName: billingData.customerName,
          success: false,
          error: String(err),
        });
      }
    }

    return NextResponse.json({
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });
  } catch (err) {
    console.error('Billing send error:', err);
    return NextResponse.json(
      { error: 'Failed to send billings', details: String(err) },
      { status: 500 }
    );
  }
}
