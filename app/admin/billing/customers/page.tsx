'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface BillingItem {
  name: string;
  price: number;
  quantity: number;
  excise: string;
}

interface MfBilling {
  departmentId: string;
  title: string;
  schedule: { type: string; months: number[] };
  billingScope: string;
  items: BillingItem[];
  variable: boolean;
  notes: string;
  paymentCondition: string;
}

interface BillingCustomer {
  id: string;
  companyName: string;
  companyNameKana: string;
  contractStatus: string;
  paymentMethod: string;
  mfBilling: MfBilling;
}

const EXCISE_OPTIONS = [
  { value: 'ten_percent', label: '10%' },
  { value: 'eight_percent', label: '8%（軽減）' },
  { value: 'non_taxable', label: '非課税' },
];

const SCHEDULE_TYPES = [
  { value: 'monthly', label: '毎月' },
  { value: 'yearly', label: '毎年' },
  { value: 'biannual', label: '半年' },
  { value: 'quarterly', label: '四半期' },
];

export default function BillingCustomersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [customers, setCustomers] = useState<BillingCustomer[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<MfBilling | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    fetchCustomers();
  }, [user]);

  const fetchCustomers = async () => {
    if (!user || user.role !== 'admin') return;
    setDataLoading(true);
    try {
      const response = await fetch('/api/moneyforward/customers');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setCustomers(data.customers);
    } catch (err) {
      setError('データ取得に失敗しました');
    } finally {
      setDataLoading(false);
    }
  };

  const startEdit = (customer: BillingCustomer) => {
    setEditingId(customer.id);
    setEditData(JSON.parse(JSON.stringify(customer.mfBilling)));
    setError('');
    setMessage('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editData) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/moneyforward/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: editingId, mfBilling: editData }),
      });
      if (!response.ok) throw new Error('Failed to save');
      setMessage('保存しました');
      setEditingId(null);
      setEditData(null);
      await fetchCustomers();
    } catch (err) {
      setError('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index: number, field: keyof BillingItem, value: string | number) => {
    if (!editData) return;
    const newItems = [...editData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditData({ ...editData, items: newItems });
  };

  const addItem = () => {
    if (!editData) return;
    setEditData({
      ...editData,
      items: [...editData.items, { name: '', price: 0, quantity: 1, excise: 'ten_percent' }],
    });
  };

  const removeItem = (index: number) => {
    if (!editData) return;
    setEditData({ ...editData, items: editData.items.filter((_, i) => i !== index) });
  };

  const updateScheduleMonths = (monthStr: string) => {
    if (!editData) return;
    const months = monthStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 12);
    setEditData({
      ...editData,
      schedule: { ...editData.schedule, months },
    });
  };

  const getScheduleLabel = (schedule: { type: string; months: number[] }) => {
    switch (schedule.type) {
      case 'monthly': return '毎月';
      case 'yearly': return `毎年 (${schedule.months.join(', ')}月)`;
      case 'biannual': return `半年 (${schedule.months.join(', ')}月)`;
      case 'quarterly': return `四半期 (${schedule.months.join(', ')}月)`;
      default: return schedule.type;
    }
  };

  const getTotalAmount = (items: BillingItem[]) => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const filteredCustomers = filter
    ? customers.filter(c =>
        c.companyName.includes(filter) ||
        c.companyNameKana.includes(filter))
    : customers;

  if (loading || dataLoading) {
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">請求設定一覧</h1>
            <p className="text-sm text-gray-500 mt-1">{customers.length}件の顧客に請求設定があります</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/billing"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              請求管理に戻る
            </Link>
            <Link href="/admin/billing/import"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
              MFデータ取り込み
            </Link>
          </div>
        </div>

        {/* 検索 */}
        <div className="mt-4">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="顧客名で絞り込み..."
            className="w-full md:w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-gray-900 h-10 px-3"
          />
        </div>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded">{message}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      {/* 一覧 */}
      <div className="space-y-3">
        {filteredCustomers.map((customer) => {
          const isEditing = editingId === customer.id;
          const billing = isEditing ? editData! : customer.mfBilling;

          return (
            <div key={customer.id} className="bg-white shadow rounded-lg p-4">
              {/* ヘッダー行 */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{customer.companyName}</h3>
                  {billing.title && (
                    <p className="text-sm text-gray-600 mt-0.5">{billing.title}</p>
                  )}
                  <div className="flex gap-3 mt-1 text-sm text-gray-500">
                    <span>{getScheduleLabel(billing.schedule)}</span>
                    <span>¥{getTotalAmount(billing.items).toLocaleString()}</span>
                    <span className="text-gray-400">{billing.billingScope === 'next' ? '次月分' : '当月分'}</span>
                  </div>
                </div>
                <div>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button onClick={cancelEdit}
                        className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
                        キャンセル
                      </button>
                      <button onClick={saveEdit} disabled={saving}
                        className="px-3 py-1.5 text-sm text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-400">
                        {saving ? '保存中...' : '保存'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(customer)}
                      className="px-3 py-1.5 text-sm text-indigo-600 border border-indigo-300 rounded hover:bg-indigo-50">
                      編集
                    </button>
                  )}
                </div>
              </div>

              {/* 編集フォーム */}
              {isEditing && editData && (
                <div className="mt-4 space-y-4 border-t pt-4">
                  {/* 件名 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">件名</label>
                    <input
                      type="text"
                      value={editData.title || ''}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      placeholder="例: Webサイト保守管理費"
                      className="w-full rounded border-gray-300 text-sm text-gray-900 h-9 px-2"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      テンプレート変数: {'{{YYYY}}'} 年 / {'{{M}}'} 月 / {'{{MM}}'} 月(ゼロ埋め) / {'{{M+1}}'} 翌月 / {'{{M-1}}'} 前月
                    </p>
                    <p className="text-xs text-gray-400">
                      例: {'{{YYYY}}'}年{'{{M}}'}月分 保守管理費 → 2026年4月分 保守管理費
                    </p>
                  </div>

                  {/* スケジュール */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">請求サイクル</label>
                      <select
                        value={editData.schedule.type}
                        onChange={(e) => setEditData({
                          ...editData,
                          schedule: { ...editData.schedule, type: e.target.value },
                        })}
                        className="w-full rounded border-gray-300 text-sm text-gray-900 h-9">
                        {SCHEDULE_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    {editData.schedule.type !== 'monthly' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">対象月 (カンマ区切り)</label>
                        <input
                          type="text"
                          value={editData.schedule.months.join(', ')}
                          onChange={(e) => updateScheduleMonths(e.target.value)}
                          placeholder="例: 4, 10"
                          className="w-full rounded border-gray-300 text-sm text-gray-900 h-9 px-2"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">請求対象</label>
                      <select
                        value={editData.billingScope}
                        onChange={(e) => setEditData({ ...editData, billingScope: e.target.value })}
                        className="w-full rounded border-gray-300 text-sm text-gray-900 h-9">
                        <option value="current">当月分</option>
                        <option value="next">次月分</option>
                      </select>
                    </div>
                  </div>

                  {/* 品目 */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-medium text-gray-500">品目</label>
                      <button onClick={addItem}
                        className="text-xs text-indigo-600 hover:underline">+ 品目追加</button>
                    </div>
                    <div className="space-y-2">
                      {editData.items.map((item, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(i, 'name', e.target.value)}
                            placeholder="品目名（テンプレート変数使用可）"
                            className="flex-1 rounded border-gray-300 text-sm text-gray-900 h-9 px-2"
                          />
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItem(i, 'price', parseInt(e.target.value) || 0)}
                            placeholder="金額"
                            className="w-28 rounded border-gray-300 text-sm text-gray-900 h-9 px-2"
                          />
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                            placeholder="数量"
                            className="w-16 rounded border-gray-300 text-sm text-gray-900 h-9 px-2"
                          />
                          <select
                            value={item.excise}
                            onChange={(e) => updateItem(i, 'excise', e.target.value)}
                            className="w-24 rounded border-gray-300 text-sm text-gray-900 h-9">
                            {EXCISE_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <button onClick={() => removeItem(i)}
                            className="text-red-500 hover:text-red-700 text-sm px-1">✕</button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-sm text-gray-600 text-right">
                      合計: ¥{getTotalAmount(editData.items).toLocaleString()}
                    </div>
                  </div>

                  {/* 振込先 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">振込先</label>
                    <textarea
                      value={editData.paymentCondition || ''}
                      onChange={(e) => setEditData({ ...editData, paymentCondition: e.target.value })}
                      rows={3}
                      className="w-full rounded border-gray-300 text-sm text-gray-900 px-2 py-1"
                      placeholder="振込先口座情報（テンプレート変数使用可）"
                    />
                  </div>

                  {/* 備考 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">備考</label>
                    <input
                      type="text"
                      value={editData.notes}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      className="w-full rounded border-gray-300 text-sm text-gray-900 h-9 px-2"
                      placeholder="メモ（テンプレート変数使用可）"
                    />
                  </div>

                  <div className="text-xs text-gray-400">
                    department_id: {editData.departmentId}
                  </div>
                </div>
              )}

              {/* 閲覧モード: 品目一覧 */}
              {!isEditing && billing.items.length > 0 && (
                <div className="mt-2 text-sm">
                  {billing.items.map((item, i) => (
                    <span key={i} className="text-gray-600">
                      {i > 0 && ' / '}
                      {item.name} ¥{item.price.toLocaleString()}×{item.quantity}
                    </span>
                  ))}
                  {billing.notes && (
                    <span className="ml-2 text-gray-400">({billing.notes})</span>
                  )}
                </div>
              )}
              {!isEditing && billing.paymentCondition && (
                <div className="mt-1 text-xs text-gray-400 whitespace-pre-line">
                  振込先: {billing.paymentCondition}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
