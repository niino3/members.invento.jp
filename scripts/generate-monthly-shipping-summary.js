const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function generateMonthlyShippingSummary() {
  if (!admin.apps.length) {
    const serviceAccount = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();

  // 1. 郵送料マスタを取得
  console.log('郵送料マスタを取得中...');
  const shippingCostsSnapshot = await db.collection('shippingCosts').get();
  const shippingCostMap = {};
  shippingCostsSnapshot.forEach((doc) => {
    const data = doc.data();
    shippingCostMap[doc.id] = { name: data.name, price: data.price || 0 };
  });
  console.log(`  ${Object.keys(shippingCostMap).length} 件の郵送料マスタ`);

  // 2. 顧客マスタを取得
  console.log('顧客マスタを取得中...');
  const customersSnapshot = await db.collection('customers').get();
  const customerMap = {};
  customersSnapshot.forEach((doc) => {
    const data = doc.data();
    customerMap[doc.id] = {
      companyName: data.companyName,
      companyNameKana: data.companyNameKana,
    };
  });
  console.log(`  ${Object.keys(customerMap).length} 件の顧客マスタ`);

  // 3. サービスログを全件取得
  console.log('サービスログを取得中...');
  const logsSnapshot = await db
    .collection('serviceLogs')
    .orderBy('workDate', 'desc')
    .get();
  console.log(`  ${logsSnapshot.size} 件のサービスログ`);

  // 4. 顧客 × 年月 でグルーピングして集計
  // summaryMap[customerId][YYYY-MM] = { count, total, details[] }
  const summaryMap = {};

  logsSnapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.shippingCostId) return; // 郵送なしはスキップ

    const customerId = data.customerId;
    const workDate = data.workDate?.toDate();
    if (!workDate) return;

    const yearMonth = `${workDate.getFullYear()}-${String(workDate.getMonth() + 1).padStart(2, '0')}`;
    const shippingCost = shippingCostMap[data.shippingCostId];
    if (!shippingCost) return;

    if (!summaryMap[customerId]) {
      summaryMap[customerId] = {};
    }
    if (!summaryMap[customerId][yearMonth]) {
      summaryMap[customerId][yearMonth] = { count: 0, total: 0, details: [] };
    }

    summaryMap[customerId][yearMonth].count++;
    summaryMap[customerId][yearMonth].total += shippingCost.price;
    summaryMap[customerId][yearMonth].details.push({
      date: workDate.toISOString().split('T')[0],
      shippingName: shippingCost.name,
      price: shippingCost.price,
    });
  });

  // 5. Firestore に monthlyShippingSummary コレクションとして保存
  console.log('\nサマリーデータを Firestore に保存中...');

  const summaryCollection = db.collection('monthlyShippingSummary');

  // 既存データを削除
  const existingDocs = await summaryCollection.get();
  if (!existingDocs.empty) {
    const deleteBatch = db.batch();
    let deleteCount = 0;
    existingDocs.forEach((doc) => {
      deleteBatch.delete(doc.ref);
      deleteCount++;
    });
    await deleteBatch.commit();
    console.log(`  既存データ ${deleteCount} 件を削除`);
  }

  // 新規データを保存
  let savedCount = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const [customerId, months] of Object.entries(summaryMap)) {
    const customer = customerMap[customerId] || { companyName: '不明', companyNameKana: '' };

    for (const [yearMonth, data] of Object.entries(months)) {
      const docRef = summaryCollection.doc(`${customerId}_${yearMonth}`);
      batch.set(docRef, {
        customerId,
        customerName: customer.companyName,
        customerNameKana: customer.companyNameKana || '',
        yearMonth,
        totalCount: data.count,
        totalAmount: data.total,
        details: data.details,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      batchCount++;
      savedCount++;

      if (batchCount >= 499) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`  ${savedCount} 件のサマリーデータを保存`);

  // 6. コンソールに結果を表示
  console.log('\n=== 月別郵送料サマリー ===\n');

  // 顧客名でソート
  const sortedCustomerIds = Object.keys(summaryMap).sort((a, b) => {
    const nameA = customerMap[a]?.companyNameKana || customerMap[a]?.companyName || '';
    const nameB = customerMap[b]?.companyNameKana || customerMap[b]?.companyName || '';
    return nameA.localeCompare(nameB, 'ja');
  });

  for (const customerId of sortedCustomerIds) {
    const customer = customerMap[customerId] || { companyName: '不明' };
    const months = summaryMap[customerId];

    console.log(`■ ${customer.companyName}`);

    // 年月でソート（新しい順）
    const sortedMonths = Object.keys(months).sort().reverse();
    for (const yearMonth of sortedMonths) {
      const data = months[yearMonth];
      console.log(`  ${yearMonth}: ${data.count}件 / ¥${data.total.toLocaleString('ja-JP')}`);
      for (const detail of data.details) {
        console.log(`    ${detail.date} ${detail.shippingName} ¥${detail.price.toLocaleString('ja-JP')}`);
      }
    }
    console.log('');
  }
}

generateMonthlyShippingSummary()
  .then(() => {
    console.log('完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
