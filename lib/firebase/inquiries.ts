import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  startAfter
} from 'firebase/firestore';
import { db } from './config';
import { Inquiry, InquiryStatus } from '@/types/inquiry';

const COLLECTION_NAME = 'inquiries';

// Firestore document to Inquiry object conversion
const docToInquiry = (doc: QueryDocumentSnapshot<DocumentData>): Inquiry => {
  const data = doc.data();
  return {
    id: doc.id,
    customerId: data.customerId,
    customerEmail: data.customerEmail,
    customerName: data.customerName,
    companyName: data.companyName,
    category: data.category,
    subject: data.subject,
    content: data.content,
    status: data.status,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    resolvedAt: data.resolvedAt?.toDate(),
  };
};

// Create a new inquiry
export const createInquiry = async (
  inquiryData: Omit<Inquiry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...inquiryData,
      resolvedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('Inquiry created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating inquiry:', error);
    throw error;
  }
};

// Get a single inquiry by ID
export const getInquiry = async (inquiryId: string): Promise<Inquiry | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, inquiryId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docToInquiry(docSnap as QueryDocumentSnapshot<DocumentData>);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting inquiry:', error);
    throw error;
  }
};

// Get inquiries by customer ID
export const getInquiriesByCustomer = async (
  customerId: string,
  limitCount = 50
): Promise<Inquiry[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToInquiry);
  } catch (error) {
    console.error('Error getting customer inquiries:', error);
    throw error;
  }
};

// Get all inquiries (for admin)
export const getAllInquiries = async (
  status?: InquiryStatus,
  limitCount = 50,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ inquiries: Inquiry[]; lastDoc: QueryDocumentSnapshot | null }> => {
  try {
    let q;
    
    if (status) {
      if (lastDoc) {
        q = query(
          collection(db, COLLECTION_NAME),
          where('status', '==', status),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(limitCount)
        );
      } else {
        q = query(
          collection(db, COLLECTION_NAME),
          where('status', '==', status),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }
    } else {
      if (lastDoc) {
        q = query(
          collection(db, COLLECTION_NAME),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(limitCount)
        );
      } else {
        q = query(
          collection(db, COLLECTION_NAME),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }
    }
    
    const snapshot = await getDocs(q);
    const inquiries = snapshot.docs.map(docToInquiry);
    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    
    return { inquiries, lastDoc: newLastDoc };
  } catch (error) {
    console.error('Error getting all inquiries:', error);
    throw error;
  }
};

// Update inquiry status
export const updateInquiryStatus = async (
  inquiryId: string,
  status: InquiryStatus
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, inquiryId);
    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
    };
    
    if (status === 'resolved') {
      updateData.resolvedAt = serverTimestamp();
    }
    
    await updateDoc(docRef, updateData);
    console.log('Inquiry status updated:', inquiryId, status);
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    throw error;
  }
};

// Get inquiry statistics (for admin dashboard)
export const getInquiryStats = async (): Promise<{
  total: number;
  pending: number;
  resolved: number;
}> => {
  try {
    const [pendingSnapshot, resolvedSnapshot] = await Promise.all([
      getDocs(query(collection(db, COLLECTION_NAME), where('status', '==', 'pending'))),
      getDocs(query(collection(db, COLLECTION_NAME), where('status', '==', 'resolved')))
    ]);
    
    const pending = pendingSnapshot.size;
    const resolved = resolvedSnapshot.size;
    const total = pending + resolved;
    
    return { total, pending, resolved };
  } catch (error) {
    console.error('Error getting inquiry stats:', error);
    throw error;
  }
};