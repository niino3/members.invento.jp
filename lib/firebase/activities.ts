import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './config';
import { Activity, ActivityFirestore, ActivityType } from '@/types/activity';

const COLLECTION_NAME = 'activities';

// FirestoreドキュメントをActivity型に変換
export function convertFirestoreToActivity(
  doc: QueryDocumentSnapshot,
  data: ActivityFirestore
): Activity {
  return {
    id: doc.id,
    type: data.type,
    entityId: data.entityId,
    entityName: data.entityName,
    userId: data.userId,
    userName: data.userName,
    createdAt: data.createdAt?.toDate() || new Date(),
    metadata: data.metadata,
  };
}

// 活動を記録
export async function logActivity(
  type: ActivityType,
  entityId: string,
  entityName: string,
  userId: string,
  userName: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await addDoc(collection(db, COLLECTION_NAME), {
      type,
      entityId,
      entityName,
      userId,
      userName,
      createdAt: serverTimestamp(),
      metadata,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // 活動ログの失敗は重要な操作を妨げないようにエラーを投げない
  }
}

// 最近の活動を取得
export async function getRecentActivities(limitCount: number = 10): Promise<Activity[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const activities: Activity[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as ActivityFirestore;
      activities.push(convertFirestoreToActivity(doc, data));
    });

    return activities;
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return [];
  }
}

// 特定の期間の活動を取得
export async function getActivitiesByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Activity[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const activities: Activity[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as ActivityFirestore;
      activities.push(convertFirestoreToActivity(doc, data));
    });

    return activities;
  } catch (error) {
    console.error('Failed to fetch activities by date range:', error);
    return [];
  }
}

// 活動タイプのラベルを取得
export function getActivityLabel(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    customer_created: '新規顧客登録',
    customer_updated: '顧客情報更新',
    service_created: '新規サービス追加',
    service_updated: 'サービス更新',
    service_log_created: 'サービスログ追加',
    inquiry_created: '新規問い合わせ',
    inquiry_resolved: '問い合わせ対応完了',
  };

  return labels[type] || type;
}

// 活動タイプのアイコンを取得
export function getActivityIcon(type: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    customer_created: '👤',
    customer_updated: '✏️',
    service_created: '⚙️',
    service_updated: '🔧',
    service_log_created: '📝',
    inquiry_created: '📧',
    inquiry_resolved: '✅',
  };

  return icons[type] || '📌';
}

// 活動メッセージを生成
export function formatActivityMessage(activity: Activity): string {
  switch (activity.type) {
    case 'customer_created':
      return `新規顧客「${activity.entityName}」が登録されました`;
    case 'customer_updated':
      return `顧客「${activity.entityName}」の情報が更新されました`;
    case 'service_created':
      return `新規サービス「${activity.entityName}」が追加されました`;
    case 'service_updated':
      return `サービス「${activity.entityName}」が更新されました`;
    case 'service_log_created':
      return `サービスログが追加されました（${activity.entityName}）`;
    case 'inquiry_created':
      return `新規問い合わせ「${activity.entityName}」が追加されました`;
    case 'inquiry_resolved':
      return `問い合わせ「${activity.entityName}」が対応完了になりました`;
    default:
      return `${activity.entityName}に関する活動`;
  }
}
