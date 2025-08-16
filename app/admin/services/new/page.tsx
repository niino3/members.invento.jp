'use client';

import ServiceForm from '@/components/ServiceForm';

export default function NewServicePage() {
  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">新規サービス作成</h1>
        <p className="mt-1 text-sm text-gray-500">
          新しいサービスの情報を入力してください
        </p>
      </div>

      {/* フォーム */}
      <ServiceForm />
    </div>
  );
}