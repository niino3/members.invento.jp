'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createService, updateService } from '@/lib/firebase/services';
import { getServiceCategories } from '@/lib/firebase/serviceCategories';
import { Service, CreateServiceInput, UpdateServiceInput } from '@/types/service';
import { ServiceCategory } from '@/types/serviceCategory';

interface ServiceFormProps {
  service?: Service;
  isEdit?: boolean;
}

export default function ServiceForm({ service, isEdit = false }: ServiceFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

  const [formData, setFormData] = useState({
    name: service?.name || '',
    description: service?.description || '',
    price: service?.price?.toString() || '',
    currency: service?.currency || 'JPY',
    billingCycle: service?.billingCycle || 'monthly',
    isActive: service?.isActive !== undefined ? service.isActive : true,
    features: service?.features ? service.features.join('\n') : '',
    categoryId: service?.categoryId || '',
    category: service?.category || '', // 下位互換のため残す
    logEnabled: service?.logEnabled !== undefined ? service.logEnabled : false, // サービスログ記録フラグ
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // サービスカテゴリーを取得
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { categories: fetchedCategories } = await getServiceCategories(false); // 一時的に全て取得
        // クライアント側でアクティブフィルターと表示順序でソート
        const activeCategories = fetchedCategories
          .filter(cat => cat.isActive)
          .sort((a, b) => {
            if (a.displayOrder !== b.displayOrder) {
              return a.displayOrder - b.displayOrder;
            }
            return a.name.localeCompare(b.name);
          });
        setCategories(activeCategories);
      } catch (error) {
        console.error('Failed to fetch service categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // サービスデータが変更されたときにフォームデータを更新
  useEffect(() => {
    if (service && categories.length > 0) {
      // categoryIdが空で、categoryフィールドがある場合、カテゴリー名からIDを見つける
      let categoryId = service.categoryId || '';
      if (!categoryId && service.category) {
        const foundCategory = categories.find(cat => cat.name === service.category);
        if (foundCategory) {
          categoryId = foundCategory.id;
        }
      }
      
      setFormData({
        name: service.name || '',
        description: service.description || '',
        price: service.price?.toString() || '',
        currency: service.currency || 'JPY',
        billingCycle: service.billingCycle || 'monthly',
        isActive: service.isActive !== undefined ? service.isActive : true,
        features: service.features ? service.features.join('\n') : '',
        categoryId: categoryId,
        category: service.category || '',
        logEnabled: service.logEnabled !== undefined ? service.logEnabled : false,
      });
    }
  }, [service, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      // featuresを配列に変換
      const featuresArray = formData.features
        .split('\n')
        .map(feature => feature.trim())
        .filter(feature => feature.length > 0);

      // データの準備（undefinedフィールドを除外）
      const serviceData: any = {
        name: formData.name,
        currency: formData.currency,
        billingCycle: formData.billingCycle as 'monthly' | 'yearly' | 'one_time',
        isActive: formData.isActive,
        categoryId: formData.categoryId || '',
        logEnabled: formData.logEnabled,
      };

      // オプショナルフィールドを条件付きで追加
      if (formData.description) {
        serviceData.description = formData.description;
      }
      if (formData.price) {
        serviceData.price = parseFloat(formData.price);
      }
      if (featuresArray.length > 0) {
        serviceData.features = featuresArray;
      }
      if (formData.category) {
        serviceData.category = formData.category; // 下位互換のため残す
      }

      if (isEdit && service) {
        // 更新
        const updateData: UpdateServiceInput = {
          id: service.id,
          ...serviceData,
        };
        await updateService(updateData, user.uid);
        router.push(`/admin/services/${service.id}`);
      } else {
        // 新規作成
        const createData: CreateServiceInput = serviceData;
        const serviceId = await createService(createData, user.uid);
        router.push(`/admin/services/${serviceId}`);
      }
    } catch (error) {
      console.error('Failed to save service:', error);
      setError('サービス情報の保存に失敗しました');
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
              サービス名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
              placeholder="例: ベーシックプラン"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
              placeholder="サービスの詳細説明"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              サービスカテゴリー <span className="text-red-500">*</span>
            </label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleInputChange}
              required
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            >
              <option value="">カテゴリーを選択してください</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">
                利用可能なカテゴリーがありません。
                <Link href="/admin/service-categories/new" className="text-indigo-600 hover:text-indigo-500 ml-1">
                  カテゴリーを作成
                </Link>
              </p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
            />
            <label className="text-sm font-medium text-gray-700">
              アクティブ（顧客に提供中）
            </label>
          </div>

          <div className="flex items-center mt-4">
            <input
              type="checkbox"
              name="logEnabled"
              checked={formData.logEnabled}
              onChange={handleInputChange}
              className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
            />
            <label className="text-sm font-medium text-gray-700">
              サービスログ記録を有効にする
            </label>
          </div>
        </div>
      </div>

      {/* 料金設定 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">料金設定</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">料金</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              min="0"
              step="1"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">通貨</label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            >
              <option value="JPY">JPY (日本円)</option>
              <option value="USD">USD (米ドル)</option>
              <option value="EUR">EUR (ユーロ)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              請求サイクル <span className="text-red-500">*</span>
            </label>
            <select
              name="billingCycle"
              value={formData.billingCycle}
              onChange={handleInputChange}
              required
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            >
              <option value="monthly">月額</option>
              <option value="yearly">年額</option>
              <option value="one_time">一回払い</option>
            </select>
          </div>
        </div>
      </div>

      {/* 機能・特徴 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">機能・特徴</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            機能一覧
          </label>
          <p className="text-xs text-gray-500 mb-2">
            各機能を改行で区切って入力してください
          </p>
          <textarea
            name="features"
            value={formData.features}
            onChange={handleInputChange}
            rows={6}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            placeholder="例:&#10;基本機能&#10;メールサポート&#10;月次レポート&#10;優先サポート"
          />
        </div>
      </div>

      {/* プレビュー */}
      {(formData.name || formData.description || formData.features) && (
        <div className="bg-gray-50 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">プレビュー</h3>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {formData.name || 'サービス名'}
                </h4>
                {formData.description && (
                  <p className="text-sm text-gray-600 mt-1">{formData.description}</p>
                )}
              </div>
              {formData.price && (
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    ¥{parseInt(formData.price).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    / {formData.billingCycle === 'monthly' ? '月' : formData.billingCycle === 'yearly' ? '年' : '回'}
                  </p>
                </div>
              )}
            </div>
            
            {formData.features && (
              <div className="mt-3">
                <h5 className="text-sm font-medium text-gray-700 mb-2">機能:</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  {formData.features.split('\n').filter(f => f.trim()).map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature.trim()}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mt-3 flex items-center gap-2">
              {formData.categoryId && (
                <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  {categories.find(cat => cat.id === formData.categoryId)?.name || '不明なカテゴリー'}
                </span>
              )}
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                formData.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {formData.isActive ? 'アクティブ' : '無効'}
              </span>
            </div>
          </div>
        </div>
      )}

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
          disabled={loading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? '保存中...' : (isEdit ? '更新' : '作成')}
        </button>
      </div>
    </form>
  );
}