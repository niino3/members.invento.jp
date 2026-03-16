'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface BillingTarget {
  customerId: string;
  customerName: string;
  paymentMethod: string;
  items: { name: string; price: number; quantity: number; excise: string }[];
  totalAmount: number;
  status: 'pending' | 'created' | 'sent';
}

interface BillingSummary {
  month: string;
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  createdCount: number;
  sentCount: number;
}

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [targets, setTargets] = useState<BillingTarget[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dataLoading, setDataLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [authStatus, setAuthStatus] = useState<'unknown' | 'authenticated' | 'unauthenticated'>('unknown');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  // OAuth 認証成功の表示
  useEffect(() => {
    if (searchParams.get('auth') === 'success') {
      setMessage('MoneyForward 認証が完了しました');
      setAuthStatus('authenticated');
    }
  }, [searchParams]);

  // MF 認証状態の確認
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/moneyforward/partners');
        if (response.ok) {
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('unauthenticated');
        }
      } catch {
        setAuthStatus('unauthenticated');
      }
    };
    if (user?.role === 'admin') {
      checkAuth();
    }
  }, [user]);

  const fetchPreview = async () => {
    setDataLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/moneyforward/billing/preview?month=${selectedMonth}`);
      if (!response.ok) throw new Error('Failed to fetch preview');
      const data = await response.json();
      setSummary(data.summary);
      setTargets(data.targets);
      setSelectedIds(new Set());
    } catch (err) {
      setError('プレビューの取得に失敗しました');
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreate = async () => {
    if (selectedIds.size === 0) {
      setError('対象を選択してください');
      return;
    }

    setProcessing(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/moneyforward/billing/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          customerIds: Array.from(selectedIds),
        }),
      });
      if (!response.ok) throw new Error('Failed to create billings');
      const data = await response.json();
      setMessage(`${data.success}件作成成功、${data.failed}件失敗`);
      // プレビューを再取得
      await fetchPreview();
    } catch (err) {
      setError('請求書の作成に失敗しました');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelect = (customerId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === targets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(targets.map(t => t.customerId)));
    }
  };

  const selectByStatus = (status: string) => {
    setSelectedIds(new Set(targets.filter(t => t.status === status).map(t => t.customerId)));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">未作成</span>;
      case 'created':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">作成済</span>;
      case 'sent':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">送信済</span>;
      default:
        return null;
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'bank_transfer': return '振込';
      case 'paypal': return 'PayPal';
      default: return 'その他';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">請求書管理</h1>
          <div className="flex items-center gap-3">
            {authStatus === 'unauthenticated' && (
              <a
                href="/api/moneyforward/auth"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                MF認証
              </a>
            )}
            {authStatus === 'authenticated' && (
              <span className="text-sm text-green-600 font-medium">MF接続済</span>
            )}
            <Link
              href="/admin/billing/import"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              MFデータ取り込み
            </Link>
          </div>
        </div>
      </div>

      {/* メッセージ */}
      {message && (
        <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 月選択とアクション */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">対象月</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 h-10"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={fetchPreview}
              disabled={dataLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 h-10"
            >
              {dataLoading ? '読み込み中...' : 'プレビュー'}
            </button>
            {targets.length > 0 && (
              <button
                onClick={handleCreate}
                disabled={processing || selectedIds.size === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:bg-gray-400 h-10"
              >
                {processing ? '作成中...' : `一括作成 (${selectedIds.size}件)`}
              </button>
            )}
          </div>
        </div>

        {/* サマリー */}
        {summary && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 rounded p-3">
              <p className="text-sm text-gray-500">対象件数</p>
              <p className="text-xl font-bold text-gray-900">{summary.totalCount}件</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-sm text-gray-500">合計金額</p>
              <p className="text-xl font-bold text-gray-900">¥{summary.totalAmount.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded p-3 cursor-pointer hover:bg-gray-100" onClick={() => selectByStatus('pending')}>
              <p className="text-sm text-gray-500">未作成</p>
              <p className="text-xl font-bold text-gray-600">{summary.pendingCount}件</p>
            </div>
            <div className="bg-blue-50 rounded p-3 cursor-pointer hover:bg-blue-100" onClick={() => selectByStatus('created')}>
              <p className="text-sm text-blue-500">作成済</p>
              <p className="text-xl font-bold text-blue-700">{summary.createdCount}件</p>
            </div>
            <div className="bg-green-50 rounded p-3 cursor-pointer hover:bg-green-100" onClick={() => selectByStatus('sent')}>
              <p className="text-sm text-green-500">送信済</p>
              <p className="text-xl font-bold text-green-700">{summary.sentCount}件</p>
            </div>
          </div>
        )}
      </div>

      {/* 対象一覧 */}
      {targets.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            請求対象一覧 ({targets.length}件)
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === targets.length && targets.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 text-indigo-600 rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">顧客名</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">金額</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">支払方法</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {targets.map((target) => (
                  <tr key={target.customerId} className={selectedIds.has(target.customerId) ? 'bg-indigo-50' : ''}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(target.customerId)}
                        onChange={() => toggleSelect(target.customerId)}
                        className="h-4 w-4 text-indigo-600 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {target.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      ¥{target.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getPaymentLabel(target.paymentMethod)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(target.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 未認証時の案内 */}
      {authStatus === 'unauthenticated' && !dataLoading && targets.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6 text-center">
          <p className="text-yellow-800 mb-4">
            MoneyForward クラウド請求書との連携が必要です。
          </p>
          <a
            href="/api/moneyforward/auth"
            className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            MoneyForward に接続する
          </a>
        </div>
      )}
    </div>
  );
}
