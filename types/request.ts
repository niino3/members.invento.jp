export interface ContractChangeRequest {
  id: string;
  customerId: string;
  currentServiceId: string;
  requestedServiceId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  adminNotes?: string;
}

export interface Inquiry {
  id: string;
  customerId: string;
  customerEmail: string;
  category: 'technical' | 'billing' | 'general' | 'other';
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submittedAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  adminResponse?: string;
  responseAt?: Date;
}

export type ContractChangeRequestStatus = ContractChangeRequest['status'];
export type InquiryStatus = Inquiry['status'];
export type InquiryCategory = Inquiry['category'];
export type InquiryPriority = Inquiry['priority'];