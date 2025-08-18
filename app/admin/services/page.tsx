'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getServices, deleteService } from '@/lib/firebase/services';
import { getServiceCategories } from '@/lib/firebase/serviceCategories';
import { Service } from '@/types/service';
import { ServiceCategory } from '@/types/serviceCategory';
import { useAuth } from '@/contexts/AuthContext';

export default function ServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // データを取得
  const fetchData = async () => {
    try {
      setLoading(true);
      const [fetchedServices, fetchedCategories] = await Promise.all([
        getServices(false), // 全てのサービスを取得
        getServiceCategories(false) // 全てのカテゴリーを取得
      ]);
      setServices(fetchedServices);
      setCategories(fetchedCategories.categories);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (serviceId: string) => {
    if (!user) return;
    
    try {
      setDeleting(serviceId);
      await deleteService(serviceId);
      fetchData(); // 削除後にデータを再取得
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete service:', error);
      alert('サービスの削除に失敗しました');
    } finally {
      setDeleting(null);
    }
  };

  const formatPrice = (price: number | undefined, currency: string, billingCycle: string) => {
    if (!price) return '-';
    const cycle = billingCycle === 'monthly' ? '/月' : billingCycle === 'yearly' ? '/年' : '/回';
    return `¥${price.toLocaleString()}${cycle}`;
  };

  const getBillingCycleLabel = (cycle: string) => {
    switch (cycle) {
      case 'monthly': return '月額';
      case 'yearly': return '年額';
      case 'one_time': return '一回払い';
      default: return cycle;
    }
  };

  const getCategoryName = (categoryId: string) => {
    if (!categoryId) return '-';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : '-';
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">サービス管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            提供中のサービスの管理と設定
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/admin/services/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            新規サービス追加
          </Link>
        </div>
      </div>

      {/* サービスリスト */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <p>読み込み中...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">サービスが登録されていません</p>
            <Link
              href="/admin/services/new"
              className="mt-2 inline-flex items-center text-indigo-600 hover:text-indigo-500"
            >
              最初のサービスを追加
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    サービス名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    料金
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    請求サイクル
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    カテゴリ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {service.name}
                      </div>
                      {service.description && (
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {service.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPrice(service.price, service.currency, service.billingCycle)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getBillingCycleLabel(service.billingCycle)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getCategoryName(service.categoryId) || service.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            service.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {service.isActive ? 'アクティブ' : '無効'}
                        </span>
                        {service.logEnabled && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            📝 ログ有効
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/services/${service.id}`}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        詳細
                      </Link>
                      <Link
                        href={`/admin/services/${service.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        編集
                      </Link>
                      <button
                        onClick={() => setShowDeleteConfirm(service.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚙️</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    総サービス数
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {services.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    アクティブサービス
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {services.filter(s => s.isActive).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🏷️</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    カテゴリ数
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {new Set([
                      ...services.map(s => s.categoryId).filter(Boolean),
                      ...services.map(s => s.category).filter(Boolean)
                    ]).size}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">サービスの削除</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  このサービスを削除してもよろしいですか？
                  <br />
                  この操作は取り消せません。
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={deleting === showDeleteConfirm}
                  className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 mr-2"
                >
                  {deleting === showDeleteConfirm ? '削除中...' : '削除'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="mt-3 px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}