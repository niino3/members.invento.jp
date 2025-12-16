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
import { getCurrentJSTDateTime } from '@/lib/utils/date';

export default function NewServiceLogPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [selectedKanaGroup, setSelectedKanaGroup] = useState<string>('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  const [formData, setFormData] = useState({
    customerId: '',
    serviceId: '',
    workDate: getCurrentJSTDateTime(), // 日本時間での現在時刻
    comment: '',
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

  // カナグループが選択されたら顧客をフィルタリング
  useEffect(() => {
    if (selectedKanaGroup) {
      const getKanaGroup = (kana: string | undefined): string => {
        if (!kana || kana.length === 0) return 'その他';
        const firstChar = kana.charAt(0);

        // カナ行の判定
        if (firstChar >= 'ア' && firstChar <= 'オ') return 'ア行';
        if (firstChar >= 'カ' && firstChar <= 'コ') return 'カ行';
        if (firstChar >= 'サ' && firstChar <= 'ソ') return 'サ行';
        if (firstChar >= 'タ' && firstChar <= 'ト') return 'タ行';
        if (firstChar >= 'ナ' && firstChar <= 'ノ') return 'ナ行';
        if (firstChar >= 'ハ' && firstChar <= 'ホ') return 'ハ行';
        if (firstChar >= 'マ' && firstChar <= 'モ') return 'マ行';
        if (firstChar >= 'ヤ' && firstChar <= 'ヨ') return 'ヤ行';
        if (firstChar >= 'ラ' && firstChar <= 'ロ') return 'ラ行';
        if (firstChar >= 'ワ' && firstChar <= 'ン') return 'ワ行';
        if (firstChar >= 'ａ' && firstChar <= 'ｚ') return '英数字';
        if (firstChar >= 'Ａ' && firstChar <= 'Ｚ') return '英数字';
        if (firstChar >= 'A' && firstChar <= 'Z') return '英数字';
        if (firstChar >= 'a' && firstChar <= 'z') return '英数字';
        if (firstChar >= '0' && firstChar <= '9') return '英数字';
        if (firstChar >= '０' && firstChar <= '９') return '英数字';
        return 'その他';
      };

      const filtered = customers.filter(customer => {
        const group = getKanaGroup(customer.companyNameKana);
        return group === selectedKanaGroup;
      });

      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  }, [selectedKanaGroup, customers]);

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
        status: 'published', // 常に公開
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
        <p className="text-lg">読み込み中...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* ページヘッダー */}
      <div className="bg-white shadow rounded-lg p-4">
        <nav className="flex mb-3" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li>
              <Link href="/admin/service-logs" className="text-base text-gray-500 hover:text-gray-700">
                サービスログ管理
              </Link>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li>
              <span className="text-base text-gray-900 font-medium">新規ログ登録</span>
            </li>
          </ol>
        </nav>
        <h1 className="text-3xl font-bold text-gray-900">新規サービスログ登録</h1>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded text-base font-medium">
          {error}
        </div>
      )}

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 基本情報 */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-3">基本情報</h2>

          <div className="grid grid-cols-1 gap-4">
            {/* 顧客選択 */}
            <div>
              <label className="block text-base font-bold text-gray-900 mb-2">
                顧客 <span className="text-red-600 text-lg">*</span>
              </label>

              {/* カナグループ選択 */}
              <div className="flex gap-2 mb-2">
                <select
                  value={selectedKanaGroup}
                  onChange={(e) => {
                    setSelectedKanaGroup(e.target.value);
                    setFormData(prev => ({ ...prev, customerId: '' })); // 顧客選択をリセット
                  }}
                  className="rounded-md border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg text-gray-900 h-14 px-3"
                >
                  <option value="">カナを選択</option>
                  <option value="ア行">ア行</option>
                  <option value="カ行">カ行</option>
                  <option value="サ行">サ行</option>
                  <option value="タ行">タ行</option>
                  <option value="ナ行">ナ行</option>
                  <option value="ハ行">ハ行</option>
                  <option value="マ行">マ行</option>
                  <option value="ヤ行">ヤ行</option>
                  <option value="ラ行">ラ行</option>
                  <option value="ワ行">ワ行</option>
                  <option value="英数字">英数字</option>
                  <option value="その他">その他</option>
                </select>

                {/* 顧客選択 */}
                <select
                  name="customerId"
                  value={formData.customerId}
                  onChange={handleInputChange}
                  required
                  disabled={!selectedKanaGroup}
                  className="flex-1 rounded-md border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg text-gray-900 h-14 px-3 disabled:bg-gray-100"
                >
                  <option value="">
                    {selectedKanaGroup ? '顧客を選択' : 'まずカナを選択してください'}
                  </option>
                  {filteredCustomers
                    .sort((a, b) => {
                      // カナがある場合はカナでソート、ない場合は会社名でソート
                      const aSort = a.companyNameKana || a.companyName;
                      const bSort = b.companyNameKana || b.companyName;
                      return aSort.localeCompare(bSort, 'ja');
                    })
                    .map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.companyName}
                        {customer.companyNameKana && ` (${customer.companyNameKana})`}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* サービス表示 */}
            <div>
              <label className="block text-base font-bold text-gray-900 mb-2">
                サービス
              </label>
              <div className="block w-full rounded-md border-2 border-gray-300 bg-gray-50 px-4 py-3 text-lg text-gray-900">
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
              <label className="block text-base font-bold text-gray-900 mb-2">
                作業日時 <span className="text-red-600 text-lg">*</span>
              </label>
              <input
                type="datetime-local"
                name="workDate"
                value={formData.workDate}
                onChange={handleInputChange}
                required
                className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg text-gray-900 px-4 py-3 h-14"
              />
            </div>
          </div>
        </div>

        {/* 画像アップロード */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-3">画像</h2>
          <ImageUploader
            images={images}
            onChange={handleImagesChange}
            maxImages={5}
          />
        </div>

        {/* 作業内容 - 最下部に移動、必須を外す */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-3">作業内容</h2>

          <div>
            <label className="block text-base font-bold text-gray-900 mb-2">
              コメント・作業内容
            </label>
            <textarea
              name="comment"
              value={formData.comment}
              onChange={handleInputChange}
              rows={8}
              className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg text-gray-900 px-4 py-3"
              style={{ minHeight: '180px' }}
              placeholder="作業内容を記入してください（任意）"
            />
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end space-x-3 pb-4">
          <Link
            href="/admin/service-logs"
            className="px-6 py-3 text-base font-bold text-gray-700 bg-white border-2 border-gray-300 rounded-md hover:bg-gray-50"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 text-base font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {submitting ? '登録中...' : 'ログを登録'}
          </button>
        </div>
      </form>
    </div>
  );
}
