'use client';

import CustomerForm from '@/components/CustomerForm';

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">新規顧客登録</h1>
        <p className="mt-1 text-sm text-gray-500">
          新しい顧客の情報を入力してください
        </p>
      </div>

      {/* フォーム */}
      <CustomerForm />
    </div>
  );
}