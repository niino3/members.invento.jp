export interface Service {
  id: string;
  name: string;
  description?: string;
  price?: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'one_time';
  isActive: boolean;
  features?: string[];
  categoryId: string; // サービスカテゴリーID（必須）
  category?: string; // 下位互換のため残す（非推奨）
  logEnabled: boolean; // サービスログ記録の有効/無効
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CreateServiceInput {
  name: string;
  description?: string;
  price?: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'one_time';
  isActive: boolean;
  features?: string[];
  categoryId: string; // サービスカテゴリーID（必須）
  category?: string; // 下位互換のため残す（非推奨）
  logEnabled: boolean; // サービスログ記録の有効/無効
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  id: string;
}