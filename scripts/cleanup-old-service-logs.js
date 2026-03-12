const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const RETENTION_DAYS = 365; // 1年

async function cleanupOldServiceLogs() {
  if (!admin.apps.length) {
    const serviceAccount = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`,
    });
  }

  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  console.log(`=== サービスログ クリーンアップ ===`);
  console.log(`モード: ${DRY_RUN ? 'ドライラン（削除しません）' : '本番実行'}`);
  console.log(`基準日: ${cutoffDate.toISOString().split('T')[0]}（これより前のログを削除）`);
  console.log('');

  // 1年以上前のサービスログを取得
  const snapshot = await db
    .collection('serviceLogs')
    .where('workDate', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
    .get();

  console.log(`対象ログ: ${snapshot.size} 件`);

  if (snapshot.size === 0) {
    console.log('削除対象のサービスログはありません');
    return;
  }

  let deletedLogs = 0;
  let deletedImages = 0;
  let failedImages = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const workDate = data.workDate?.toDate();
    const images = data.images || [];

    console.log(`\n[${doc.id}] 作業日: ${workDate?.toISOString().split('T')[0]} / 画像: ${images.length}枚`);

    if (!DRY_RUN) {
      // Storage から画像を削除
      for (const image of images) {
        try {
          const filePath = `service-logs/${doc.id}/${image.filename}`;
          await bucket.file(filePath).delete();
          deletedImages++;
          console.log(`  画像削除: ${image.filename}`);
        } catch (error) {
          failedImages++;
          console.warn(`  画像削除失敗: ${image.filename} (${error.message})`);
        }
      }

      // Firestore ドキュメントを削除
      await doc.ref.delete();
      deletedLogs++;
    } else {
      deletedLogs++;
      deletedImages += images.length;
    }
  }

  console.log('\n=== 結果 ===');
  console.log(`削除ログ: ${deletedLogs} 件`);
  console.log(`削除画像: ${deletedImages} 枚`);
  if (failedImages > 0) {
    console.log(`画像削除失敗: ${failedImages} 枚`);
  }
  if (DRY_RUN) {
    console.log('\n※ ドライランのため実際の削除は行われていません');
    console.log('※ 本番実行するには --dry-run を外して実行してください');
  }
}

cleanupOldServiceLogs()
  .then(() => {
    console.log('\n完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
