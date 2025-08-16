'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCustomer } from '@/lib/firebase/customers';
import { getServicesByIds } from '@/lib/firebase/services';
import { getServiceCategories } from '@/lib/firebase/serviceCategories';
import { Customer } from '@/types/customer';
import { Service } from '@/types/service';
import { ServiceCategory } from '@/types/serviceCategory';

export default function ContractsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && user.role === 'admin') {
      router.push('/admin');
    }
  }, [user, loading, router]);

  // 顧客情報とサービス情報を取得
  useEffect(() => {
    const fetchData = async () => {
      console.log('fetchData called with user:', { 
        user: !!user, 
        customerId: user?.customerId, 
        role: user?.role,
        email: user?.email
      });

      if (!user || !user.customerId) {
        console.log('No user or customerId found');
        setDataLoading(false);
        return;
      }

      try {
        // 並行して取得
        const [customerData, categoriesData] = await Promise.all([
          getCustomer(user.customerId),
          getServiceCategories(false)
        ]);

        console.log('Customer data received:', customerData);
        console.log('Categories data received:', categoriesData.categories.length, 'categories');

        if (customerData) {
          setCustomer(customerData);
          setCategories(categoriesData.categories);
          
          if (customerData.serviceIds.length > 0) {
            const serviceData = await getServicesByIds(customerData.serviceIds);
            console.log('Service data received:', serviceData.length, 'services');
            setServices(serviceData);
          } else {
            console.log('No serviceIds found for customer');
          }
        } else {
          console.log('No customer data found for customerId:', user.customerId);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (user && user.role === 'user') {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      const { signOut } = await import('@/contexts/AuthContext');
      // Note: This would need to be properly imported from useAuth
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const formatPrice = (price: number | undefined, currency: string, billingCycle: string) => {
    if (!price) return '無料';
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
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'その他';
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* ナビゲーションバー */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                  お客様ポータル
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                >
                  ダッシュボード
                </Link>
                <Link
                  href="/dashboard/services"
                  className="border-indigo-500 text-gray-900 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                >
                  サービス詳細
                </Link>
                <Link
                  href="/dashboard/inquiry"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                >
                  問い合わせ
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* ページヘッダー */}
          <div>
            <nav className="flex mb-4" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li>
                  <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                    ダッシュボード
                  </Link>
                </li>
                <li>
                  <span className="text-gray-400">/</span>
                </li>
                <li>
                  <span className="text-gray-900">サービス詳細</span>
                </li>
              </ol>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">利用中のサービス</h1>
            <p className="mt-1 text-sm text-gray-500">
              現在ご利用いただいているサービスの一覧
            </p>
          </div>

          {dataLoading ? (
            <div className="bg-white shadow rounded-lg p-6">
              <p>データを読み込み中...</p>
            </div>
          ) : !customer ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  お客様情報が見つかりません
                </h3>
                <p className="text-gray-500 mb-4">
                  管理者にお問い合わせください。
                </p>
                <Link
                  href="/dashboard/inquiry"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  問い合わせする
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* サービスサマリー */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">サービスサマリー</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">会社名</label>
                    <p className="mt-1 text-sm text-gray-900">{customer.companyName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">サービス状態</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      customer.contractStatus === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : customer.contractStatus === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {customer.contractStatus === 'active' ? '有効' : 
                       customer.contractStatus === 'cancelled' ? '解約済み' : '停止中'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">利用サービス数</label>
                    <p className="mt-1 text-lg font-semibold text-indigo-600">{services.length}</p>
                  </div>
                </div>
              </div>

              {/* サービス一覧 */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                {services.length === 0 ? (
                  <div className="p-6 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      利用中のサービスはありません
                    </h3>
                    <p className="text-gray-500 mb-4">
                      新しいサービスのご利用をご希望の場合は、お問い合わせください。
                    </p>
                    <Link
                      href="/dashboard/inquiry"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      問い合わせする
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
                    {services.map((service) => (
                      <div key={service.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                              <span className="ml-2 text-sm text-gray-500">
                                ({getCategoryName(service.categoryId)})
                              </span>
                            </div>
                            {service.description && (
                              <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <div className="flex justify-between items-center">
                            <span className="text-xl font-bold text-gray-900">
                              {formatPrice(service.price, service.currency, service.billingCycle)}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              service.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {service.isActive ? '利用中' : '停止中'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {getBillingCycleLabel(service.billingCycle)}
                          </p>
                        </div>
                        
                        {service.features && service.features.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">主な機能:</h4>
                            <div className="space-y-1">
                              {service.features.slice(0, 3).map((feature, index) => (
                                <div key={index} className="flex items-center text-sm text-gray-600">
                                  <span className="text-green-500 mr-2">✓</span>
                                  {feature}
                                </div>
                              ))}
                              {service.features.length > 3 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  ...他 {service.features.length - 3} 件
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* アクションエリア */}
              {services.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">サービスに関するお手続き</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Link
                      href="/dashboard/inquiry"
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-2xl mr-3">📧</span>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">サポートに問い合わせ</h3>
                        <p className="text-xs text-gray-500">サービスに関するご質問</p>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}