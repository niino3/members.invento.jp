'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface MFPartner {
  id: string;
  name: string;
  code: string;
  departments: { id: string; name: string }[];
  matchedCustomerId: string | null;
}

interface FirestoreCustomer {
  id: string;
  companyName: string;
  companyNameKana: string;
  contractStatus: string;
  hasMfBilling: boolean;
}

interface BillingItem {
  name: string;
  price: number;
  quantity: number;
  excise: string;
}

interface DepartmentBilling {
  partnerName: string;
  billings: {
    id: string;
    billingDate: string;
    title: string;
    totalAmount: number;
    items: BillingItem[];
  }[];
  suggestedItems: BillingItem[];
  suggestedSchedule: { type: string; months: number[] };
}

type Step = 'mapping' | 'billing-import';

export default function BillingImportPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [step, setStep] = useState<Step>('mapping');
  const [mfPartners, setMfPartners] = useState<MFPartner[]>([]);
  const [customers, setCustomers] = useState<FirestoreCustomer[]>([]);
  const [mappings, setMappings] = useState<Record<string, { customerId: string; departmentId: string }>>({});
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Step 2 の状態
  const [departmentBillings, setDepartmentBillings] = useState<Record<string, DepartmentBilling>>({});
  const [billingLoading, setBillingLoading] = useState(false);
  const [savingBilling, setSavingBilling] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Step 1: MF取引先とFirestore顧客を取得
  const fetchData = async () => {
    setDataLoading(true);
    setError('');
    try {
      const response = await fetch('/api/moneyforward/import');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch');
      }
      const data = await response.json();
      setMfPartners(data.mfPartners);
      setCustomers(data.customers);

      // 自動マッチングの結果を初期マッピングに設定
      const initialMappings: Record<string, { customerId: string; departmentId: string }> = {};
      for (const partner of data.mfPartners) {
        if (partner.matchedCustomerId && partner.departments.length > 0) {
          initialMappings[partner.id] = {
            customerId: partner.matchedCustomerId,
            departmentId: partner.departments[0].id,
          };
        }
      }
      setMappings(initialMappings);
    } catch (err) {
      setError(`データ取得に失敗しました: ${err}`);
    } finally {
      setDataLoading(false);
    }
  };

  // マッピングの更新
  const updateMapping = (partnerId: string, field: 'customerId' | 'departmentId', value: string) => {
    setMappings(prev => {
      const current = prev[partnerId] || { customerId: '', departmentId: '' };
      if (!value) {
        const next = { ...prev };
        delete next[partnerId];
        return next;
      }
      return {
        ...prev,
        [partnerId]: { ...current, [field]: value },
      };
    });
  };

  // Step 1: マッピング保存
  const saveMappings = async () => {
    const validMappings = Object.entries(mappings)
      .filter(([, m]) => m.customerId && m.departmentId)
      .map(([partnerId, m]) => ({
        customerId: m.customerId,
        departmentId: m.departmentId,
        partnerName: mfPartners.find(p => p.id === partnerId)?.name || '',
      }));

    if (validMappings.length === 0) {
      setError('保存するマッピングがありません');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/moneyforward/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: validMappings }),
      });
      if (!response.ok) throw new Error('Failed to save');
      const data = await response.json();
      setMessage(`${data.updated}件のマッピングを保存しました`);
    } catch (err) {
      setError('マッピングの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // Step 2: MF請求書履歴を取得
  const fetchBillings = async () => {
    setBillingLoading(true);
    setError('');
    try {
      const response = await fetch('/api/moneyforward/import/billings');
      if (!response.ok) throw new Error('Failed to fetch billings');
      const data = await response.json();
      setDepartmentBillings(data.departments || {});
    } catch (err) {
      setError(`請求書データの取得に失敗しました: ${err}`);
    } finally {
      setBillingLoading(false);
    }
  };

  // Step 2: 個別の請求情報を保存
  const saveBillingInfo = async (
    customerId: string,
    departmentId: string,
    items: BillingItem[],
    schedule: { type: string; months: number[] }
  ) => {
    setSavingBilling(departmentId);
    try {
      const response = await fetch('/api/moneyforward/import/billings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          departmentId,
          items,
          schedule,
          billingScope: 'current',
          variable: false,
          notes: '',
        }),
      });
      if (!response.ok) throw new Error('Failed to save');
      setMessage(`請求情報を保存しました`);
    } catch (err) {
      setError('請求情報の保存に失敗しました');
    } finally {
      setSavingBilling(null);
    }
  };

  // マッピング済みの department_id → customerId 逆引き
  const getMappedCustomerId = (departmentId: string): string | null => {
    for (const [, m] of Object.entries(mappings)) {
      if (m.departmentId === departmentId) return m.customerId;
    }
    return null;
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MFデータ取り込み</h1>
            <p className="text-sm text-gray-500 mt-1">
              MoneyForwardの取引先・請求書データをFirestore顧客に紐付けます
            </p>
          </div>
          <Link
            href="/admin/billing"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            請求管理に戻る
          </Link>
        </div>

        {/* ステップタブ */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setStep('mapping')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              step === 'mapping'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Step 1: 取引先マッピング
          </button>
          <button
            onClick={() => setStep('billing-import')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              step === 'billing-import'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Step 2: 請求情報取り込み
          </button>
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

      {/* Step 1: 取引先マッピング */}
      {step === 'mapping' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              MF取引先 → Firestore顧客 マッピング
            </h2>
            <div className="flex gap-2">
              <button
                onClick={fetchData}
                disabled={dataLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {dataLoading ? '読み込み中...' : 'MFデータ取得'}
              </button>
              {Object.keys(mappings).length > 0 && (
                <button
                  onClick={saveMappings}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {saving ? '保存中...' : `マッピング保存 (${Object.keys(mappings).length}件)`}
                </button>
              )}
            </div>
          </div>

          {mfPartners.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MF取引先名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MF部署</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Firestore顧客</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状態</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mfPartners.map((partner) => {
                    const mapping = mappings[partner.id];
                    const matchedCustomer = customers.find(c => c.id === mapping?.customerId);
                    return (
                      <tr key={partner.id} className={mapping ? 'bg-green-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {partner.name}
                          {partner.code && <span className="text-gray-400 ml-1">({partner.code})</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {partner.departments.length > 1 ? (
                            <select
                              value={mapping?.departmentId || ''}
                              onChange={(e) => updateMapping(partner.id, 'departmentId', e.target.value)}
                              className="rounded border-gray-300 text-sm text-gray-900"
                            >
                              <option value="">選択</option>
                              {partner.departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name || d.id}</option>
                              ))}
                            </select>
                          ) : partner.departments.length === 1 ? (
                            <span className="text-gray-600 text-xs">{partner.departments[0].id.slice(0, 8)}...</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <select
                            value={mapping?.customerId || ''}
                            onChange={(e) => {
                              updateMapping(partner.id, 'customerId', e.target.value);
                              if (e.target.value && partner.departments.length === 1) {
                                updateMapping(partner.id, 'departmentId', partner.departments[0].id);
                              }
                            }}
                            className="rounded border-gray-300 text-sm text-gray-900 max-w-xs"
                          >
                            <option value="">-- 未選択 --</option>
                            {customers
                              .filter(c => c.contractStatus !== 'cancelled')
                              .sort((a, b) => a.companyName.localeCompare(b.companyName, 'ja'))
                              .map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.companyName} {c.hasMfBilling ? '(設定済)' : ''}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {matchedCustomer?.hasMfBilling ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">設定済</span>
                          ) : mapping ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">マッピング済</span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">未設定</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-4 text-sm text-gray-500">
                MF取引先: {mfPartners.length}件 / マッピング済: {Object.keys(mappings).length}件 / 自動マッチ: {mfPartners.filter(p => p.matchedCustomerId).length}件
              </div>
            </div>
          )}

          {mfPartners.length === 0 && !dataLoading && (
            <p className="text-gray-500 text-center py-8">
              「MFデータ取得」ボタンでMoneyForwardの取引先データを読み込みます
            </p>
          )}
        </div>
      )}

      {/* Step 2: 請求情報取り込み */}
      {step === 'billing-import' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              請求書データから品目・スケジュールを取り込み
            </h2>
            <button
              onClick={fetchBillings}
              disabled={billingLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {billingLoading ? '読み込み中...' : 'MF請求書データ取得'}
            </button>
          </div>

          {Object.entries(departmentBillings).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(departmentBillings).map(([deptId, dept]) => {
                const customerId = getMappedCustomerId(deptId);
                const customer = customers.find(c => c.id === customerId);

                return (
                  <div key={deptId} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{dept.partnerName}</h3>
                        <p className="text-xs text-gray-500">部署ID: {deptId}</p>
                        {customer && (
                          <p className="text-sm text-indigo-600 mt-1">→ {customer.companyName}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">請求書: {dept.billings.length}件</p>
                        <p className="text-sm font-medium">
                          スケジュール: {getScheduleLabel(dept.suggestedSchedule)}
                        </p>
                      </div>
                    </div>

                    {/* 推定品目 */}
                    {dept.suggestedItems.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">品目（最新請求書から）:</p>
                        <div className="bg-gray-50 rounded p-2">
                          {dept.suggestedItems.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700">{item.name}</span>
                              <span className="text-gray-900 font-medium">
                                ¥{item.price.toLocaleString()} x {item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 保存ボタン */}
                    {customer && dept.suggestedItems.length > 0 && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => saveBillingInfo(
                            customer.id,
                            deptId,
                            dept.suggestedItems,
                            dept.suggestedSchedule
                          )}
                          disabled={savingBilling === deptId}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-400"
                        >
                          {savingBilling === deptId ? '保存中...' : 'この顧客に保存'}
                        </button>
                      </div>
                    )}
                    {!customer && (
                      <p className="mt-2 text-xs text-yellow-600">
                        Step 1 でこの取引先をマッピングしてください
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              {billingLoading
                ? '請求書データを読み込み中...'
                : '「MF請求書データ取得」ボタンで請求履歴を読み込みます'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
