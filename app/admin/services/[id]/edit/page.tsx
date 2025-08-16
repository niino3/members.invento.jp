'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getService } from '@/lib/firebase/services';
import { Service } from '@/types/service';
import ServiceForm from '@/components/ServiceForm';

export default function EditServicePage() {
  const params = useParams();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const serviceId = params.id as string;

  useEffect(() => {
    const fetchService = async () => {
      if (!serviceId) return;

      try {
        setLoading(true);
        const fetchedService = await getService(serviceId);
        if (fetchedService) {
          setService(fetchedService);
        } else {
          setError('サービスが見つかりません');
        }
      } catch (error) {
        console.error('Failed to fetch service:', error);
        setError('サービスの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [serviceId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error || 'サービスが見つかりません'}</div>
        <Link
          href="/admin/services"
          className="text-indigo-600 hover:text-indigo-500"
        >
          サービス一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <nav className="flex mb-4" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li>
              <Link
                href="/admin/services"
                className="text-gray-500 hover:text-gray-700"
              >
                サービス管理
              </Link>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li>
              <Link
                href={`/admin/services/${service.id}`}
                className="text-gray-500 hover:text-gray-700"
              >
                {service.name}
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
        <h1 className="text-2xl font-bold text-gray-900">サービス編集</h1>
        <p className="mt-1 text-sm text-gray-500">
          {service.name} の情報を編集します
        </p>
      </div>

      {/* フォーム */}
      <ServiceForm service={service} isEdit={true} />
    </div>
  );
}