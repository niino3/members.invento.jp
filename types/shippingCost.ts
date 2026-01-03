export interface ShippingCost {
  id: string;
  name: string; // 郵送料の名前（例：ゆうパケット、レターパックライトなど）
  price: number; // 金額
  description?: string; // 説明
  displayOrder: number; // 表示順序
  isActive: boolean; // 有効/無効フラグ
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CreateShippingCostInput {
  name: string;
  price: number;
  description?: string;
  displayOrder: number;
  isActive?: boolean;
}

export interface UpdateShippingCostInput {
  name?: string;
  price?: number;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}
