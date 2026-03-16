import { NextRequest, NextResponse } from 'next/server';
import { mfApiRequest } from '@/lib/moneyforward';

/**
 * GET: MF取引先一覧 + 部署一覧を取得し、Firestore顧客との突合結果を返す
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

    // 1. MF 取引先一覧を取得（ページネーション対応）
    let allPartners: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await mfApiRequest(`/api/v3/partners?page=${page}&per_page=100`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get partners: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      const partners = data.data || data;

      if (Array.isArray(partners) && partners.length > 0) {
        allPartners = allPartners.concat(partners);
        page++;
        // 100件未満なら最後のページ
        if (partners.length < 100) hasMore = false;
      } else {
        hasMore = false;
      }
    }

    // 2. Firestore 顧客一覧を取得
    const customersSnapshot = await db.collection('customers').get();
    const customers: { id: string; companyName: string; companyNameKana: string; contractStatus: string; mfBilling?: any }[] = [];
    customersSnapshot.forEach((doc) => {
      const data = doc.data();
      customers.push({
        id: doc.id,
        companyName: data.companyName,
        companyNameKana: data.companyNameKana || '',
        contractStatus: data.contractStatus || 'active',
        mfBilling: data.mfBilling || null,
      });
    });

    // 3. MF取引先を整形
    const mfPartners = allPartners.map((p: any) => {
      const attrs = p.attributes || p;
      const departments = attrs.departments || [];
      return {
        id: p.id || attrs.id,
        name: attrs.name || '',
        code: attrs.code || '',
        departments: departments.map((d: any) => ({
          id: d.id,
          name: d.name || '',
        })),
        // 名前で自動マッチング候補を探す
        matchedCustomerId: findBestMatch(attrs.name || '', customers),
      };
    });

    return NextResponse.json({
      mfPartners,
      customers: customers.map(c => ({
        id: c.id,
        companyName: c.companyName,
        companyNameKana: c.companyNameKana,
        contractStatus: c.contractStatus,
        hasMfBilling: !!c.mfBilling,
      })),
    });
  } catch (err) {
    console.error('Import data fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch import data', details: String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST: マッピング結果を Firestore に保存
 */
export async function POST(request: NextRequest) {
  try {
    const { mappings } = await request.json();
    // mappings: [{ customerId, departmentId, partnerName }]

    if (!mappings || !Array.isArray(mappings)) {
      return NextResponse.json({ error: 'mappings array required' }, { status: 400 });
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
    let updatedCount = 0;

    for (const mapping of mappings) {
      if (!mapping.customerId || !mapping.departmentId) continue;

      const customerRef = db.collection('customers').doc(mapping.customerId);
      const customerDoc = await customerRef.get();
      if (!customerDoc.exists) continue;

      const existingData = customerDoc.data();
      const existingMfBilling = existingData?.mfBilling || {};

      await customerRef.update({
        'mfBilling.departmentId': mapping.departmentId,
        'mfBilling.schedule': existingMfBilling.schedule || { type: 'monthly', months: [] },
        'mfBilling.billingScope': existingMfBilling.billingScope || 'current',
        'mfBilling.items': existingMfBilling.items || [],
        'mfBilling.variable': existingMfBilling.variable || false,
        'mfBilling.notes': existingMfBilling.notes || '',
        updatedAt: admin.default.firestore.FieldValue.serverTimestamp(),
      });

      updatedCount++;
    }

    return NextResponse.json({ updated: updatedCount });
  } catch (err) {
    console.error('Import save error:', err);
    return NextResponse.json(
      { error: 'Failed to save mappings', details: String(err) },
      { status: 500 }
    );
  }
}

/**
 * 名前の類似度で最もマッチする顧客IDを返す
 */
function findBestMatch(
  mfName: string,
  customers: { id: string; companyName: string }[]
): string | null {
  if (!mfName) return null;

  const normalize = (s: string) =>
    s.replace(/[\s　]/g, '')
      .replace(/株式会社|有限会社|合同会社|一般社団法人|一般財団法人/g, '')
      .replace(/（|）|\(|\)/g, '')
      .toLowerCase();

  const normalizedMf = normalize(mfName);

  // 完全一致
  for (const c of customers) {
    if (normalize(c.companyName) === normalizedMf) return c.id;
  }

  // 部分一致
  for (const c of customers) {
    const normalizedCustomer = normalize(c.companyName);
    if (normalizedMf.includes(normalizedCustomer) || normalizedCustomer.includes(normalizedMf)) {
      return c.id;
    }
  }

  return null;
}
