'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCustomer } from '@/lib/firebase/customers';
import { getServicesByIds } from '@/lib/firebase/services';
import { Customer } from '@/types/customer';
import { Service } from '@/types/service';

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [services, setServices] = useState<Service[]>([]);
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
    const fetchUserData = async () => {
      console.log('Dashboard user data:', { 
        user: !!user, 
        customerId: user?.customerId, 
        role: user?.role 
      });
      
      if (!user || !user.customerId) {
        console.log('No user or customerId, stopping data fetch');
        setDataLoading(false);
        return;
      }

      try {
        const customerData = await getCustomer(user.customerId);
        if (customerData) {
          setCustomer(customerData);
          
          if (customerData.serviceIds.length > 0) {
            const serviceData = await getServicesByIds(customerData.serviceIds);
            setServices(serviceData);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (user && user.role === 'user') {
      fetchUserData();
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
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return date.toLocaleDateString('ja-JP');
  };

  const getPaymentMethodLabel = (method: string | undefined) => {
    if (!method) return '-';
    return method === 'bank_transfer' ? '振込' : 'PayPal';
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
                  className="border-indigo-500 text-gray-900 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                >
                  ダッシュボード
                </Link>
                <Link
                  href="/dashboard/services"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
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
            <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
            <p className="mt-1 text-sm text-gray-500">
              サービス状況と最新情報の確認
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
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">会社名</label>
                    <p className="mt-1 text-sm text-gray-900">{customer.companyName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">サービス開始日</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(customer.contractStartDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">支払い方法</label>
                    <p className="mt-1 text-sm text-gray-900">{getPaymentMethodLabel(customer.paymentMethod)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">利用サービス数</label>
                    <p className="mt-1 text-lg font-semibold text-indigo-600">{services.length}</p>
                  </div>
                </div>
              </div>

              {/* 利用中のサービス */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">利用中のサービス</h2>
                {services.length === 0 ? (
                  <p className="text-gray-500">現在利用中のサービスはありません</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {services.map((service) => (
                      <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-sm font-medium text-gray-900">{service.name}</h3>
                          {service.price && (
                            <span className="text-sm font-semibold text-gray-900">
                              ¥{service.price.toLocaleString()}
                              <span className="text-xs text-gray-500">
                                /{service.billingCycle === 'monthly' ? '月' : service.billingCycle === 'yearly' ? '年' : '回'}
                              </span>
                            </span>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                        )}
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          利用中
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* クイックアクション */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">クイックアクション</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Link
                    href="/dashboard/services"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-2xl mr-3">📋</span>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">サービス詳細確認</h3>
                      <p className="text-xs text-gray-500">詳細なサービス情報</p>
                    </div>
                  </Link>
                  <Link
                    href="/dashboard/inquiry"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-2xl mr-3">📧</span>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">問い合わせ</h3>
                      <p className="text-xs text-gray-500">サポートに連絡</p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* 最近の活動 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">最近の活動</h2>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">🔄</span>
                    <span>サービス情報が更新されました</span>
                    <span className="ml-auto text-xs text-gray-400">2時間前</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">💰</span>
                    <span>今月の請求書が発行されました</span>
                    <span className="ml-auto text-xs text-gray-400">3日前</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">📧</span>
                    <span>お問い合わせへの回答がありました</span>
                    <span className="ml-auto text-xs text-gray-400">1週間前</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}