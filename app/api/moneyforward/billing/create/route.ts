import { NextRequest, NextResponse } from 'next/server';
import { createBilling as mfCreateBilling } from '@/lib/moneyforward';

/**
 * テンプレート変数を展開する
 * 使用可能な変数:
 *   {{YYYY}}  - 対象年 (例: 2026)
 *   {{MM}}    - 対象月ゼロ埋め (例: 04)
 *   {{M}}     - 対象月 (例: 4)
 *   {{YYYY+1}}, {{MM+1}}, {{M+1}} - 翌月の年月
 *   {{YYYY-1}}, {{MM-1}}, {{M-1}} - 前月の年月
 */
function resolveTitleTemplate(
  template: string,
  year: number,
  month: number,
  nextYear: number,
  nextMonth: number
): string {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  return template
    .replace(/\{\{YYYY\+1\}\}/g, String(nextYear))
    .replace(/\{\{MM\+1\}\}/g, String(nextMonth).padStart(2, '0'))
    .replace(/\{\{M\+1\}\}/g, String(nextMonth))
    .replace(/\{\{YYYY-1\}\}/g, String(prevYear))
    .replace(/\{\{MM-1\}\}/g, String(prevMonth).padStart(2, '0'))
    .replace(/\{\{M-1\}\}/g, String(prevMonth))
    .replace(/\{\{YYYY\}\}/g, String(year))
    .replace(/\{\{MM\}\}/g, String(month).padStart(2, '0'))
    .replace(/\{\{M\}\}/g, String(month));
}

export async function POST(request: NextRequest) {
  try {
    const { month, customerIds } = await request.json();
    if (!month) {
      return NextResponse.json({ error: 'month required (YYYY-MM)' }, { status: 400 });
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

    // 対象顧客を取得
    const customersSnapshot = await db.collection('customers').get();
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const targetMonth = parseInt(monthStr);

    // 日付計算
    const billingDate = `${yearStr}-${monthStr}-25`; // 発行日: 25日
    const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1;
    const nextYear = targetMonth === 12 ? year + 1 : year;
    const dueDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${new Date(nextYear, nextMonth, 0).getDate()}`; // 支払期日: 翌月末
    const lastDay = new Date(year, targetMonth, 0).getDate();
    const salesDate = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`; // 売上日: 月末

    const results: {
      customerId: string;
      customerName: string;
      success: boolean;
      mfBillingId?: string;
      error?: string;
    }[] = [];

    for (const doc of customersSnapshot.docs) {
      const data = doc.data();
      if (data.contractStatus === 'cancelled') continue;
      if (!data.mfBilling) continue;

      // customerIds が指定されている場合はそれだけ処理
      if (customerIds && !customerIds.includes(doc.id)) continue;

      const schedule = data.mfBilling.schedule;
      if (!schedule) continue;

      // スケジュール判定
      let isTarget = false;
      switch (schedule.type) {
        case 'monthly': isTarget = true; break;
        case 'yearly': isTarget = (schedule.months || []).includes(targetMonth); break;
        case 'biannual': isTarget = (schedule.months || []).includes(targetMonth); break;
        case 'quarterly': isTarget = (schedule.months || []).includes(targetMonth); break;
      }
      if (!isTarget) continue;

      // 既に作成済みかチェック
      const existingBilling = await db
        .collection('billing')
        .where('customerId', '==', doc.id)
        .where('targetMonth', '==', month)
        .get();

      if (!existingBilling.empty) {
        const existingData = existingBilling.docs[0].data();
        if (existingData.mfBillingId) {
          results.push({
            customerId: doc.id,
            customerName: data.companyName,
            success: true,
            mfBillingId: existingData.mfBillingId,
            error: 'Already created',
          });
          continue;
        }
      }

      // 可変金額の場合はスキップ（手動入力が必要）
      if (data.mfBilling.variable) {
        results.push({
          customerId: doc.id,
          customerName: data.companyName,
          success: false,
          error: 'Variable amount - manual input required',
        });
        continue;
      }

      try {
        // MF API で請求書作成
        const billingScope = data.mfBilling.billingScope || 'current';

        // タイトルテンプレート変数を展開
        const titleTemplate = data.mfBilling.title || '{{YYYY}}年{{M}}月分 Webサイト保守管理費';
        const resolvedTitle = resolveTitleTemplate(titleTemplate, year, targetMonth, nextYear, nextMonth);

        const mfResult = await mfCreateBilling({
          department_id: data.mfBilling.departmentId,
          billing_date: billingDate,
          due_date: dueDate,
          sales_date: salesDate,
          title: resolvedTitle,
          items: data.mfBilling.items.map((item: { name: string; price: number; quantity: number; excise: string }) => ({
            name: resolveTitleTemplate(item.name, year, targetMonth, nextYear, nextMonth),
            price: item.price,
            quantity: item.quantity,
            excise: item.excise,
          })),
        });

        const mfBillingId = mfResult?.data?.id || mfResult?.id;

        // billing コレクションに記録
        const totalAmount = data.mfBilling.items.reduce(
          (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
          0
        );

        await db.collection('billing').add({
          customerId: doc.id,
          customerName: data.companyName,
          amount: totalAmount,
          currency: 'JPY',
          billingDate: admin.default.firestore.Timestamp.fromDate(new Date(billingDate)),
          dueDate: admin.default.firestore.Timestamp.fromDate(new Date(dueDate)),
          status: 'pending',
          paymentMethod: data.paymentMethod || 'other',
          targetMonth: month,
          mfBillingId: mfBillingId,
          notes: resolveTitleTemplate(data.mfBilling.notes || '', year, targetMonth, nextYear, nextMonth),
          createdAt: admin.default.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.default.firestore.FieldValue.serverTimestamp(),
        });

        results.push({
          customerId: doc.id,
          customerName: data.companyName,
          success: true,
          mfBillingId: mfBillingId,
        });
      } catch (err) {
        console.error(`Failed to create billing for ${data.companyName}:`, err);
        results.push({
          customerId: doc.id,
          customerName: data.companyName,
          success: false,
          error: String(err),
        });
      }
    }

    return NextResponse.json({
      month,
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });
  } catch (err) {
    console.error('Billing create error:', err);
    return NextResponse.json(
      { error: 'Failed to create billings', details: String(err) },
      { status: 500 }
    );
  }
}
