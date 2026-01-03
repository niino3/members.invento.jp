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
import { ShippingCost, CreateShippingCostInput, UpdateShippingCostInput } from '@/types/shippingCost';

const COLLECTION_NAME = 'shippingCosts';

// Firestoreデータを型安全なShippingCostオブジェクトに変換
export const convertToShippingCost = (doc: DocumentSnapshot): ShippingCost | null => {
  if (!doc.exists()) return null;

  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    price: data.price || 0,
    description: data.description,
    displayOrder: data.displayOrder || 0,
    isActive: data.isActive !== false, // デフォルトはtrue
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
  };
};

// 郵送料を作成
export const createShippingCost = async (
  costData: CreateShippingCostInput,
  userId: string
): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...costData,
    isActive: costData.isActive !== false, // デフォルトはtrue
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    updatedBy: userId,
  });
  return docRef.id;
};

// 郵送料を取得
export const getShippingCost = async (costId: string): Promise<ShippingCost | null> => {
  const docRef = doc(db, COLLECTION_NAME, costId);
  const docSnap = await getDoc(docRef);
  return convertToShippingCost(docSnap);
};

// 郵送料リストを取得
export const getShippingCosts = async (
  onlyActive = true,
  limitCount = 50,
  lastDoc?: DocumentSnapshot
): Promise<{ costs: ShippingCost[]; lastDoc?: DocumentSnapshot }> => {
  let q = query(
    collection(db, COLLECTION_NAME),
    orderBy('displayOrder', 'asc'),
    limit(limitCount)
  );

  if (onlyActive) {
    q = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', true),
      orderBy('displayOrder', 'asc'),
      limit(limitCount)
    );
  }

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const querySnapshot = await getDocs(q);
  const costs: ShippingCost[] = [];

  querySnapshot.forEach((doc) => {
    const cost = convertToShippingCost(doc);
    if (cost) costs.push(cost);
  });

  const newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

  return {
    costs,
    lastDoc: newLastDoc,
  };
};

// 郵送料を更新
export const updateShippingCost = async (
  costId: string,
  costData: UpdateShippingCostInput,
  userId: string
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, costId);

  await updateDoc(docRef, {
    ...costData,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
};

// 郵送料を削除
export const deleteShippingCost = async (costId: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, costId);
  await deleteDoc(docRef);
};

// 表示順序で郵送料を取得（アクティブのみ）
export const getActiveShippingCostsOrderedByDisplay = async (): Promise<ShippingCost[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('isActive', '==', true),
    orderBy('displayOrder', 'asc')
  );

  const querySnapshot = await getDocs(q);
  const costs: ShippingCost[] = [];

  querySnapshot.forEach((doc) => {
    const cost = convertToShippingCost(doc);
    if (cost) costs.push(cost);
  });

  return costs;
};
