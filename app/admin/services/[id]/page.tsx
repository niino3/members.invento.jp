'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getService, deleteService } from '@/lib/firebase/services';
import { getServiceCategory } from '@/lib/firebase/serviceCategories';
import { getCustomersByServiceId } from '@/lib/firebase/customers';
import { Service } from '@/types/service';
import { ServiceCategory } from '@/types/serviceCategory';
import { Customer } from '@/types/customer';

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;
  
  const [service, setService] = useState<Service | null>(null);
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchServiceData = async () => {
      try {
        setLoading(true);
        const serviceData = await getService(serviceId);
        
        if (!serviceData) {
          router.push('/admin/services');
          return;
        }
        
        setService(serviceData);
        
        // カテゴリー情報を取得
        if (serviceData.categoryId) {
          const categoryData = await getServiceCategory(serviceData.categoryId);
          setCategory(categoryData);
        }
        
        // このサービスを利用している顧客を取得
        const customerData = await getCustomersByServiceId(serviceId);
        setCustomers(customerData);
      } catch (error) {
        console.error('Failed to fetch service:', error);
        router.push('/admin/services');
      } finally {
        setLoading(false);
      }
    };

    if (serviceId) {
      fetchServiceData();
    }
  }, [serviceId, router]);

  const handleDelete = async () => {
    if (!service) return;
    
    try {
      setDeleting(true);
      await deleteService(service.id);
      router.push('/admin/services');
    } catch (error) {
      console.error('Failed to delete service:', error);
      alert('サービスの削除に失敗しました');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return date.toLocaleDateString('ja-JP');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>サービスが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li>
                <Link href="/admin/services" className="text-gray-500 hover:text-gray-700">
                  サービス管理
                </Link>
              </li>
              <li>
                <span className="text-gray-400 mx-2">/</span>
                <span className="text-gray-900">{service.name}</span>
              </li>
            </ol>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            サービスID: {service.id}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Link
            href={`/admin/services/${service.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            編集
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            削除
          </button>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">基本情報</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-500">サービス名</label>
            <p className="mt-1 text-sm text-gray-900">{service.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">ステータス</label>
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                service.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {service.isActive ? 'アクティブ' : '無効'}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">カテゴリ</label>
            <p className="mt-1 text-sm text-gray-900">
              {category ? (
                <Link 
                  href={`/admin/service-categories/${category.id}`}
                  className="text-indigo-600 hover:text-indigo-500"
                >
                  {category.name}
                </Link>
              ) : (
                service.category || '-'
              )}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">作成日</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(service.createdAt)}</p>
          </div>
          {service.description && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-500">説明</label>
              <p className="mt-1 text-sm text-gray-900">{service.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* 料金情報 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">料金情報</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-500">料金</label>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatPrice(service.price, service.currency, service.billingCycle)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">通貨</label>
            <p className="mt-1 text-sm text-gray-900">{service.currency}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">請求サイクル</label>
            <p className="mt-1 text-sm text-gray-900">{getBillingCycleLabel(service.billingCycle)}</p>
          </div>
        </div>
      </div>

      {/* 機能・特徴 */}
      {service.features && service.features.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">機能・特徴</h3>
          <ul className="space-y-2">
            {service.features.map((feature, index) => (
              <li key={index} className="flex items-center text-sm text-gray-900">
                <span className="text-green-500 mr-2">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 利用中の顧客 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          利用中の顧客 ({customers.length}件)
        </h3>
        {customers.length === 0 ? (
          <p className="text-gray-500">このサービスを利用している顧客はいません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    会社名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    担当者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    契約開始日
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customer.companyName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.contactName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(customer.contractStartDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* メタ情報 */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">作成・更新情報</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-500">作成日時</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(service.createdAt)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">更新日時</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(service.updatedAt)}</p>
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
                  「{service.name}」を削除してもよろしいですか？
                  <br />
                  {customers.length > 0 && (
                    <span className="text-red-600 font-medium">
                      注意: {customers.length}件の顧客がこのサービスを利用中です。
                    </span>
                  )}
                  <br />
                  この操作は取り消せません。
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 mr-2"
                >
                  {deleting ? '削除中...' : '削除'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
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