import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// ビルド時かどうかを判定
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                     process.env.NEXT_PHASE === 'phase-development-build';

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

// ビルド時には初期化をスキップ（実行時のみ初期化）
if (!isBuildTime && getApps().length === 0) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  if (privateKey && clientEmail && projectId) {
    try {
      initializeAdmin();
    } catch (error) {
      // 初期化エラーは無視（実行時に再試行される）
    }
  }
}

// 実行時にのみ初期化される（ビルド時にはエラーが発生しない）
// Proxyを使用して、実際に使用される時のみ初期化
export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop) {
    if (isBuildTime) {
      // ビルド時には何もしない
      return () => {};
    }
    const auth = getAdminAuth();
    const value = auth[prop as keyof ReturnType<typeof getAuth>];
    if (typeof value === 'function') {
      return value.bind(auth);
    }
    return value;
  }
});

export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_target, prop) {
    if (isBuildTime) {
      // ビルド時には何もしない
      return () => {};
    }
    const db = getAdminDb();
    const value = db[prop as keyof ReturnType<typeof getFirestore>];
    if (typeof value === 'function') {
      return value.bind(db);
    }
    return value;
  }
});