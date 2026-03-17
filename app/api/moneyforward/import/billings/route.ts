import { NextRequest, NextResponse } from 'next/server';
import { mfApiRequest } from '@/lib/moneyforward';

/**
 * GET: MFの請求書を1ページ分取得
 * ?page=1 （デフォルト1、1ページ100件）
 */
export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get('page') || '1';

  try {
    const response = await mfApiRequest(`/api/v3/billings?page=${page}&per_page=100`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get billings: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const billings = data.data || data;

    // 請求書データを整形
    const parsed = (Array.isArray(billings) ? billings : []).map((b: any) => {
      const attrs = b.attributes || b;
      return {
        id: b.id || attrs.id,
        billingDate: attrs.billing_date || '',
        dueDate: attrs.due_date || '',
        title: attrs.title || '',
        totalAmount: attrs.total_price || 0,
        status: attrs.status || '',
        departmentId: attrs.department_id || '',
        partnerName: attrs.partner_name || '',
        items: (attrs.items || []).map((item: any) => ({
          name: item.name || '',
          price: item.price || 0,
          quantity: item.quantity || 1,
          excise: item.excise || 'ten_percent',
        })),
      };
    });

    return NextResponse.json({
      page: parseInt(page),
      count: parsed.length,
      hasMore: parsed.length >= 100,
      billings: parsed,
    });
  } catch (err) {
    console.error('Billing fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch billings', details: String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST: 取引先の請求情報を Firestore 顧客に保存
 */
export async function POST(request: NextRequest) {
  try {
    const { customerId, departmentId, items, schedule, billingScope, variable, notes } = await request.json();

    if (!customerId || !departmentId) {
      return NextResponse.json({ error: 'customerId and departmentId required' }, { status: 400 });
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
      mfBilling: {
        departmentId,
        schedule: schedule || { type: 'monthly', months: [] },
        billingScope: billingScope || 'current',
        items: items || [],
        variable: variable || false,
        notes: notes || '',
      },
      updatedAt: admin.default.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, customerId });
  } catch (err) {
    console.error('Save billing info error:', err);
    return NextResponse.json(
      { error: 'Failed to save billing info', details: String(err) },
      { status: 500 }
    );
  }
}
