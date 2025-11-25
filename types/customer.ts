export type CompanyType = 'corporate' | 'individual';
export type PaymentMethod = 'bank_transfer' | 'paypal';
export type InvoiceDeliveryMethod = 'email' | 'postal';
export type ContractStatus = 'active' | 'trial' | 'cancelled' | 'suspended';

export interface Customer {
  id: string;
  companyType: CompanyType;
  companyName: string; // 必須
  companyNameKana?: string; // 会社名カナ
  contactName: string; // 必須
  postalCode?: string;
  address1?: string;
  address2?: string;
  forwardingPostalCode?: string;
  forwardingAddress1?: string;
  forwardingAddress2?: string;
  phoneNumber?: string;
  email?: string;
  contractStartDate?: Date;
  contractEndDate?: Date;
  contractStatus: ContractStatus; // 契約状態（active/cancelled/suspended）
  paymentMethod?: PaymentMethod;
  dedicatedPhoneNumber?: string;
  dedicatedPhoneForwardingNumber?: string;
  invoiceRequired: boolean;
  invoiceDeliveryMethod?: InvoiceDeliveryMethod;
  serviceIds: string[]; // 利用サービスID配列
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // 作成者のUID
  updatedBy: string; // 更新者のUID
}

export interface CreateCustomerInput {
  companyType: CompanyType;
  companyName: string;
  companyNameKana?: string;
  contactName: string;
  postalCode?: string;
  address1?: string;
  address2?: string;
  forwardingPostalCode?: string;
  forwardingAddress1?: string;
  forwardingAddress2?: string;
  phoneNumber?: string;
  email?: string;
  contractStartDate?: Date;
  contractEndDate?: Date;
  contractStatus?: ContractStatus; // 契約状態（デフォルト: active）
  paymentMethod?: PaymentMethod;
  dedicatedPhoneNumber?: string;
  dedicatedPhoneForwardingNumber?: string;
  invoiceRequired: boolean;
  invoiceDeliveryMethod?: InvoiceDeliveryMethod;
  serviceIds: string[];
  notes?: string;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  id: string;
}