'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getShippingCosts, deleteShippingCost } from '@/lib/firebase/shippingCosts';
import { ShippingCost } from '@/types/shippingCost';

export default function ShippingCostsPage() {
  const [costs, setCosts] = useState<ShippingCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<ShippingCost | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 郵送料リストを取得
  const fetchCosts = async () => {
    try {
      setLoading(true);
      const { costs: fetchedCosts } = await getShippingCosts(false, 50); // 全て（非アクティブも含む）
      setCosts(fetchedCosts);
    } catch (error) {
      console.error('Failed to fetch shipping costs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCosts();
  }, []);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return date.toLocaleDateString('ja-JP');
  };

  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString('ja-JP')}`;
  };

  const handleDeleteCost = (cost: ShippingCost) => {
    setDeleteConfirm(cost);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    try {
      await deleteShippingCost(deleteConfirm.id);
      // 郵送料リストを再取得して更新
      fetchCosts();
      setDeleteConfirm(null);
      alert('郵送料を削除しました');
    } catch (error) {
      console.error('Error deleting shipping cost:', error);
      alert('郵送料の削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">郵送料管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            郵送料の一覧と管理
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/admin/shipping-costs/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            新規郵送料作成
          </Link>
        </div>
      </div>

      {/* 郵送料リスト */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <p>読み込み中...</p>
          </div>
        ) : costs.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">郵送料が登録されていません</p>
            <Link
              href="/admin/shipping-costs/new"
              className="mt-2 inline-flex items-center text-indigo-600 hover:text-indigo-500"
            >
              最初の郵送料を作成
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    表示順序
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    名前
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    説明
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作成日
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {costs.map((cost) => (
                  <tr key={cost.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cost.displayOrder}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {cost.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(cost.price)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {cost.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        cost.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {cost.isActive ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(cost.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/shipping-costs/${cost.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        編集
                      </Link>
                      <button
                        onClick={() => handleDeleteCost(cost)}
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

      {/* 削除確認ダイアログ */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                郵送料削除の確認
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                「{deleteConfirm.name}」を削除してもよろしいですか？
                <br />
                この操作は取り消せません。
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {deleting ? '削除中...' : '削除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
