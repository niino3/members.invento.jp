'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getServiceCategories, searchServiceCategories, deleteServiceCategory } from '@/lib/firebase/serviceCategories';
import { ServiceCategory } from '@/types/serviceCategory';

export default function ServiceCategoriesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ServiceCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  // サービスカテゴリーリストを取得
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { categories: fetchedCategories } = await getServiceCategories(false, 50); // 全て（非アクティブも含む）
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Failed to fetch service categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // 検索実行
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchCategories();
      return;
    }

    try {
      setIsSearching(true);
      const searchResults = await searchServiceCategories(searchTerm);
      setCategories(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return date.toLocaleDateString('ja-JP');
  };

  const handleDeleteCategory = (category: ServiceCategory) => {
    setDeleteConfirm(category);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    try {
      await deleteServiceCategory(deleteConfirm.id);
      // カテゴリーリストを再取得して更新
      fetchCategories();
      setDeleteConfirm(null);
      alert('サービスカテゴリーを削除しました');
    } catch (error) {
      console.error('Error deleting service category:', error);
      alert('サービスカテゴリーの削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">サービスカテゴリー管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            サービスカテゴリーの一覧と管理
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/admin/service-categories/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            新規カテゴリー作成
          </Link>
        </div>
      </div>

      {/* 検索バー */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="カテゴリー名で検索..."
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
                fetchCategories();
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              クリア
            </button>
          )}
        </div>
      </div>

      {/* サービスカテゴリーリスト */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <p>読み込み中...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">
              {searchTerm ? '検索結果が見つかりません' : 'サービスカテゴリーが登録されていません'}
            </p>
            {!searchTerm && (
              <Link
                href="/admin/service-categories/new"
                className="mt-2 inline-flex items-center text-indigo-600 hover:text-indigo-500"
              >
                最初のカテゴリーを作成
              </Link>
            )}
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
                    カテゴリー名
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
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {category.displayOrder}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {category.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {category.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        category.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {category.isActive ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(category.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/service-categories/${category.id}`}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        詳細
                      </Link>
                      <Link
                        href={`/admin/service-categories/${category.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        編集
                      </Link>
                      <button
                        onClick={() => handleDeleteCategory(category)}
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
                カテゴリー削除の確認
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                「{deleteConfirm.name}」を削除してもよろしいですか？
                <br />
                このカテゴリーに属するサービスは削除されませんが、カテゴリーの関連付けが解除されます。
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