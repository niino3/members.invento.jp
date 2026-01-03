const admin = require('firebase-admin');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

// Firebase Admin初期化
async function deleteImportedCustomers() {
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

  console.log('インポートスクリプトで作成された顧客データを検索中...');

  // createdBy が 'import-script' のドキュメントを取得
  const querySnapshot = await db
    .collection('customers')
    .where('createdBy', '==', 'import-script')
    .get();

  console.log(`${querySnapshot.size}件の顧客データが見つかりました`);

  if (querySnapshot.size === 0) {
    console.log('削除対象のデータがありません');
    return;
  }

  // バッチ削除
  let batch = db.batch();
  let batchCount = 0;
  let totalCount = 0;

  querySnapshot.forEach((doc) => {
    batch.delete(doc.ref);
    batchCount++;
    totalCount++;

    // Firestoreのバッチ制限は500件
    if (batchCount >= 499) {
      batch.commit();
      console.log(`${totalCount}件を削除しました...`);
      batch = db.batch();
      batchCount = 0;
    }
  });

  // 残りのバッチをコミット
  if (batchCount > 0) {
    await batch.commit();
    console.log(`${totalCount}件を削除しました...`);
  }

  console.log(`\n完了: 合計${totalCount}件の顧客データを削除しました`);
}

// スクリプト実行
deleteImportedCustomers()
  .then(() => {
    console.log('削除が正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });
