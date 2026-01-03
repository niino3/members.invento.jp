const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Firebase Admin SDKを動的にインポート
async function importCustomers() {
  const admin = require('firebase-admin');

  // Firebase Admin初期化
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

  // CSVファイルを読み込み
  const csvPath = path.join(__dirname, '..', 'customers-cleaned.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  // CSVをパース
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`${records.length}件の顧客データを読み込みました`);

  // 一括登録用のバッチ
  let batch = db.batch();
  let batchCount = 0;
  let totalCount = 0;

  for (const record of records) {
    const { よみがな, 会社名, 氏名 } = record;

    // 会社名が空の場合はスキップ
    if (!会社名 || 会社名.trim() === '') {
      console.warn(`会社名が空のためスキップ: ${JSON.stringify(record)}`);
      continue;
    }

    // 担当者名が空の場合は会社名を使用
    const contactName = 氏名 && 氏名.trim() !== '' ? 氏名.trim() : 会社名.trim();

    // Firestoreドキュメントデータ
    const customerData = {
      companyType: 'corporate',
      companyName: 会社名.trim(),
      companyNameKana: よみがな && よみがな.trim() !== '' ? よみがな.trim() : undefined,
      contactName: contactName,
      contractStatus: 'active',
      invoiceRequired: false,
      serviceIds: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'import-script',
      updatedBy: 'import-script',
    };

    // undefinedのフィールドを削除
    Object.keys(customerData).forEach(key => {
      if (customerData[key] === undefined) {
        delete customerData[key];
      }
    });

    // 新しいドキュメント参照を作成
    const docRef = db.collection('customers').doc();
    batch.set(docRef, customerData);
    batchCount++;
    totalCount++;

    // Firestoreのバッチ制限は500件なので、499件ごとにコミット
    if (batchCount >= 499) {
      await batch.commit();
      console.log(`${totalCount}件を登録しました...`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  // 残りのバッチをコミット
  if (batchCount > 0) {
    await batch.commit();
    console.log(`${totalCount}件を登録しました...`);
  }

  console.log(`\n完了: 合計${totalCount}件の顧客を登録しました`);
}

// スクリプト実行
importCustomers()
  .then(() => {
    console.log('インポートが正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });
