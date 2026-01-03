'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createShippingCost, updateShippingCost } from '@/lib/firebase/shippingCosts';
import { ShippingCost, CreateShippingCostInput, UpdateShippingCostInput } from '@/types/shippingCost';

interface ShippingCostFormProps {
  cost?: ShippingCost;
  isEdit?: boolean;
}

export default function ShippingCostForm({ cost, isEdit = false }: ShippingCostFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: cost?.name || '',
    price: cost?.price || 0,
    description: cost?.description || '',
    displayOrder: cost?.displayOrder || 0,
    isActive: cost?.isActive !== false, // デフォルトはtrue
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
               (name === 'displayOrder' || name === 'price') ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      if (isEdit && cost) {
        // 更新
        const updateData: UpdateShippingCostInput = {
          name: formData.name,
          price: formData.price,
          description: formData.description || undefined,
          displayOrder: formData.displayOrder,
          isActive: formData.isActive,
        };
        await updateShippingCost(cost.id, updateData, user.uid);
        router.push('/admin/shipping-costs');
      } else {
        // 新規作成
        const createData: CreateShippingCostInput = {
          name: formData.name,
          price: formData.price,
          description: formData.description || undefined,
          displayOrder: formData.displayOrder,
          isActive: formData.isActive,
        };
        await createShippingCost(createData, user.uid);
        router.push('/admin/shipping-costs');
      }
    } catch (error) {
      console.error('Failed to save shipping cost:', error);
      setError('郵送料の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* 基本情報 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">基本情報</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              郵送料名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
              placeholder="例: ゆうパケット、レターパックライト"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              金額 <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">¥</span>
              </div>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                min="0"
                className="block w-full pl-7 pr-12 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
                placeholder="0"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
              placeholder="郵送料の説明を入力してください"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              表示順序
            </label>
            <input
              type="number"
              name="displayOrder"
              value={formData.displayOrder}
              onChange={handleInputChange}
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
              placeholder="0"
            />
            <p className="mt-1 text-sm text-gray-500">
              小さい値ほど上に表示されます
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              郵送料を有効にする
            </label>
          </div>
        </div>
      </div>

      {/* 送信ボタン */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading || !formData.name.trim()}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? '保存中...' : (isEdit ? '更新' : '作成')}
        </button>
      </div>
    </form>
  );
}
