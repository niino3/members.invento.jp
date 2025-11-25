import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// 環境変数の取得
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// 環境変数がすべて設定されている場合のみ初期化
if (getApps().length === 0 && privateKey && clientEmail && projectId) {
  try {
    initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey,
      }),
    });
  } catch (error) {
    // ビルド時にはエラーを無視（環境変数が設定されていない可能性があるため）
    if (process.env.NEXT_PHASE !== 'phase-production-build' && 
        process.env.NEXT_PHASE !== 'phase-development-build') {
      console.error('Firebase Admin SDK初期化エラー:', error);
    }
  }
}

// 初期化されていない場合でもエクスポート（実行時にエラーが発生する）
export const adminAuth = getApps().length > 0 ? getAuth() : null as any;
export const adminDb = getApps().length > 0 ? getFirestore() : null as any;