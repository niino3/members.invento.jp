'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getServiceLogs, deleteServiceLog } from '@/lib/firebase/serviceLogs';
import { getAllCustomers } from '@/lib/firebase/customers';
import { getServices } from '@/lib/firebase/services';
import { ServiceLog, ServiceLogSearchParams } from '@/types/serviceLog';
import { Customer } from '@/types/customer';
import { Service } from '@/types/service';
import { formatJSTDate } from '@/lib/utils/date';

export default function ServiceLogsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; filename: string } | null>(null);
  const [selectedLogImages, setSelectedLogImages] = useState<{ images: { id: string; url: string; filename: string }[]; logInfo: string } | null>(null);
  
  // フィルター状態
  const [filters, setFilters] = useState<ServiceLogSearchParams>({
    limit: 50,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKanaGroup, setSelectedKanaGroup] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== 'admin') return;
      
      try {
        // 並行してデータを取得
        const [logsData, allCustomers, servicesData] = await Promise.all([
          getServiceLogs(filters),
          getAllCustomers(),
          getServices(),
        ]);

        setLogs(logsData.logs);
        setCustomers(allCustomers);
        setServices(servicesData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [user, filters]);

  const handleFilterChange = (key: keyof ServiceLogSearchParams, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const handleDateRangeChange = () => {
    const newFilters: ServiceLogSearchParams = { ...filters };
    
    if (dateRange.start) {
      newFilters.startDate = new Date(dateRange.start);
    } else {
      delete newFilters.startDate;
    }
    
    if (dateRange.end) {
      newFilters.endDate = new Date(dateRange.end);
    } else {
      delete newFilters.endDate;
    }
    
    setFilters(newFilters);
  };

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      keyword: searchTerm || undefined,
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このサービスログを削除してもよろしいですか？関連する画像も削除されます。')) {
      return;
    }

    try {
      await deleteServiceLog(id);
      setLogs(logs.filter(log => log.id !== id));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete service log:', error);
      alert('削除に失敗しました');
    }
  };

  const getKanaGroup = (kana: string | undefined): string => {
    if (!kana || kana.length === 0) return 'その他';

    const dakutenMap: { [key: string]: string } = {
      'ガ': 'カ', 'ギ': 'キ', 'グ': 'ク', 'ゲ': 'ケ', 'ゴ': 'コ',
      'ザ': 'サ', 'ジ': 'シ', 'ズ': 'ス', 'ゼ': 'セ', 'ゾ': 'ソ',
      'ダ': 'タ', 'ヂ': 'チ', 'ヅ': 'ツ', 'デ': 'テ', 'ド': 'ト',
      'バ': 'ハ', 'ビ': 'ヒ', 'ブ': 'フ', 'ベ': 'ヘ', 'ボ': 'ホ',
      'パ': 'ハ', 'ピ': 'ヒ', 'プ': 'フ', 'ペ': 'ヘ', 'ポ': 'ホ',
      'ヴ': 'ウ',
    };

    const firstChar = kana.charAt(0);
    const seionChar = dakutenMap[firstChar] || firstChar;

    if (seionChar >= 'ア' && seionChar <= 'オ') return 'ア行';
    if (seionChar >= 'カ' && seionChar <= 'コ') return 'カ行';
    if (seionChar >= 'サ' && seionChar <= 'ソ') return 'サ行';
    if (seionChar >= 'タ' && seionChar <= 'ト') return 'タ行';
    if (seionChar >= 'ナ' && seionChar <= 'ノ') return 'ナ行';
    if (seionChar >= 'ハ' && seionChar <= 'ホ') return 'ハ行';
    if (seionChar >= 'マ' && seionChar <= 'モ') return 'マ行';
    if (seionChar >= 'ヤ' && seionChar <= 'ヨ') return 'ヤ行';
    if (seionChar >= 'ラ' && seionChar <= 'ロ') return 'ラ行';
    if (seionChar >= 'ワ' && seionChar <= 'ン') return 'ワ行';
    if (seionChar >= 'ａ' && seionChar <= 'ｚ') return '英数字';
    if (seionChar >= 'Ａ' && seionChar <= 'Ｚ') return '英数字';
    if (seionChar >= 'A' && seionChar <= 'Z') return '英数字';
    if (seionChar >= 'a' && seionChar <= 'z') return '英数字';
    if (seionChar >= '0' && seionChar <= '9') return '英数字';
    if (seionChar >= '０' && seionChar <= '９') return '英数字';
    return 'その他';
  };

  const filteredCustomersByKana = selectedKanaGroup
    ? customers
        .filter(c => getKanaGroup(c.companyNameKana) === selectedKanaGroup)
        .sort((a, b) => (a.companyNameKana || a.companyName).localeCompare(b.companyNameKana || b.companyName, 'ja'))
    : customers.sort((a, b) => (a.companyNameKana || a.companyName).localeCompare(b.companyNameKana || b.companyName, 'ja'));

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.companyName : 'Unknown';
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) {
      console.log('Service not found for ID:', serviceId);
      console.log('Available services:', services.map(s => ({ id: s.id, name: s.name, logEnabled: s.logEnabled })));
    }
    return service ? service.name : 'Unknown';
  };


  if (loading || dataLoading) {
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
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">サービスログ管理</h1>
          <Link
            href="/admin/service-logs/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            新規ログ登録
          </Link>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">フィルター</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 顧客フィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">顧客</label>
            <div className="flex gap-2">
              <select
                value={selectedKanaGroup}
                onChange={(e) => {
                  setSelectedKanaGroup(e.target.value);
                  handleFilterChange('customerId', '');
                }}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 h-10"
              >
                <option value="">全行</option>
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
              <select
                value={filters.customerId || ''}
                onChange={(e) => handleFilterChange('customerId', e.target.value)}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 h-10"
              >
                <option value="">すべての顧客</option>
                {filteredCustomersByKana.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* サービスフィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">サービス</label>
            <select
              value={filters.serviceId || ''}
              onChange={(e) => handleFilterChange('serviceId', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 h-10"
            >
              <option value="">すべてのサービス</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          {/* ステータスフィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 h-10"
            >
              <option value="">すべて</option>
              <option value="published">公開</option>
              <option value="draft">下書き</option>
            </select>
          </div>

          {/* キーワード検索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">キーワード</label>
            <div className="flex">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="block w-full rounded-l-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 h-10"
                placeholder="コメント内を検索"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700"
              >
                検索
              </button>
            </div>
          </div>
        </div>

        {/* 日付範囲フィルター */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 h-10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 h-10"
            />
          </div>
        </div>
        <button
          onClick={handleDateRangeChange}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          日付フィルター適用
        </button>
      </div>

      {/* ログ一覧 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          サービスログ一覧 ({logs.length}件)
        </h2>
        
        {logs.length === 0 ? (
          <p className="text-gray-500">サービスログがありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作業日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    顧客
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    サービス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作業者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    画像
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatJSTDate(log.workDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getCustomerName(log.customerId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getServiceName(log.serviceId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.workerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.images.length > 0 ? (
                        <button
                          onClick={() => setSelectedLogImages({ 
                            images: log.images, 
                            logInfo: `${getCustomerName(log.customerId)} - ${formatJSTDate(log.workDate)}` 
                          })}
                          className="flex space-x-1 hover:bg-gray-50 p-1 rounded transition-colors"
                        >
                          {log.images.slice(0, 3).map((image, index) => (
                            <div
                              key={image.id}
                              className="relative w-12 h-12 rounded overflow-hidden border border-gray-200"
                            >
                              <img
                                src={image.url}
                                alt={image.filename}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {log.images.length > 3 && (
                            <div className="w-12 h-12 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-600">+{log.images.length - 3}</span>
                            </div>
                          )}
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {log.status === 'published' ? '公開' : '下書き'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/service-logs/${log.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        編集
                      </Link>
                      <button
                        onClick={() => setShowDeleteConfirm(log.id)}
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

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">削除確認</h3>
            <p className="text-sm text-gray-500 mb-4">
              このサービスログを削除してもよろしいですか？関連する画像も削除されます。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ログ画像一覧モーダル */}
      {selectedLogImages && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLogImages(null)}>
          <div className="max-w-6xl max-h-full bg-white rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">{selectedLogImages.logInfo}</h3>
                <button
                  onClick={() => setSelectedLogImages(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                {selectedLogImages.images.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all cursor-pointer"
                    onClick={() => setSelectedImage({ url: image.url, filename: image.filename })}
                  >
                    <img
                      src={image.url}
                      alt={image.filename}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Image failed to load:', image.url);
                      }}
                      onLoad={() => console.log('Image loaded successfully:', image.url)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 画像拡大モーダル */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60]" onClick={() => setSelectedImage(null)}>
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