/**
 * MoneyForward クラウド請求書 API クライアント
 * - OAuth トークン管理（Firestore に保存）
 * - レート制限（1秒3リクエスト）
 * - 自動リフレッシュ
 */

const MF_AUTH_BASE = 'https://api.biz.moneyforward.com';
const MF_INVOICE_BASE = 'https://invoice.moneyforward.com';

// レート制限用
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 340; // 1秒3リクエスト = 約333ms間隔

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

// --- Firebase Admin 初期化 ---

async function getFirebaseAdmin() {
  const admin = await import('firebase-admin');
  if (!admin.default.apps.length) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!privateKey || !clientEmail || !projectId) {
      throw new Error('Firebase Admin SDK環境変数が設定されていません');
    }

    admin.default.initializeApp({
      credential: admin.default.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
  return admin.default;
}

// --- トークン管理 ---

interface MFToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (ms)
}

/**
 * Firestore からトークンを取得
 */
export async function getMFToken(): Promise<MFToken | null> {
  const admin = await getFirebaseAdmin();
  const db = admin.firestore();
  const doc = await db.collection('settings').doc('moneyforward').get();

  if (!doc.exists) return null;

  const data = doc.data();
  return {
    accessToken: data?.accessToken,
    refreshToken: data?.refreshToken,
    expiresAt: data?.expiresAt,
  };
}

/**
 * Firestore にトークンを保存
 */
export async function saveMFToken(token: MFToken): Promise<void> {
  const admin = await getFirebaseAdmin();
  const db = admin.firestore();
  await db.collection('settings').doc('moneyforward').set({
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: token.expiresAt,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

/**
 * CLIENT_SECRET_BASIC 方式の認証ヘッダーを生成
 */
function getBasicAuthHeader(): string {
  const clientId = process.env.MF_CLIENT_ID!;
  const clientSecret = process.env.MF_CLIENT_SECRET!;
  return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

/**
 * 認可コードからアクセストークンを取得
 */
export async function exchangeCodeForToken(code: string): Promise<MFToken> {
  const response = await fetch(`${MF_AUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Authorization': getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.MF_REDIRECT_URI!,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${error}`);
  }

  const data = await response.json();

  const token: MFToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  await saveMFToken(token);
  return token;
}

/**
 * リフレッシュトークンでアクセストークンを更新
 */
export async function refreshAccessToken(refreshToken: string): Promise<MFToken> {
  const response = await fetch(`${MF_AUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Authorization': getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${error}`);
  }

  const data = await response.json();

  const token: MFToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  await saveMFToken(token);
  return token;
}

/**
 * 有効なアクセストークンを取得（期限切れなら自動リフレッシュ）
 */
export async function getValidAccessToken(): Promise<string> {
  const token = await getMFToken();
  if (!token) {
    throw new Error('MF token not found. Please authenticate first at /api/moneyforward/auth');
  }

  // 期限の5分前にリフレッシュ
  if (Date.now() > token.expiresAt - 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(token.refreshToken);
    return refreshed.accessToken;
  }

  return token.accessToken;
}

// --- API リクエスト ---

/**
 * MF クラウド請求書 API にリクエストを送信
 * レート制限と自動リフレッシュ付き
 */
export async function mfApiRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  await rateLimit();

  const accessToken = await getValidAccessToken();

  const response = await fetch(`${MF_INVOICE_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // 401 → トークンリフレッシュしてリトライ
  if (response.status === 401) {
    const token = await getMFToken();
    if (token) {
      const refreshed = await refreshAccessToken(token.refreshToken);
      await rateLimit();
      return fetch(`${MF_INVOICE_BASE}${path}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${refreshed.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    }
  }

  // 429 → レート制限、少し待ってリトライ
  if (response.status === 429) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return mfApiRequest(path, options);
  }

  return response;
}

// --- 便利メソッド ---

/**
 * MF 取引先一覧を取得
 */
export async function getPartners() {
  const response = await mfApiRequest('/api/v3/partners');
  if (!response.ok) {
    throw new Error(`Failed to get partners: ${response.status}`);
  }
  return response.json();
}

/**
 * MF 請求書を作成
 */
export async function createBilling(billingData: {
  department_id: string;
  billing_date: string;
  due_date: string;
  sales_date: string;
  title: string;
  payment_condition?: string;
  note?: string;
  items: {
    name: string;
    price: number;
    quantity: number;
    excise: string;
  }[];
}) {
  // undefined のフィールドを除去
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(billingData)) {
    if (value !== undefined) cleanData[key] = value;
  }

  const response = await mfApiRequest('/api/v3/invoice_template_billings', {
    method: 'POST',
    body: JSON.stringify(cleanData),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create billing: ${response.status} ${error}`);
  }
  return response.json();
}

/**
 * OAuth 認可URLを生成
 */
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.MF_CLIENT_ID!,
    redirect_uri: process.env.MF_REDIRECT_URI!,
    scope: 'mfc/invoice/data.read mfc/invoice/data.write',
    state,
  });
  return `${MF_AUTH_BASE}/authorize?${params.toString()}`;
}
