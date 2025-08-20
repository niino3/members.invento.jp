'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getServiceLog, updateServiceLog } from '@/lib/firebase/serviceLogs';
import { getCustomers } from '@/lib/firebase/customers';
import { getServices } from '@/lib/firebase/services';
import { Customer } from '@/types/customer';
import { Service } from '@/types/service';
import { ServiceLog, UpdateServiceLogInput } from '@/types/serviceLog';
import ImageUploader from '@/components/ImageUploader';

export default function EditServiceLogPage() {
  const router = useRouter();
  const params = useParams();
  const logId = params.id as string;
  
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  
  const [serviceLog, setServiceLog] = useState<ServiceLog | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [service, setService] = useState<Service | null>(null);
  
  const [formData, setFormData] = useState({
    workDate: '',
    comment: '',
    status: 'published' as 'draft' | 'published',
  });
  
  const [newImages, setNewImages] = useState<File[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== 'admin') return;
      
      try {
        const log = await getServiceLog(logId);
        if (!log) {
          setError('サービスログが見つかりません');
          return;
        }
        
        setServiceLog(log);
        
        // フォームデータを設定
        const workDateLocal = new Date(log.workDate);
        workDateLocal.setMinutes(workDateLocal.getMinutes() - workDateLocal.getTimezoneOffset());
        setFormData({
          workDate: workDateLocal.toISOString().slice(0, 16),
          comment: log.comment,
          status: log.status,
        });
        
        // 関連データを取得
        const [customersResult, servicesData] = await Promise.all([
          getCustomers(),
          getServices(),
        ]);
        
        const customerData = customersResult.customers.find(c => c.id === log.customerId);
        const serviceData = servicesData.find(s => s.id === log.serviceId);
        
        setCustomer(customerData || null);
        setService(serviceData || null);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError('データの取得に失敗しました');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [user, logId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNewImagesChange = (files: File[]) => {
    setNewImages(files);
  };

  const handleRemoveExistingImage = (imageId: string) => {
    setRemovedImageIds(prev => [...prev, imageId]);
  };

  const handleCancelRemoveImage = (imageId: string) => {
    setRemovedImageIds(prev => prev.filter(id => id !== imageId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || user.role !== 'admin' || !serviceLog) return;
    
    setSubmitting(true);
    setError('');
    
    try {
      const input: UpdateServiceLogInput = {
        workDate: new Date(formData.workDate),
        comment: formData.comment,
        status: formData.status,
      };
      
      if (newImages.length > 0) {
        input.images = newImages;
      }
      
      if (removedImageIds.length > 0) {
        input.removeImageIds = removedImageIds;
      }
      
      await updateServiceLog(logId, input);
      
      router.push('/admin/service-logs');
    } catch (error) {
      console.error('Failed to update service log:', error);
      setError('サービスログの更新に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin' || !serviceLog) {
    return null;
  }

  const remainingImages = serviceLog.images.filter(img => !removedImageIds.includes(img.id));
  const totalImageCount = remainingImages.length + newImages.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ページヘッダー */}
      <div className="bg-white shadow rounded-lg p-6">
        <nav className="flex mb-4" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li>
              <Link href="/admin/service-logs" className="text-gray-500 hover:text-gray-700">
                サービスログ管理
              </Link>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li>
              <span className="text-gray-900">ログ編集</span>
            </li>
          </ol>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">サービスログ編集</h1>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* ログ情報（読み取り専用） */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">ログ情報</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="text-sm font-medium text-gray-500">顧客:</span>
            <p className="text-sm text-gray-900">{customer?.companyName || 'Unknown'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">サービス:</span>
            <p className="text-sm text-gray-900">{service?.name || 'Unknown'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">作業者:</span>
            <p className="text-sm text-gray-900">{serviceLog.workerName}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">作成日時:</span>
            <p className="text-sm text-gray-900">
              {serviceLog.createdAt.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本情報 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>
          
          <div className="grid grid-cols-1 gap-6">
            {/* 作業日時 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                作業日時 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="workDate"
                value={formData.workDate}
                onChange={handleInputChange}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            {/* ステータス */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="status"
                    value="published"
                    checked={formData.status === 'published'}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm">公開</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={formData.status === 'draft'}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm">下書き</span>
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                公開にすると顧客がログを閲覧できるようになります。
              </p>
            </div>
          </div>
        </div>

        {/* 作業内容 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">作業内容</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              コメント・作業内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="comment"
              value={formData.comment}
              onChange={handleInputChange}
              required
              rows={10}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
              placeholder="作業内容を詳しく記入してください..."
            />
          </div>
        </div>

        {/* 既存画像 */}
        {serviceLog.images.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">既存の画像</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {serviceLog.images.map((image) => {
                const isRemoved = removedImageIds.includes(image.id);
                return (
                  <div key={image.id} className={`relative ${isRemoved ? 'opacity-50' : ''}`}>
                    <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={image.url}
                        alt={image.filename}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {isRemoved ? (
                      <button
                        type="button"
                        onClick={() => handleCancelRemoveImage(image.id)}
                        className="absolute -top-2 -right-2 bg-gray-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-gray-600"
                      >
                        ↺
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(image.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    )}
                    {isRemoved && (
                      <div className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs font-medium">削除予定</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 新規画像アップロード */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">新しい画像を追加</h2>
          {totalImageCount >= 5 ? (
            <p className="text-sm text-gray-500">
              最大5枚までです。新しい画像を追加するには既存の画像を削除してください。
            </p>
          ) : (
            <ImageUploader
              images={newImages}
              onChange={handleNewImagesChange}
              maxImages={5 - remainingImages.length}
            />
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end space-x-3">
          <Link
            href="/admin/service-logs"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {submitting ? '更新中...' : 'ログを更新'}
          </button>
        </div>
      </form>
    </div>
  );
}