import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get('month'); // YYYY-MM
  if (!month) {
    return NextResponse.json({ error: 'month parameter required (YYYY-MM)' }, { status: 400 });
  }

  try {
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

    // 全顧客を取得
    const customersSnapshot = await db.collection('customers').get();
    const [yearStr, monthStr] = month.split('-');
    const targetMonth = parseInt(monthStr);

    const targets: {
      customerId: string;
      customerName: string;
      paymentMethod: string;
      items: { name: string; price: number; quantity: number; excise: string }[];
      totalAmount: number;
      status: string;
    }[] = [];

    // 対象月の既存請求書を取得
    const billingsSnapshot = await db
      .collection('billing')
      .where('targetMonth', '==', month)
      .get();

    const existingBillings: Record<string, { status: string; mfBillingId?: string; sentAt?: Date }> = {};
    billingsSnapshot.forEach((doc) => {
      const data = doc.data();
      existingBillings[data.customerId] = {
        status: data.sentAt ? 'sent' : data.mfBillingId ? 'created' : 'pending',
        mfBillingId: data.mfBillingId,
        sentAt: data.sentAt?.toDate(),
      };
    });

    customersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.contractStatus === 'cancelled') return;
      if (!data.mfBilling) return;

      const schedule = data.mfBilling.schedule;
      if (!schedule) return;

      // スケジュール判定
      let isTarget = false;
      switch (schedule.type) {
        case 'monthly':
          isTarget = true;
          break;
        case 'yearly':
          isTarget = (schedule.months || []).includes(targetMonth);
          break;
        case 'biannual':
          isTarget = (schedule.months || []).includes(targetMonth);
          break;
        case 'quarterly':
          isTarget = (schedule.months || []).includes(targetMonth);
          break;
      }

      if (!isTarget) return;

      const existing = existingBillings[doc.id];
      const items = data.mfBilling.items || [];
      const totalAmount = items.reduce(
        (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
        0
      );

      targets.push({
        customerId: doc.id,
        customerName: data.companyName,
        paymentMethod: data.paymentMethod || 'other',
        items,
        totalAmount,
        status: existing?.status || 'pending',
      });
    });

    // 金額合計
    const summary = {
      month,
      totalCount: targets.length,
      totalAmount: targets.reduce((sum, t) => sum + t.totalAmount, 0),
      pendingCount: targets.filter(t => t.status === 'pending').length,
      createdCount: targets.filter(t => t.status === 'created').length,
      sentCount: targets.filter(t => t.status === 'sent').length,
    };

    return NextResponse.json({ summary, targets });
  } catch (err) {
    console.error('Billing preview error:', err);
    return NextResponse.json(
      { error: 'Failed to generate preview', details: String(err) },
      { status: 500 }
    );
  }
}
