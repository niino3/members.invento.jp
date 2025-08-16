import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { ServiceCategory, CreateServiceCategoryInput, UpdateServiceCategoryInput } from '@/types/serviceCategory';

const COLLECTION_NAME = 'serviceCategories';

// Firestoreデータを型安全なServiceCategoryオブジェクトに変換
export const convertToServiceCategory = (doc: DocumentSnapshot): ServiceCategory | null => {
  if (!doc.exists()) return null;
  
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    displayOrder: data.displayOrder || 0,
    isActive: data.isActive !== false, // デフォルトはtrue
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
  };
};

// サービスカテゴリーを作成
export const createServiceCategory = async (
  categoryData: CreateServiceCategoryInput,
  userId: string
): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...categoryData,
    isActive: categoryData.isActive !== false, // デフォルトはtrue
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    updatedBy: userId,
  });
  return docRef.id;
};

// サービスカテゴリーを取得
export const getServiceCategory = async (categoryId: string): Promise<ServiceCategory | null> => {
  const docRef = doc(db, COLLECTION_NAME, categoryId);
  const docSnap = await getDoc(docRef);
  return convertToServiceCategory(docSnap);
};

// サービスカテゴリーリストを取得
export const getServiceCategories = async (
  onlyActive = true,
  limitCount = 50,
  lastDoc?: DocumentSnapshot
): Promise<{ categories: ServiceCategory[]; lastDoc?: DocumentSnapshot }> => {
  let q = query(
    collection(db, COLLECTION_NAME),
    orderBy('displayOrder', 'asc'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  if (onlyActive) {
    q = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', true),
      orderBy('displayOrder', 'asc'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
  }

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const querySnapshot = await getDocs(q);
  const categories: ServiceCategory[] = [];
  
  querySnapshot.forEach((doc) => {
    const category = convertToServiceCategory(doc);
    if (category) categories.push(category);
  });

  const newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

  return {
    categories,
    lastDoc: newLastDoc,
  };
};

// サービスカテゴリーを検索
export const searchServiceCategories = async (searchTerm: string): Promise<ServiceCategory[]> => {
  // Firestoreでは部分一致検索が制限されているため、
  // 実際のプロダクションではAlgoliaやElasticsearchを使用することを推奨
  const q = query(
    collection(db, COLLECTION_NAME),
    where('name', '>=', searchTerm),
    where('name', '<=', searchTerm + '\uf8ff'),
    orderBy('name'),
    limit(50)
  );

  const querySnapshot = await getDocs(q);
  const categories: ServiceCategory[] = [];
  
  querySnapshot.forEach((doc) => {
    const category = convertToServiceCategory(doc);
    if (category) categories.push(category);
  });

  return categories;
};

// サービスカテゴリーを更新
export const updateServiceCategory = async (
  categoryId: string,
  categoryData: UpdateServiceCategoryInput,
  userId: string
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, categoryId);
  
  await updateDoc(docRef, {
    ...categoryData,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
};

// サービスカテゴリーを削除
export const deleteServiceCategory = async (categoryId: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, categoryId);
  await deleteDoc(docRef);
};

// 表示順序でサービスカテゴリーを取得（アクティブのみ）
export const getActiveServiceCategoriesOrderedByDisplay = async (): Promise<ServiceCategory[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('isActive', '==', true),
    orderBy('displayOrder', 'asc'),
    orderBy('name', 'asc')
  );

  const querySnapshot = await getDocs(q);
  const categories: ServiceCategory[] = [];
  
  querySnapshot.forEach((doc) => {
    const category = convertToServiceCategory(doc);
    if (category) categories.push(category);
  });

  return categories;
};