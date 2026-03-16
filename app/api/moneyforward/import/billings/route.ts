import { NextRequest, NextResponse } from 'next/server';
import { mfApiRequest } from '@/lib/moneyforward';

/**
 * GET: MFの請求書一覧から、取引先ごとの品目・金額・スケジュールを解析して返す
 * ?department_id=xxx で特定取引先の請求書を取得
 */
export async function GET(request: NextRequest) {
  const departmentId = request.nextUrl.searchParams.get('department_id');

  try {
    // 直近1年分の請求書を取得
    let allBillings: any[] = [];
    let page = 1;
    let hasMore = true;

    const params = new URLSearchParams({ page: '1', per_page: '100' });
    if (departmentId) {
      params.set('department_id', departmentId);
    }

    while (hasMore) {
      params.set('page', String(page));
      const response = await mfApiRequest(`/api/v3/billings?${params.toString()}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get billings: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      const billings = data.data || data;

      if (Array.isArray(billings) && billings.length > 0) {
        allBillings = allBillings.concat(billings);
        page++;
        if (billings.length < 100) hasMore = false;
      } else {
        hasMore = false;
      }
    }

    // 請求書データを整形
    const parsed = allBillings.map((b: any) => {
      const attrs = b.attributes || b;
      return {
        id: b.id || attrs.id,
        billingDate: attrs.billing_date,
        dueDate: attrs.due_date,
        title: attrs.title || '',
        totalAmount: attrs.total_price || 0,
        departmentId: attrs.department_id,
        partnerName: attrs.partner_name || '',
        items: (attrs.items || []).map((item: any) => ({
          name: item.name || '',
          price: item.price || 0,
          quantity: item.quantity || 1,
          excise: item.excise || 'ten_percent',
        })),
      };
    });

    // department_id ごとにグルーピング
    const byDepartment: Record<string, {
      partnerName: string;
      billings: typeof parsed;
      suggestedItems: { name: string; price: number; quantity: number; excise: string }[];
      suggestedSchedule: { type: string; months: number[] };
    }> = {};

    for (const billing of parsed) {
      const deptId = billing.departmentId || 'unknown';
      if (!byDepartment[deptId]) {
        byDepartment[deptId] = {
          partnerName: billing.partnerName,
          billings: [],
          suggestedItems: [],
          suggestedSchedule: { type: 'monthly', months: [] },
        };
      }
      byDepartment[deptId].billings.push(billing);
    }

    // 各部署の品目・スケジュールを推定
    for (const [deptId, dept] of Object.entries(byDepartment)) {
      // 最新の請求書から品目を取得
      const sortedBillings = dept.billings.sort(
        (a, b) => (b.billingDate || '').localeCompare(a.billingDate || '')
      );

      if (sortedBillings.length > 0) {
        dept.suggestedItems = sortedBillings[0].items;
      }

      // 請求月のパターンからスケジュールを推定
      const months = new Set<number>();
      for (const b of sortedBillings) {
        if (b.billingDate) {
          const m = parseInt(b.billingDate.split('-')[1]);
          if (m) months.add(m);
        }
      }

      const monthCount = months.size;
      if (monthCount >= 10) {
        dept.suggestedSchedule = { type: 'monthly', months: [] };
      } else if (monthCount >= 4 && monthCount <= 5) {
        dept.suggestedSchedule = { type: 'quarterly', months: Array.from(months).sort((a, b) => a - b) };
      } else if (monthCount === 2 || monthCount === 3) {
        dept.suggestedSchedule = { type: 'biannual', months: Array.from(months).sort((a, b) => a - b) };
      } else if (monthCount === 1) {
        dept.suggestedSchedule = { type: 'yearly', months: Array.from(months) };
      }
    }

    return NextResponse.json({
      totalBillings: allBillings.length,
      departments: byDepartment,
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

    await db.collection('customers').doc(customerId).update({
      mfBilling: {
        departmentId,
        schedule: schedule || { type: 'monthly', months: [] },
        billingScope: billingScope || 'current',
        items: items || [],
        variable: variable || false,
        notes: notes || '',
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
