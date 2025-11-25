import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDKの初期化関数（実行時のみ呼び出される）
function initializeAdmin() {
  if (getApps().length > 0) {
    return; // 既に初期化されている
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // 環境変数がすべて設定されている場合のみ初期化
  if (privateKey && clientEmail && projectId) {
    try {
      initializeApp({
        credential: cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey,
        }),
      });
    } catch (error) {
      console.error('Firebase Admin SDK初期化エラー:', error);
      throw error;
    }
  } else {
    throw new Error('Firebase Admin SDK環境変数が設定されていません');
  }
}

// 実行時に初期化を試みる（ビルド時には実行されない）
let adminAuthInstance: ReturnType<typeof getAuth> | null = null;
let adminDbInstance: ReturnType<typeof getFirestore> | null = null;

function getAdminAuth() {
  if (!adminAuthInstance) {
    initializeAdmin();
    adminAuthInstance = getAuth();
  }
  return adminAuthInstance;
}

function getAdminDb() {
  if (!adminDbInstance) {
    initializeAdmin();
    adminDbInstance = getFirestore();
  }
  return adminDbInstance;
}

// 実行時にのみ初期化される（ビルド時にはエラーが発生しない）
export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop) {
    return getAdminAuth()[prop as keyof ReturnType<typeof getAuth>];
  }
});

export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_target, prop) {
    return getAdminDb()[prop as keyof ReturnType<typeof getFirestore>];
  }
});