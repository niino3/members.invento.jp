const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Firebase Admin初期化
async function assignServiceToCustomers() {
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

  console.log('ログ記録が有効なサービスを検索中...');

  // logEnabled: true のサービスを取得
  const servicesSnapshot = await db
    .collection('services')
    .where('logEnabled', '==', true)
    .get();

  if (servicesSnapshot.empty) {
    console.log('ログ記録が有効なサービスが見つかりませんでした');
    return;
  }

  const logEnabledServiceIds = [];
  servicesSnapshot.forEach((doc) => {
    logEnabledServiceIds.push(doc.id);
    console.log(`  - ${doc.data().name} (${doc.id})`);
  });

  console.log(`\n${logEnabledServiceIds.length}件のログ記録が有効なサービスが見つかりました`);
  console.log(`サービスID: ${logEnabledServiceIds.join(', ')}\n`);

  console.log('インポートスクリプトで作成された顧客データを検索中...');

  // createdBy が 'import-script' の顧客を取得
  const customersSnapshot = await db
    .collection('customers')
    .where('createdBy', '==', 'import-script')
    .get();

  console.log(`${customersSnapshot.size}件の顧客データが見つかりました\n`);

  if (customersSnapshot.size === 0) {
    console.log('更新対象の顧客がありません');
    return;
  }

  // バッチ更新
  let batch = db.batch();
  let batchCount = 0;
  let totalCount = 0;

  customersSnapshot.forEach((doc) => {
    batch.update(doc.ref, {
      serviceIds: logEnabledServiceIds,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batchCount++;
    totalCount++;

    // Firestoreのバッチ制限は500件
    if (batchCount >= 499) {
      batch.commit();
      console.log(`${totalCount}件を更新しました...`);
      batch = db.batch();
      batchCount = 0;
    }
  });

  // 残りのバッチをコミット
  if (batchCount > 0) {
    await batch.commit();
    console.log(`${totalCount}件を更新しました...`);
  }

  console.log(`\n完了: 合計${totalCount}件の顧客にサービスを割り当てました`);
  console.log(`割り当てたサービスID: ${logEnabledServiceIds.join(', ')}`);
}

// スクリプト実行
assignServiceToCustomers()
  .then(() => {
    console.log('\nサービスの割り当てが正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });
