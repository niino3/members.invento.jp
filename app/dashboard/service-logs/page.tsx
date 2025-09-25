'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCustomerByUserId } from '@/lib/firebase/customers';
import { getServiceLogsByCustomer } from '@/lib/firebase/serviceLogs';
import { Customer } from '@/types/customer';
import { ServiceLog } from '@/types/serviceLog';
import MobileNav from '@/components/MobileNav';
import { formatJSTDate } from '@/lib/utils/date';

type FilterPeriod = 'current_month' | '3_months' | '6_months' | 'all';

export default function ServiceLogsPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('current_month');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<{ url: string; filename: string } | null>(null);
  const [hasLogEnabledService, setHasLogEnabledService] = useState(true);
  
  const LOGS_PER_PAGE = 5;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setDataLoading(true);
        
        // 顧客情報を取得
        const customerData = await getCustomerByUserId(user.uid);
        if (!customerData) {
          throw new Error('顧客情報が見つかりません');
        }
        
        setCustomer(customerData);
        
        // 顧客が契約しているサービスを取得して、logEnabledがtrueのサービスがあるかチェック
        const { getServicesByIds } = await import('@/lib/firebase/services');
        const customerServices = await getServicesByIds(customerData.serviceIds);
        
        const hasService = customerServices.some(service => service.logEnabled === true);
        setHasLogEnabledService(hasService);
        
        if (!hasService) {
          // サービスログ記録が有効なサービスを契約していない場合は何も表示しない
          setDataLoading(false);
          return;
        }
        
        // 期間フィルターに基づいて日付範囲を計算
        const now = new Date();
        let startDate: Date | undefined;
        
        switch (filterPeriod) {
          case 'current_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case '3_months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            break;
          case '6_months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            break;
          case 'all':
          default:
            startDate = undefined;
            break;
        }
        
        // デバッグ情報を出力
        console.log('Debug info:', {
          userId: user.uid,
          customerId: customerData.id,
          userEmail: user.email
        });
        
        // サービスログを取得
        const logsResponse = await getServiceLogsByCustomer(customerData.id, {
          startDate,
          limit: LOGS_PER_PAGE,
          offset: (currentPage - 1) * LOGS_PER_PAGE,
        });
        
        setServiceLogs(logsResponse.logs);
        setTotalFilteredCount(logsResponse.total || 0);
        setTotalPages(Math.ceil((logsResponse.total || 0) / LOGS_PER_PAGE));
        
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [user, filterPeriod, currentPage]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };


  const getPeriodLabel = (period: FilterPeriod) => {
    switch (period) {
      case 'current_month': return '今月';
      case '3_months': return '3ヶ月';
      case '6_months': return '6ヶ月';
      case 'all': return '全期間';
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!user || !customer) {
    return null;
  }

  // サービスログ記録が有効なサービスを契約していない場合
  if (!hasLogEnabledService) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* ナビゲーションバー */}
        <nav className="bg-white shadow-sm border-b border-gray-200 relative">
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
                    className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                  >
                    サービス詳細
                  </Link>
                  <Link
                    href="/dashboard/service-logs"
                    className="border-indigo-500 text-gray-900 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                  >
                    サービスログ
                  </Link>
                  <Link
                    href="/dashboard/inquiry"
                    className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                  >
                    問い合わせ
                  </Link>
                </div>
              </div>
              
              {/* デスクトップメニュー */}
              <div className="hidden sm:flex sm:items-center">
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

              {/* モバイルメニュー */}
              <MobileNav userEmail={user.email || ''} onSignOut={handleSignOut} />
            </div>
          </div>
        </nav>

        {/* メインコンテンツ */}
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">サービスログ機能</h3>
              <p className="text-gray-500">
                サービスログ記録機能が有効なサービスをご契約いただくとサービスログをご確認いただけます。
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard/services"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  サービス詳細を見る
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ナビゲーションバー */}
      <nav className="bg-white shadow-sm border-b border-gray-200 relative">
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
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                >
                  サービス詳細
                </Link>
                <Link
                  href="/dashboard/service-logs"
                  className="border-indigo-500 text-gray-900 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                >
                  サービスログ
                </Link>
                <Link
                  href="/dashboard/inquiry"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                >
                  問い合わせ
                </Link>
              </div>
            </div>
            
            {/* デスクトップメニュー */}
            <div className="hidden sm:flex sm:items-center">
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

            {/* モバイルメニュー */}
            <MobileNav userEmail={user.email || ''} onSignOut={handleSignOut} />
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* ヘッダー */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">サービスログ</h1>
            <p className="mt-1 text-sm text-gray-600">郵便物の受取・転送履歴をご確認いただけます</p>
          </div>

          {/* フィルター */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">期間:</label>
              <select
                value={filterPeriod}
                onChange={(e) => {
                  setFilterPeriod(e.target.value as FilterPeriod);
                  setCurrentPage(1); // ページをリセット
                }}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="current_month">今月</option>
                <option value="3_months">過去3ヶ月</option>
                <option value="6_months">過去6ヶ月</option>
                <option value="all">全期間</option>
              </select>
              <span className="text-sm text-gray-500">
                {totalFilteredCount}件見つかりました
              </span>
            </div>
          </div>

          {/* サービスログ一覧 */}
          {serviceLogs.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">ログがありません</h3>
              <p className="text-gray-500">
                {getPeriodLabel(filterPeriod)}のサービスログはありません。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {serviceLogs.map((log) => (
                <div key={log.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-start gap-6">
                    {/* 左側：コンテンツ */}
                    <div className="flex-1">
                      <div className="mb-2">
                        <span className="text-sm text-gray-500">
                          {formatJSTDate(log.workDate)}
                        </span>
                      </div>
                      <p className="text-gray-600 whitespace-pre-wrap">{log.comment}</p>
                    </div>
                    
                    {/* 右側：画像 */}
                    {log.images.length > 0 && (
                      <div className="flex-shrink-0">
                        <div className="flex space-x-2">
                          {log.images.slice(0, 3).map((image) => (
                            <button
                              key={image.id}
                              onClick={() => setSelectedImage({ url: image.url, filename: image.filename })}
                              className="relative w-20 h-20 rounded overflow-hidden border border-gray-200 hover:border-indigo-300 transition-colors"
                            >
                              <img
                                src={image.url}
                                alt={image.filename}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                          {log.images.length > 3 && (
                            <div className="w-20 h-20 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-600">+{log.images.length - 3}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="bg-white shadow rounded-lg p-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    ページ <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                    <span className="ml-2 text-gray-500">
                      （{serviceLogs.length}件表示中）
                    </span>
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← 前へ
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    次へ →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 画像拡大モーダル */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" onClick={() => setSelectedImage(null)}>
          <div className="max-w-4xl max-h-full p-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100 shadow-lg z-10"
              >
                ×
              </button>
              <img
                src={selectedImage.url}
                alt={selectedImage.filename}
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-lg"
              />
              <div className="mt-4 text-center">
                <p className="text-white text-sm">{selectedImage.filename}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}