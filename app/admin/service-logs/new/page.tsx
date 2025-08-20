'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createServiceLog } from '@/lib/firebase/serviceLogs';
import { getCustomers } from '@/lib/firebase/customers';
import { getServices } from '@/lib/firebase/services';
import { Customer } from '@/types/customer';
import { Service } from '@/types/service';
import { CreateServiceLogInput } from '@/types/serviceLog';
import ImageUploader from '@/components/ImageUploader';

export default function NewServiceLogPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  
  const [formData, setFormData] = useState({
    customerId: '',
    serviceId: '',
    workDate: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm format
    comment: '',
    status: 'published' as 'draft' | 'published',
  });
  
  const [images, setImages] = useState<File[]>([]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== 'admin') return;
      
      try {
        const [customersResult, servicesData] = await Promise.all([
          getCustomers(),
          getServices(),
        ]);
        
        setCustomers(customersResult.customers);
        // ログ記録が有効なサービスのみ
        setServices(servicesData.filter(s => s.logEnabled));
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError('データの取得に失敗しました');
      }
    };

    fetchData();
  }, [user]);

  // 顧客が選択されたら、その顧客が契約しているサービスのみ表示
  useEffect(() => {
    if (formData.customerId) {
      const customer = customers.find(c => c.id === formData.customerId);
      if (customer) {
        const customerServices = services.filter(s => 
          customer.serviceIds.includes(s.id)
        );
        setAvailableServices(customerServices);
        
        // 自動的に最初のサービスを選択
        if (customerServices.length > 0) {
          setFormData(prev => ({ ...prev, serviceId: customerServices[0].id }));
        }
      }
    } else {
      setAvailableServices([]);
      setFormData(prev => ({ ...prev, serviceId: '' }));
    }
  }, [formData.customerId, customers, services]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImagesChange = (files: File[]) => {
    setImages(files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || user.role !== 'admin') return;
    
    setSubmitting(true);
    setError('');
    
    try {
      const input: CreateServiceLogInput = {
        customerId: formData.customerId,
        serviceId: formData.serviceId,
        workDate: new Date(formData.workDate),
        comment: formData.comment,
        status: formData.status,
        images: images,
      };
      
      await createServiceLog(input, user.uid, user.displayName || user.email || 'Unknown');
      
      router.push('/admin/service-logs');
    } catch (error) {
      console.error('Failed to create service log:', error);
      setError('サービスログの作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

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
              <span className="text-gray-900">新規ログ登録</span>
            </li>
          </ol>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">新規サービスログ登録</h1>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本情報 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>
          
          <div className="grid grid-cols-1 gap-6">
            {/* 顧客選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                顧客 <span className="text-red-500">*</span>
              </label>
              <select
                name="customerId"
                value={formData.customerId}
                onChange={handleInputChange}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">顧客を選択してください</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.companyName}
                  </option>
                ))}
              </select>
            </div>

            {/* サービス表示 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                サービス
              </label>
              <div className="block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-gray-900">
                ビジネス住所利用
              </div>
              <input
                type="hidden"
                name="serviceId"
                value={availableServices[0]?.id || ''}
              />
            </div>

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

        {/* 画像アップロード */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">画像</h2>
          <ImageUploader
            images={images}
            onChange={handleImagesChange}
            maxImages={5}
          />
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
            {submitting ? '登録中...' : 'ログを登録'}
          </button>
        </div>
      </form>
    </div>
  );
}