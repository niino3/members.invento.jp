export interface Billing {
  id: string;
  customerId: string;
  serviceId: string;
  amount: number;
  currency: string;
  billingDate: Date;
  dueDate: Date;
  paidDate?: Date;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod?: 'bank_transfer' | 'paypal' | 'other';
  invoiceNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBillingInput {
  customerId: string;
  serviceId: string;
  amount: number;
  currency: string;
  billingDate: Date;
  dueDate: Date;
  invoiceNumber?: string;
  notes?: string;
}