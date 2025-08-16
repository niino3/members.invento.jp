'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getServiceCategory } from '@/lib/firebase/serviceCategories';
import { ServiceCategory } from '@/types/serviceCategory';
import ServiceCategoryForm from '@/components/ServiceCategoryForm';

export default function EditServiceCategoryPage() {
  const params = useParams();
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const categoryId = params.id as string;

  useEffect(() => {
    const fetchCategory = async () => {
      if (!categoryId) return;

      try {
        setLoading(true);
        const fetchedCategory = await getServiceCategory(categoryId);
        if (fetchedCategory) {
          setCategory(fetchedCategory);
        } else {
          setError('サービスカテゴリーが見つかりません');
        }
      } catch (error) {
        console.error('Failed to fetch service category:', error);
        setError('サービスカテゴリーの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [categoryId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error || 'サービスカテゴリーが見つかりません'}</div>
        <Link
          href="/admin/service-categories"
          className="text-indigo-600 hover:text-indigo-500"
        >
          サービスカテゴリー一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex mb-4" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li>
              <Link
                href="/admin/service-categories"
                className="text-gray-500 hover:text-gray-700"
              >
                サービスカテゴリー管理
              </Link>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li>
              <Link
                href={`/admin/service-categories/${category.id}`}
                className="text-gray-500 hover:text-gray-700"
              >
                {category.name}
              </Link>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li>
              <span className="text-gray-900">編集</span>
            </li>
          </ol>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">サービスカテゴリー編集</h1>
        <p className="mt-1 text-sm text-gray-500">
          {category.name} の情報を編集します
        </p>
      </div>

      <ServiceCategoryForm category={category} isEdit={true} />
    </div>
  );
}