'use client';

import ShippingCostForm from '@/components/ShippingCostForm';

export default function NewShippingCostPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">新規郵送料作成</h1>
        <p className="mt-1 text-sm text-gray-500">
          新しい郵送料を作成します
        </p>
      </div>

      <ShippingCostForm />
    </div>
  );
}
