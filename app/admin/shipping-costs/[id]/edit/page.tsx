'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getShippingCost } from '@/lib/firebase/shippingCosts';
import { ShippingCost } from '@/types/shippingCost';
import ShippingCostForm from '@/components/ShippingCostForm';

export default function EditShippingCostPage() {
  const params = useParams();
  const [cost, setCost] = useState<ShippingCost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const costId = params.id as string;

  useEffect(() => {
    const fetchCost = async () => {
      if (!costId) return;

      try {
        setLoading(true);
        const fetchedCost = await getShippingCost(costId);
        if (fetchedCost) {
          setCost(fetchedCost);
        } else {
          setError('郵送料が見つかりません');
        }
      } catch (error) {
        console.error('Failed to fetch shipping cost:', error);
        setError('郵送料の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchCost();
  }, [costId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (error || !cost) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error || '郵送料が見つかりません'}</div>
        <Link
          href="/admin/shipping-costs"
          className="text-indigo-600 hover:text-indigo-500"
        >
          郵送料一覧に戻る
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
                href="/admin/shipping-costs"
                className="text-gray-500 hover:text-gray-700"
              >
                郵送料管理
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
        <h1 className="text-2xl font-bold text-gray-900">郵送料編集</h1>
        <p className="mt-1 text-sm text-gray-500">
          {cost.name} の情報を編集します
        </p>
      </div>

      <ShippingCostForm cost={cost} isEdit={true} />
    </div>
  );
}
