import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Customer, CreateCustomerInput, UpdateCustomerInput } from '@/types/customer';
import { logActivity } from './activities';
import { auth } from './config';

const COLLECTION_NAME = 'customers';

// Firestoreデータを型安全なCustomerオブジェクトに変換
export const convertToCustomer = (doc: DocumentSnapshot): Customer | null => {
  if (!doc.exists()) return null;
  
  const data = doc.data();
  return {
    id: doc.id,
    companyType: data.companyType,
    companyName: data.companyName,
    companyNameKana: data.companyNameKana,
    contactName: data.contactName,
    postalCode: data.postalCode,
    address1: data.address1,
    address2: data.address2,
    forwardingPostalCode: data.forwardingPostalCode,
    forwardingAddress1: data.forwardingAddress1,
    forwardingAddress2: data.forwardingAddress2,
    phoneNumber: data.phoneNumber,
    email: data.email,
    contractStartDate: data.contractStartDate?.toDate(),
    contractEndDate: data.contractEndDate?.toDate(),
    contractStatus: data.contractStatus || 'active', // デフォルトはactive
    paymentMethod: data.paymentMethod,
    dedicatedPhoneNumber: data.dedicatedPhoneNumber,
    dedicatedPhoneForwardingNumber: data.dedicatedPhoneForwardingNumber,
    invoiceRequired: data.invoiceRequired || false,
    invoiceDeliveryMethod: data.invoiceDeliveryMethod,
    serviceIds: data.serviceIds || [],
    notes: data.notes,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
  };
};

// 顧客を作成
export const createCustomer = async (
  customerData: CreateCustomerInput,
  userId: string,
  userName: string = '管理者'
): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...customerData,
    contractStartDate: customerData.contractStartDate || null,
    contractEndDate: customerData.contractEndDate || null,
    contractStatus: customerData.contractStatus || 'active', // デフォルトはactive
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    updatedBy: userId,
  });
  
  // 活動を記録
  await logActivity(
    'customer_created',
    docRef.id,
    customerData.companyName,
    userId,
    userName
  );
  
  return docRef.id;
};

// 顧客を取得
export const getCustomer = async (customerId: string): Promise<Customer | null> => {
  const docRef = doc(db, COLLECTION_NAME, customerId);
  const docSnap = await getDoc(docRef);
  return convertToCustomer(docSnap);
};

// 顧客リストを取得
export const getCustomers = async (
  limitCount = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ customers: Customer[]; lastDoc?: DocumentSnapshot }> => {
  let q = query(
    collection(db, COLLECTION_NAME),
    orderBy('updatedAt', 'desc'),
    limit(limitCount)
  );

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const querySnapshot = await getDocs(q);
  const customers: Customer[] = [];
  
  querySnapshot.forEach((doc) => {
    const customer = convertToCustomer(doc);
    if (customer) customers.push(customer);
  });

  const newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

  return {
    customers,
    lastDoc: newLastDoc,
  };
};

// 顧客を検索
export const searchCustomers = async (searchTerm: string): Promise<Customer[]> => {
  // Firestoreでは部分一致検索が制限されているため、
  // 実際のプロダクションではAlgoliaやElasticsearchを使用することを推奨
  const q = query(
    collection(db, COLLECTION_NAME),
    where('companyName', '>=', searchTerm),
    where('companyName', '<=', searchTerm + '\uf8ff'),
    orderBy('companyName'),
    limit(50)
  );

  const querySnapshot = await getDocs(q);
  const customers: Customer[] = [];
  
  querySnapshot.forEach((doc) => {
    const customer = convertToCustomer(doc);
    if (customer) customers.push(customer);
  });

  return customers;
};

// 顧客を更新
export const updateCustomer = async (
  customerId: string,
  customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  userId: string = 'system',
  userName: string = '管理者'
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, customerId);
  
  await updateDoc(docRef, {
    ...customerData,
    contractStartDate: customerData.contractStartDate || null,
    contractEndDate: customerData.contractEndDate || null,
    contractStatus: customerData.contractStatus || 'active',
    updatedAt: serverTimestamp(),
    updatedBy: userId || 'system',
  });
  
  // 活動を記録
  await logActivity(
    'customer_updated',
    customerId,
    customerData.companyName,
    userId,
    userName
  );
};

// 顧客を解約（契約状態をcancelledに変更）
export const cancelCustomer = async (customerId: string, userId?: string): Promise<void> => {
  // 1. 顧客情報を取得してメールアドレスを確認
  const customer = await getCustomer(customerId);
  
  // 2. Firestoreの契約状態を更新
  const docRef = doc(db, COLLECTION_NAME, customerId);
  await updateDoc(docRef, {
    contractStatus: 'cancelled',
    contractEndDate: new Date(),
    updatedAt: serverTimestamp(),
    updatedBy: userId || 'system',
  });

  // 3. ユーザーアカウントがある場合は無効化
  if (customer?.email) {
    try {
      const response = await fetch('/api/disable-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customer.email,
          disabled: true
        }),
      });

      if (!response.ok) {
        console.warn('Failed to disable user account:', await response.text());
      }
    } catch (error) {
      console.warn('Error disabling user account:', error);
      // Authentication無効化が失敗してもFirestore更新は成功させる
    }
  }
};

// 顧客を再有効化（契約状態をactiveに変更しユーザーアカウントも有効化）
export const reactivateCustomer = async (customerId: string, userId?: string): Promise<void> => {
  // 1. 顧客情報を取得してメールアドレスを確認
  const customer = await getCustomer(customerId);
  
  // 2. Firestoreの契約状態を更新
  const docRef = doc(db, COLLECTION_NAME, customerId);
  await updateDoc(docRef, {
    contractStatus: 'active',
    contractEndDate: null,
    updatedAt: serverTimestamp(),
    updatedBy: userId || 'system',
  });

  // 3. ユーザーアカウントがある場合は有効化
  if (customer?.email) {
    try {
      const response = await fetch('/api/disable-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customer.email,
          disabled: false
        }),
      });

      if (!response.ok) {
        console.warn('Failed to enable user account:', await response.text());
      }
    } catch (error) {
      console.warn('Error enabling user account:', error);
    }
  }
};

// サービスIDで顧客を検索
export const getCustomersByServiceId = async (serviceId: string): Promise<Customer[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('serviceIds', 'array-contains', serviceId)
  );

  const querySnapshot = await getDocs(q);
  const customers: Customer[] = [];
  
  querySnapshot.forEach((doc) => {
    const customer = convertToCustomer(doc);
    if (customer) customers.push(customer);
  });

  return customers;
};

// ユーザーIDから顧客情報を取得
export const getCustomerByUserId = async (userId: string): Promise<Customer | null> => {
  try {
    // usersコレクションからcustomerIdを取得
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      console.log('User document does not exist:', userId);
      return null;
    }
    
    const userData = userDocSnap.data();
    const customerId = userData?.customerId;
    
    if (!customerId) {
      console.log('User does not have customerId:', userId);
      return null;
    }
    
    // customersコレクションから顧客情報を取得
    return await getCustomer(customerId);
  } catch (error) {
    console.error('Error fetching customer by user ID:', error);
    throw new Error('顧客情報の取得に失敗しました');
  }
};