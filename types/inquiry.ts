export type InquiryCategory = 'technical' | 'billing' | 'general' | 'other';
export type InquiryStatus = 'pending' | 'resolved';

export interface Inquiry {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  companyName: string;
  category: InquiryCategory;
  subject: string;
  content: string;
  status: InquiryStatus;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export const INQUIRY_CATEGORY_LABELS: Record<InquiryCategory, string> = {
  technical: '技術的な問題',
  billing: '請求・支払い関連',
  general: '一般的な質問',
  other: 'その他'
};

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: '未回答',
  resolved: '回答済み'
};