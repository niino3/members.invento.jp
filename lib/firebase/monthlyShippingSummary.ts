import {
  collection,
  doc,
  getDocs,
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

const COLLECTION_NAME = 'monthlyShippingSummary';

export interface MonthlyShippingSummaryDetail {
  date: string;
  shippingName: string;
  price: number;
}

export interface MonthlyShippingSummary {
  id: string;
  customerId: string;
  customerName: string;
  customerNameKana: string;
  yearMonth: string; // YYYY-MM
  totalCount: number;
  totalAmount: number;
  details: MonthlyShippingSummaryDetail[];
  generatedAt: Date;
}

/**
 * 前月の月次郵送料サマリーを自動生成する
 * サービスログ一覧を開いた際にバックグラウンドで呼び出される
 */
export async function generateLastMonthShippingSummary(): Promise<number> {
  try {
    // 前月の年月を計算
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yearMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    // 既に生成済みかチェック（1件でもあればスキップ）
    const existingQuery = query(
      collection(db, COLLECTION_NAME),
      where('yearMonth', '==', yearMonth)
    );
    const existingSnapshot = await getDocs(existingQuery);
    if (!existingSnapshot.empty) {
      return 0; // 既に生成済み
    }

    // 前月の開始日と終了日
    const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);

    // 前月のサービスログを取得
    const logsQuery = query(
      collection(db, 'serviceLogs'),
      where('workDate', '>=', Timestamp.fromDate(startDate)),
      where('workDate', '<=', Timestamp.fromDate(endDate))
    );
    const logsSnapshot = await getDocs(logsQuery);

    if (logsSnapshot.empty) return 0;

    // 郵送料マスタを取得
    const shippingCostsSnapshot = await getDocs(collection(db, 'shippingCosts'));
    const shippingCostMap: Record<string, { name: string; price: number }> = {};
    shippingCostsSnapshot.forEach((doc) => {
      const data = doc.data();
      shippingCostMap[doc.id] = { name: data.name, price: data.price || 0 };
    });

    // 顧客マスタを取得
    const customersSnapshot = await getDocs(collection(db, 'customers'));
    const customerMap: Record<string, { companyName: string; companyNameKana: string }> = {};
    customersSnapshot.forEach((doc) => {
      const data = doc.data();
      customerMap[doc.id] = {
        companyName: data.companyName,
        companyNameKana: data.companyNameKana || '',
      };
    });

    // 顧客ごとに集計
    const summaryMap: Record<string, { count: number; total: number; details: MonthlyShippingSummaryDetail[] }> = {};

    logsSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.shippingCostId) return;

      const customerId = data.customerId;
      const workDate = data.workDate?.toDate();
      if (!workDate) return;

      const shippingCost = shippingCostMap[data.shippingCostId];
      if (!shippingCost) return;

      if (!summaryMap[customerId]) {
        summaryMap[customerId] = { count: 0, total: 0, details: [] };
      }

      summaryMap[customerId].count++;
      summaryMap[customerId].total += shippingCost.price;
      summaryMap[customerId].details.push({
        date: workDate.toISOString().split('T')[0],
        shippingName: shippingCost.name,
        price: shippingCost.price,
      });
    });

    // Firestore に保存
    let savedCount = 0;
    for (const [customerId, data] of Object.entries(summaryMap)) {
      const customer = customerMap[customerId] || { companyName: '不明', companyNameKana: '' };
      const docId = `${customerId}_${yearMonth}`;

      await setDoc(doc(db, COLLECTION_NAME, docId), {
        customerId,
        customerName: customer.companyName,
        customerNameKana: customer.companyNameKana,
        yearMonth,
        totalCount: data.count,
        totalAmount: data.total,
        details: data.details,
        generatedAt: serverTimestamp(),
      });

      savedCount++;
    }

    if (savedCount > 0) {
      console.log(`${yearMonth} の月次郵送料サマリー ${savedCount} 件を生成しました`);
    }

    return savedCount;
  } catch (error) {
    console.error('月次郵送料サマリーの生成に失敗:', error);
    return 0;
  }
}

/**
 * 月次郵送料サマリーを取得
 */
export async function getMonthlyShippingSummaries(
  yearMonth?: string
): Promise<MonthlyShippingSummary[]> {
  try {
    let q;
    if (yearMonth) {
      q = query(
        collection(db, COLLECTION_NAME),
        where('yearMonth', '==', yearMonth),
        orderBy('customerNameKana', 'asc')
      );
    } else {
      q = query(
        collection(db, COLLECTION_NAME),
        orderBy('yearMonth', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    const summaries: MonthlyShippingSummary[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      summaries.push({
        id: docSnap.id,
        customerId: data.customerId,
        customerName: data.customerName,
        customerNameKana: data.customerNameKana,
        yearMonth: data.yearMonth,
        totalCount: data.totalCount,
        totalAmount: data.totalAmount,
        details: data.details || [],
        generatedAt: data.generatedAt?.toDate() || new Date(),
      });
    });

    return summaries;
  } catch (error) {
    console.error('月次郵送料サマリーの取得に失敗:', error);
    return [];
  }
}
