export interface ServiceCategory {
  id: string;
  name: string; // カテゴリー名（必須）
  description?: string; // カテゴリー説明
  displayOrder: number; // 表示順序
  isActive: boolean; // 有効/無効フラグ
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CreateServiceCategoryInput {
  name: string;
  description?: string;
  displayOrder: number;
  isActive?: boolean;
}

export interface UpdateServiceCategoryInput {
  name?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}