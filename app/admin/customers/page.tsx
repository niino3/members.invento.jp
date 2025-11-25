'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCustomers, searchCustomers, cancelCustomer, reactivateCustomer } from '@/lib/firebase/customers';
import { Customer } from '@/types/customer';
import { formatJSTDate } from '@/lib/utils/date';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState<Customer | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reactivateConfirm, setReactivateConfirm] = useState<Customer | null>(null);
  const [reactivating, setReactivating] = useState(false);

  // 顧客リストを取得
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { customers: fetchedCustomers } = await getCustomers(20);
      setCustomers(fetchedCustomers);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  // 検索実行
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchCustomers();
      return;
    }

    try {
      setIsSearching(true);
      const searchResults = await searchCustomers(searchTerm);
      setCustomers(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);


  const getCompanyTypeLabel = (type: string) => {
    return type === 'corporate' ? '法人' : '個人';
  };

  const handleCancelCustomer = (customer: Customer) => {
    setCancelConfirm(customer);
  };

  const confirmCancel = async () => {
    if (!cancelConfirm) return;

    setCancelling(true);
    try {
      await cancelCustomer(cancelConfirm.id);
      // 顧客リストを再取得して更新
      fetchCustomers();
      setCancelConfirm(null);
      alert('顧客を解約しました（ユーザーアカウントも無効化されました）');
    } catch (error) {
      console.error('Error cancelling customer:', error);
      alert('顧客の解約に失敗しました');
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivateCustomer = (customer: Customer) => {
    setReactivateConfirm(customer);
  };

  const confirmReactivate = async () => {
    if (!reactivateConfirm) return;

    setReactivating(true);
    try {
      await reactivateCustomer(reactivateConfirm.id);
      // 顧客リストを再取得して更新
      fetchCustomers();
      setReactivateConfirm(null);
      alert('顧客を再有効化しました（ユーザーアカウントも有効化されました）');
    } catch (error) {
      console.error('Error reactivating customer:', error);
      alert('顧客の再有効化に失敗しました');
    } finally {
      setReactivating(false);
    }
  };

  const getPaymentMethodLabel = (method: string | undefined) => {
    if (!method) return '-';
    return method === 'bank_transfer' ? '振込' : 'PayPal';
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">顧客管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            登録されている顧客の一覧と管理
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/admin/customers/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            新規顧客登録
          </Link>
        </div>
      </div>

      {/* 検索バー */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="会社名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSearching ? '検索中...' : '検索'}
          </button>
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                fetchCustomers();
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              クリア
            </button>
          )}
        </div>
      </div>

      {/* 顧客リスト */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <p>読み込み中...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">
              {searchTerm ? '検索結果が見つかりません' : '顧客が登録されていません'}
            </p>
            {!searchTerm && (
              <Link
                href="/admin/customers/new"
                className="mt-2 inline-flex items-center text-indigo-600 hover:text-indigo-500"
              >
                最初の顧客を登録
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* タブレット・PC用テーブル表示 */}
            <div className="hidden md:block overflow-x-auto">
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
                    種別
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    契約開始日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    支払方法
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    利用サービス数
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {customer.companyName}
                      </div>
                      {customer.email && (
                        <div className="text-sm text-gray-500">
                          {customer.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {customer.contactName}
                      </div>
                      {customer.phoneNumber && (
                        <div className="text-sm text-gray-500">
                          {customer.phoneNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {getCompanyTypeLabel(customer.companyType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.contractStartDate ? formatJSTDate(customer.contractStartDate, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPaymentMethodLabel(customer.paymentMethod)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.serviceIds.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        詳細
                      </Link>
                      <Link
                        href={`/admin/customers/${customer.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        編集
                      </Link>
                      {customer.contractStatus === 'cancelled' ? (
                        <button
                          onClick={() => handleReactivateCustomer(customer)}
                          className="text-green-600 hover:text-green-900"
                        >
                          再有効化
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCancelCustomer(customer)}
                          className="text-red-600 hover:text-red-900"
                        >
                          解約
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            
            {/* モバイル・小さめタブレット用カード表示 */}
            <div className="md:hidden space-y-4">
              {customers.map((customer) => (
                <div key={customer.id} className="bg-white p-4 rounded-lg shadow border">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-900">{customer.companyName}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        customer.contractStatus === 'active' ? 'bg-green-100 text-green-800' :
                        customer.contractStatus === 'trial' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {customer.contractStatus === 'active' ? '有効' :
                         customer.contractStatus === 'trial' ? '試用中' : '解約済み'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">担当者: {customer.contactName}</p>
                    <p className="text-sm text-gray-600">種別: {customer.companyType}</p>
                    <p className="text-sm text-gray-600">契約開始: {customer.contractStartDate ? new Date(customer.contractStartDate).toLocaleDateString('ja-JP') : '-'}</p>
                    <p className="text-sm text-gray-600">ステータス: {customer.contractStatus}</p>
                    
                    <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                      >
                        詳細
                      </Link>
                      <Link
                        href={`/admin/customers/${customer.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                      >
                        編集
                      </Link>
                      {customer.contractStatus === 'cancelled' ? (
                        <button
                          onClick={() => handleReactivateCustomer(customer)}
                          className="text-green-600 hover:text-green-900 text-sm"
                        >
                          再有効化
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCancelCustomer(customer)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          解約
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ページング（将来実装） */}
      {customers.length >= 20 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              前へ
            </button>
            <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              次へ
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                <span className="font-medium">{customers.length}</span> 件の顧客を表示中
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  前へ
                </button>
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  次へ
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* 解約確認ダイアログ */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                顧客解約の確認
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                「{cancelConfirm.companyName}」を解約してもよろしいですか？
                <br />
                契約状態が「解約済み」に変更され、契約終了日が設定されます。
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setCancelConfirm(null)}
                  disabled={cancelling}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelling}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {cancelling ? '解約中...' : '解約'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 再有効化確認ダイアログ */}
      {reactivateConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                顧客再有効化の確認
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                「{reactivateConfirm.companyName}」を再有効化してもよろしいですか？
                <br />
                契約状態が「有効」に変更され、ユーザーアカウントも有効化されます。
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setReactivateConfirm(null)}
                  disabled={reactivating}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmReactivate}
                  disabled={reactivating}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {reactivating ? '再有効化中...' : '再有効化'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}