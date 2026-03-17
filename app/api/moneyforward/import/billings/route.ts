import { NextRequest, NextResponse } from 'next/server';
import { mfApiRequest } from '@/lib/moneyforward';

/**
 * GET: 特定の department_id の請求書履歴を取得して分析
 * ?department_id=xxx 必須
 */
export async function GET(request: NextRequest) {
  const departmentId = request.nextUrl.searchParams.get('department_id');

  if (!departmentId) {
    return NextResponse.json({ error: 'department_id parameter required' }, { status: 400 });
  }

  try {
    // 指定 department の請求書を取得（最大3ページ=300件）
    let allBillings: any[] = [];
    let page = 1;
    const maxPages = 3;

    while (page <= maxPages) {
      const response = await mfApiRequest(
        `/api/v3/billings?department_id=${departmentId}&page=${page}&per_page=100`
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get billings: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      const billings = data.data || data;

      if (Array.isArray(billings) && billings.length > 0) {
        allBillings = allBillings.concat(billings);
        if (billings.length < 100) break;
        page++;
      } else {
        break;
      }
    }

    // 請求書データを整形
    const parsed = allBillings.map((b: any) => {
      const attrs = b.attributes || b;
      return {
        id: b.id || attrs.id,
        billingDate: attrs.billing_date || '',
        dueDate: attrs.due_date || '',
        title: attrs.title || '',
        totalAmount: attrs.total_price || 0,
        status: attrs.status || '',
        items: (attrs.items || []).map((item: any) => ({
          name: item.name || '',
          price: item.price || 0,
          quantity: item.quantity || 1,
          excise: item.excise || 'ten_percent',
        })),
      };
    });

    // 日付でソート（新しい順）
    parsed.sort((a, b) => (b.billingDate || '').localeCompare(a.billingDate || ''));

    // 最新の請求書から品目を推定
    const suggestedItems = parsed.length > 0 ? parsed[0].items : [];

    // 請求月パターンからスケジュールを推定
    const months = new Set<number>();
    for (const b of parsed) {
      if (b.billingDate) {
        const m = parseInt(b.billingDate.split('-')[1]);
        if (m) months.add(m);
      }
    }

    const monthCount = months.size;
    let suggestedSchedule: { type: string; months: number[] };
    if (monthCount >= 10) {
      suggestedSchedule = { type: 'monthly', months: [] };
    } else if (monthCount >= 4 && monthCount <= 5) {
      suggestedSchedule = { type: 'quarterly', months: Array.from(months).sort((a, b) => a - b) };
    } else if (monthCount === 2 || monthCount === 3) {
      suggestedSchedule = { type: 'biannual', months: Array.from(months).sort((a, b) => a - b) };
    } else if (monthCount === 1) {
      suggestedSchedule = { type: 'yearly', months: Array.from(months) };
    } else {
      suggestedSchedule = { type: 'monthly', months: [] };
    }

    // 金額変動の分析
    const amounts = parsed.map(b => b.totalAmount).filter(a => a > 0);
    const uniqueAmounts = new Set(amounts);
    const isVariable = uniqueAmounts.size > 2; // 2種類以上の金額があれば可変

    return NextResponse.json({
      departmentId,
      totalBillings: parsed.length,
      billings: parsed,
      suggestedItems,
      suggestedSchedule,
      analysis: {
        isVariable,
        uniqueAmounts: Array.from(uniqueAmounts).sort((a, b) => b - a),
        amountCount: uniqueAmounts.size,
        latestAmount: amounts[0] || 0,
      },
    });
  } catch (err) {
    console.error('Billing import error:', err);
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
