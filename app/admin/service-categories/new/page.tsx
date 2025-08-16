'use client';

import ServiceCategoryForm from '@/components/ServiceCategoryForm';

export default function NewServiceCategoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">新規サービスカテゴリー作成</h1>
        <p className="mt-1 text-sm text-gray-500">
          新しいサービスカテゴリーを作成します
        </p>
      </div>

      <ServiceCategoryForm />
    </div>
  );
}