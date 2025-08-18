import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, deleteObject, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';
import {
  ServiceLog,
  ServiceLogFirestore,
  CreateServiceLogInput,
  UpdateServiceLogInput,
  ServiceLogSearchParams,
  ServiceLogListResponse,
  ServiceLogImage,
  ServiceLogStats,
} from '@/types/serviceLog';

const COLLECTION_NAME = 'serviceLogs';
const STORAGE_PATH = 'service-logs';

// FirestoreドキュメントをServiceLog型に変換
export function convertFirestoreToServiceLog(
  doc: QueryDocumentSnapshot,
  data: ServiceLogFirestore
): ServiceLog {
  return {
    id: doc.id,
    serviceId: data.serviceId,
    customerId: data.customerId,
    workDate: data.workDate?.toDate() || new Date(),
    workerId: data.workerId,
    workerName: data.workerName,
    comment: data.comment,
    images: data.images?.map(img => ({
      ...img,
      uploadedAt: img.uploadedAt?.toDate() || new Date(),
    })) || [],
    status: data.status,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

// ServiceLogをFirestoreドキュメント用に変換
export function convertServiceLogToFirestore(serviceLog: Omit<ServiceLog, 'id'>): ServiceLogFirestore {
  return {
    serviceId: serviceLog.serviceId,
    customerId: serviceLog.customerId,
    workDate: Timestamp.fromDate(serviceLog.workDate),
    workerId: serviceLog.workerId,
    workerName: serviceLog.workerName,
    comment: serviceLog.comment,
    images: serviceLog.images.map(img => ({
      ...img,
      uploadedAt: Timestamp.fromDate(img.uploadedAt),
    })),
    status: serviceLog.status,
    createdAt: Timestamp.fromDate(serviceLog.createdAt),
    updatedAt: Timestamp.fromDate(serviceLog.updatedAt),
  };
}

// 画像をFirebase Storageにアップロード
export async function uploadServiceLogImage(
  serviceLogId: string,
  file: File,
  imageId: string
): Promise<ServiceLogImage> {
  try {
    const filename = `${imageId}_${file.name}`;
    const imagePath = `${STORAGE_PATH}/${serviceLogId}/${filename}`;
    const imageRef = ref(storage, imagePath);

    const snapshot = await uploadBytes(imageRef, file);
    const url = await getDownloadURL(snapshot.ref);

    return {
      id: imageId,
      url,
      filename,
      size: file.size,
      uploadedAt: new Date(),
    };
  } catch (error) {
    console.error('Error uploading service log image:', error);
    throw new Error('画像のアップロードに失敗しました');
  }
}

// 画像をFirebase Storageから削除
export async function deleteServiceLogImage(serviceLogId: string, image: ServiceLogImage): Promise<void> {
  try {
    const imagePath = `${STORAGE_PATH}/${serviceLogId}/${image.filename}`;
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting service log image:', error);
    // 画像削除の失敗は致命的ではないため、エラーを投げない
  }
}

// サービスログを作成
export async function createServiceLog(
  input: CreateServiceLogInput,
  workerId: string,
  workerName: string
): Promise<string> {
  try {
    const now = new Date();
    const serviceLogData: ServiceLogFirestore = {
      serviceId: input.serviceId,
      customerId: input.customerId,
      workDate: Timestamp.fromDate(input.workDate),
      workerId,
      workerName,
      comment: input.comment,
      images: [],
      status: input.status,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), serviceLogData);

    // 画像がある場合はアップロード
    if (input.images && input.images.length > 0) {
      const uploadedImages: ServiceLogImage[] = [];
      
      for (const file of input.images) {
        const imageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const uploadedImage = await uploadServiceLogImage(docRef.id, file, imageId);
        uploadedImages.push(uploadedImage);
      }

      // アップロードした画像情報をドキュメントに追加
      await updateDoc(docRef, {
        images: uploadedImages.map(img => ({
          ...img,
          uploadedAt: Timestamp.fromDate(img.uploadedAt),
        })),
        updatedAt: serverTimestamp(),
      });
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating service log:', error);
    throw new Error('サービスログの作成に失敗しました');
  }
}

// サービスログを取得
export async function getServiceLog(id: string): Promise<ServiceLog | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data() as ServiceLogFirestore;
    return convertFirestoreToServiceLog(docSnap as QueryDocumentSnapshot, data);
  } catch (error) {
    console.error('Error getting service log:', error);
    throw new Error('サービスログの取得に失敗しました');
  }
}

// サービスログ一覧を取得（検索・フィルター対応）
export async function getServiceLogs(params: ServiceLogSearchParams = {}): Promise<ServiceLogListResponse> {
  try {
    let q = query(collection(db, COLLECTION_NAME));

    // フィルター条件を追加
    if (params.customerId) {
      q = query(q, where('customerId', '==', params.customerId));
    }
    if (params.serviceId) {
      q = query(q, where('serviceId', '==', params.serviceId));
    }
    if (params.workerId) {
      q = query(q, where('workerId', '==', params.workerId));
    }
    if (params.status) {
      q = query(q, where('status', '==', params.status));
    }
    if (params.startDate) {
      q = query(q, where('workDate', '>=', Timestamp.fromDate(params.startDate)));
    }
    if (params.endDate) {
      q = query(q, where('workDate', '<=', Timestamp.fromDate(params.endDate)));
    }

    // ソートとページネーション
    q = query(q, orderBy('workDate', 'desc'));
    
    if (params.limit) {
      q = query(q, limit(params.limit + 1)); // +1で次のページがあるかチェック
    }

    const querySnapshot = await getDocs(q);
    const logs: ServiceLog[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as ServiceLogFirestore;
      logs.push(convertFirestoreToServiceLog(doc, data));
    });

    // キーワード検索（クライアントサイドで実行）
    let filteredLogs = logs;
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      filteredLogs = logs.filter(log =>
        log.comment.toLowerCase().includes(keyword) ||
        log.workerName.toLowerCase().includes(keyword)
      );
    }

    // ページネーション処理
    const hasMore = params.limit ? filteredLogs.length > params.limit : false;
    if (hasMore && params.limit) {
      filteredLogs = filteredLogs.slice(0, params.limit);
    }

    return {
      logs: filteredLogs,
      total: filteredLogs.length,
      hasMore,
    };
  } catch (error) {
    console.error('Error getting service logs:', error);
    throw new Error('サービスログ一覧の取得に失敗しました');
  }
}

// サービスログを更新
export async function updateServiceLog(
  id: string,
  input: UpdateServiceLogInput
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (input.workDate) updateData.workDate = Timestamp.fromDate(input.workDate);
    if (input.comment !== undefined) updateData.comment = input.comment;
    if (input.status) updateData.status = input.status;

    // 既存の画像情報を取得
    const existingDoc = await getDoc(docRef);
    if (!existingDoc.exists()) {
      throw new Error('サービスログが見つかりません');
    }
    
    const existingData = existingDoc.data() as ServiceLogFirestore;
    let currentImages = existingData.images || [];

    // 削除する画像を処理
    if (input.removeImageIds && input.removeImageIds.length > 0) {
      const imagesToRemove = currentImages.filter(img => input.removeImageIds!.includes(img.id));
      
      // Storageから削除
      for (const image of imagesToRemove) {
        await deleteServiceLogImage(id, {
          ...image,
          uploadedAt: image.uploadedAt?.toDate() || new Date(),
        });
      }
      
      // 配列から削除
      currentImages = currentImages.filter(img => !input.removeImageIds!.includes(img.id));
    }

    // 新しい画像をアップロード
    if (input.images && input.images.length > 0) {
      for (const file of input.images) {
        const imageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const uploadedImage = await uploadServiceLogImage(id, file, imageId);
        currentImages.push({
          ...uploadedImage,
          uploadedAt: Timestamp.fromDate(uploadedImage.uploadedAt),
        });
      }
    }

    updateData.images = currentImages;

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating service log:', error);
    throw new Error('サービスログの更新に失敗しました');
  }
}

// サービスログを削除
export async function deleteServiceLog(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // 関連する画像を削除
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as ServiceLogFirestore;
      if (data.images && data.images.length > 0) {
        for (const image of data.images) {
          await deleteServiceLogImage(id, {
            ...image,
            uploadedAt: image.uploadedAt?.toDate() || new Date(),
          });
        }
      }
    }

    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting service log:', error);
    throw new Error('サービスログの削除に失敗しました');
  }
}

// 顧客のサービスログを取得
export async function getServiceLogsByCustomer(
  customerId: string,
  params: Omit<ServiceLogSearchParams, 'customerId'> = {}
): Promise<ServiceLogListResponse> {
  return getServiceLogs({
    ...params,
    customerId,
    status: 'published', // 顧客は公開されたログのみ閲覧可能
  });
}

// サービスログの統計情報を取得
export async function getServiceLogStats(
  customerId?: string,
  serviceId?: string
): Promise<ServiceLogStats> {
  try {
    const params: ServiceLogSearchParams = {};
    if (customerId) params.customerId = customerId;
    if (serviceId) params.serviceId = serviceId;

    const response = await getServiceLogs(params);
    const logs = response.logs;

    const stats: ServiceLogStats = {
      totalLogs: logs.length,
      publishedLogs: logs.filter(log => log.status === 'published').length,
      draftLogs: logs.filter(log => log.status === 'draft').length,
      totalImages: logs.reduce((total, log) => total + log.images.length, 0),
    };

    if (logs.length > 0) {
      stats.lastLogDate = logs[0].workDate; // 最新のログ（workDateでソート済み）
    }

    return stats;
  } catch (error) {
    console.error('Error getting service log stats:', error);
    throw new Error('サービスログ統計の取得に失敗しました');
  }
}