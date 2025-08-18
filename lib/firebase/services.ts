import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  DocumentSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Service, CreateServiceInput, UpdateServiceInput } from '@/types/service';

const COLLECTION_NAME = 'services';

// Firestoreデータを型安全なServiceオブジェクトに変換
export const convertToService = (doc: DocumentSnapshot): Service | null => {
  if (!doc.exists()) return null;
  
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    price: data.price,
    currency: data.currency || 'JPY',
    billingCycle: data.billingCycle,
    isActive: data.isActive || true,
    features: data.features || [],
    categoryId: data.categoryId || '', // 新しいcategoryIdフィールド
    category: data.category, // 下位互換のため残す
    logEnabled: data.logEnabled || false, // サービスログ記録フラグ
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
  };
};

// サービスを作成
export const createService = async (
  serviceData: CreateServiceInput,
  userId: string
): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...serviceData,
    currency: serviceData.currency || 'JPY',
    isActive: serviceData.isActive !== undefined ? serviceData.isActive : true,
    features: serviceData.features || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    updatedBy: userId,
  });
  return docRef.id;
};

// サービスを取得
export const getService = async (serviceId: string): Promise<Service | null> => {
  const docRef = doc(db, COLLECTION_NAME, serviceId);
  const docSnap = await getDoc(docRef);
  return convertToService(docSnap);
};

// サービスリストを取得
export const getServices = async (activeOnly = false): Promise<Service[]> => {
  let q = query(
    collection(db, COLLECTION_NAME),
    orderBy('name')
  );

  if (activeOnly) {
    q = query(q, where('isActive', '==', true));
  }

  const querySnapshot = await getDocs(q);
  const services: Service[] = [];
  
  querySnapshot.forEach((doc) => {
    const service = convertToService(doc);
    if (service) services.push(service);
  });

  return services;
};

// 複数のサービスを取得
export const getServicesByIds = async (serviceIds: string[]): Promise<Service[]> => {
  if (serviceIds.length === 0) return [];
  
  const services: Service[] = [];
  
  // Firestoreのin演算子は最大10個まで
  const chunks = [];
  for (let i = 0; i < serviceIds.length; i += 10) {
    chunks.push(serviceIds.slice(i, i + 10));
  }
  
  for (const chunk of chunks) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('__name__', 'in', chunk)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      const service = convertToService(doc);
      if (service) services.push(service);
    });
  }
  
  return services;
};

// サービスを更新
export const updateService = async (
  serviceData: UpdateServiceInput,
  userId: string
): Promise<void> => {
  const { id, ...updateData } = serviceData;
  const docRef = doc(db, COLLECTION_NAME, id);
  
  await updateDoc(docRef, {
    ...updateData,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
};

// サービスを削除
export const deleteService = async (serviceId: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, serviceId);
  await deleteDoc(docRef);
};

// カテゴリ別サービス取得（古いcategoryフィールド用 - 下位互換）
export const getServicesByCategory = async (category: string): Promise<Service[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('category', '==', category),
    where('isActive', '==', true),
    orderBy('name')
  );

  const querySnapshot = await getDocs(q);
  const services: Service[] = [];
  
  querySnapshot.forEach((doc) => {
    const service = convertToService(doc);
    if (service) services.push(service);
  });

  return services;
};

// カテゴリーID別サービス取得（新しいcategoryIdフィールド用）
export const getServicesByCategoryId = async (categoryId: string): Promise<Service[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('categoryId', '==', categoryId),
    where('isActive', '==', true),
    orderBy('name')
  );

  const querySnapshot = await getDocs(q);
  const services: Service[] = [];
  
  querySnapshot.forEach((doc) => {
    const service = convertToService(doc);
    if (service) services.push(service);
  });

  return services;
};