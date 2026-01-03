// サービスログの状態
export type ServiceLogStatus = 'draft' | 'published';

// サービスログの画像情報
export interface ServiceLogImage {
  id: string;
  url: string;
  filename: string;
  size: number;
  uploadedAt: Date;
}

// サービスログの作成・更新用の入力データ
export interface CreateServiceLogInput {
  serviceId: string;
  customerId: string;
  workDate: Date;
  comment: string;
  images?: File[]; // アップロード用
  status: ServiceLogStatus;
  shippingCostId?: string; // 郵送料ID（オプション）
}

export interface UpdateServiceLogInput {
  workDate?: Date;
  comment?: string;
  images?: File[]; // 新規追加画像
  removeImageIds?: string[]; // 削除する画像のID
  status?: ServiceLogStatus;
  shippingCostId?: string; // 郵送料ID（オプション）
}

// サービスログのメイン型
export interface ServiceLog {
  id: string;
  serviceId: string;
  customerId: string;
  workDate: Date;
  workerId: string; // 作業者（管理者）のUID
  workerName: string; // 作業者の表示名
  comment: string;
  images: ServiceLogImage[];
  status: ServiceLogStatus;
  shippingCostId?: string; // 郵送料ID（オプション）
  createdAt: Date;
  updatedAt: Date;
}

// サービスログの検索・フィルター用パラメータ
export interface ServiceLogSearchParams {
  customerId?: string;
  serviceId?: string;
  workerId?: string;
  status?: ServiceLogStatus;
  startDate?: Date;
  endDate?: Date;
  keyword?: string; // コメント内の検索
  limit?: number;
  offset?: number;
}

// サービスログの統計情報
export interface ServiceLogStats {
  totalLogs: number;
  publishedLogs: number;
  draftLogs: number;
  totalImages: number;
  lastLogDate?: Date;
}

// API レスポンス用の型
export interface ServiceLogListResponse {
  logs: ServiceLog[];
  total: number;
  hasMore: boolean;
}

export interface ServiceLogResponse {
  log: ServiceLog;
}

// Firestoreドキュメント変換用の型
export interface ServiceLogFirestore {
  serviceId: string;
  customerId: string;
  workDate: any; // Firestore Timestamp
  workerId: string;
  workerName: string;
  comment: string;
  images: {
    id: string;
    url: string;
    filename: string;
    size: number;
    uploadedAt: any; // Firestore Timestamp
  }[];
  status: ServiceLogStatus;
  shippingCostId?: string; // 郵送料ID（オプション）
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}