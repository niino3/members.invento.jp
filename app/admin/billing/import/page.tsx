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
  mfDepartmentId?: string;
}

interface BillingItem {
  name: string;
  price: number;
  quantity: number;
  excise: string;
}

interface BillingRecord {
  id: string;
  billingDate: string;
  dueDate: string;
  title: string;
  totalAmount: number;
  status: string;
  departmentId: string;
  partnerName: string;
  items: BillingItem[];
}

interface BillingAnalysis {
  departmentId: string;
  customerName: string;
  customerId: string;
  totalBillings: number;
  billings: BillingRecord[];
  suggestedItems: BillingItem[];
  suggestedSchedule: { type: string; months: number[] };
  analysis: {
    isVariable: boolean;
    uniqueAmounts: number[];
    amountCount: number;
    latestAmount: number;
  };
  status: 'pending' | 'loading' | 'loaded' | 'saved' | 'error';
  error?: string;
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
  const [analyses, setAnalyses] = useState<BillingAnalysis[]>([]);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [fetchProgress, setFetchProgress] = useState({ done: 0, total: 0 });
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

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

  const updateMapping = (partnerId: string, field: 'customerId' | 'departmentId', value: string) => {
    setMappings(prev => {
      const current = prev[partnerId] || { customerId: '', departmentId: '' };
      if (!value) {
        const next = { ...prev };
        delete next[partnerId];
        return next;
      }
      return { ...prev, [partnerId]: { ...current, [field]: value } };
    });
  };

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
    let successCount = 0;
    let failCount = 0;
    try {
      for (const mapping of validMappings) {
        try {
          const response = await fetch('/api/moneyforward/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mappings: [mapping] }),
          });
          if (response.ok) {
            successCount++;
            setMessage(`保存中... ${successCount}/${validMappings.length}件`);
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }
      setMessage(`${successCount}件保存成功${failCount > 0 ? `、${failCount}件失敗` : ''}`);
    } catch (err) {
      setError('マッピングの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // Step 2: 全請求書をページ単位で取得し、department_idでグルーピング
  const fetchAllBillings = async () => {
    setFetchingAll(true);
    setError('');
    setAnalyses([]);

    try {
      // 1. マッピング済み顧客一覧を取得（departmentId付き）
      const custResponse = await fetch('/api/moneyforward/import');
      if (!custResponse.ok) throw new Error('Failed to fetch customers');
      const custData = await custResponse.json();
      setCustomers(custData.customers);

      const mappedCustomers = (custData.customers as FirestoreCustomer[]).filter(c => c.hasMfBilling && c.mfDepartmentId);
      if (mappedCustomers.length === 0) {
        setError('マッピング済みの顧客がありません。Step 1 を先に実行してください。');
        setFetchingAll(false);
        return;
      }

      // departmentId → customer のマップ
      const deptToCustomer: Record<string, FirestoreCustomer> = {};
      for (const c of mappedCustomers) {
        if (c.mfDepartmentId) deptToCustomer[c.mfDepartmentId] = c;
      }

      // 2. 全請求書をページ単位で取得
      let allBillings: BillingRecord[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        setFetchProgress({ done: allBillings.length, total: -1 });
        setMessage(`請求書を取得中... ${allBillings.length}件 (ページ${page})`);

        const billResponse = await fetch(`/api/moneyforward/import/billings?page=${page}`);
        if (!billResponse.ok) throw new Error(`Failed to fetch page ${page}`);
        const billData = await billResponse.json();

        allBillings = allBillings.concat(billData.billings);
        hasMore = billData.hasMore;

        // 最初のページでMF APIのフィールド名を表示
        if (page === 1 && billData.debug?.sampleKeys) {
          console.log('MF billing fields:', billData.debug.sampleKeys);
        }

        page++;

        // 安全策: 最大20ページ
        if (page > 20) break;
      }

      setMessage(`${allBillings.length}件の請求書を取得しました。分析中...`);

      // 3. department_id でグルーピング
      const byDept: Record<string, BillingRecord[]> = {};
      for (const b of allBillings) {
        const deptId = (b as any).departmentId || '';
        if (!deptId) continue;
        if (!byDept[deptId]) byDept[deptId] = [];
        byDept[deptId].push(b);
      }

      // 4. マッピング済み顧客ごとに分析
      const results: BillingAnalysis[] = [];

      for (const customer of mappedCustomers) {
        const deptId = customer.mfDepartmentId!;
        const billings = (byDept[deptId] || []).sort(
          (a, b) => (b.billingDate || '').localeCompare(a.billingDate || '')
        );

        const suggestedItems = billings.length > 0 ? billings[0].items : [];

        // スケジュール推定
        const months = new Set<number>();
        for (const b of billings) {
          if (b.billingDate) {
            const m = parseInt(b.billingDate.split('-')[1]);
            if (m) months.add(m);
          }
        }
        const monthCount = months.size;
        let suggestedSchedule: { type: string; months: number[] };
        if (monthCount >= 10) {
          suggestedSchedule = { type: 'monthly', months: [] };
        } else if (monthCount >= 4 && monthCount <= 5) {
          suggestedSchedule = { type: 'quarterly', months: Array.from(months).sort((a, b) => a - b) };
        } else if (monthCount === 2 || monthCount === 3) {
          suggestedSchedule = { type: 'biannual', months: Array.from(months).sort((a, b) => a - b) };
        } else if (monthCount === 1) {
          suggestedSchedule = { type: 'yearly', months: Array.from(months) };
        } else {
          suggestedSchedule = { type: 'monthly', months: [] };
        }

        // 金額変動分析
        const amounts = billings.map(b => b.totalAmount).filter(a => a > 0);
        const uniqueAmounts = Array.from(new Set(amounts));
        const isVariable = uniqueAmounts.length > 2;

        results.push({
          departmentId: deptId,
          customerName: customer.companyName,
          customerId: customer.id,
          totalBillings: billings.length,
          billings,
          suggestedItems,
          suggestedSchedule,
          analysis: {
            isVariable,
            uniqueAmounts: uniqueAmounts.sort((a, b) => b - a),
            amountCount: uniqueAmounts.length,
            latestAmount: amounts[0] || 0,
          },
          status: billings.length > 0 ? 'loaded' : 'error',
          error: billings.length === 0 ? '請求書が見つかりません' : undefined,
        });
      }

      setAnalyses(results);
      setFetchProgress({ done: results.length, total: results.length });
      setMessage(`${results.filter(r => r.status === 'loaded').length}/${mappedCustomers.length}件の顧客の請求データを分析しました`);
    } catch (err) {
      setError(`データ取得に失敗: ${err}`);
    } finally {
      setFetchingAll(false);
    }
  };

  // 個別の請求情報を保存
  const saveBillingInfo = async (analysis: BillingAnalysis) => {
    setAnalyses(prev => prev.map(a =>
      a.departmentId === analysis.departmentId ? { ...a, status: 'loading' as const } : a
    ));
    try {
      const response = await fetch('/api/moneyforward/import/billings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: analysis.customerId,
          departmentId: analysis.departmentId,
          title: extractTitle(analysis.billings),
          items: analysis.suggestedItems,
          schedule: analysis.suggestedSchedule,
          billingScope: 'current',
          variable: analysis.analysis?.isVariable || false,
          notes: analysis.analysis?.isVariable
            ? `金額変動あり (${(analysis.analysis?.uniqueAmounts || []).map(a => '¥' + a.toLocaleString()).join(', ')})`
            : '',
        }),
      });
      if (!response.ok) throw new Error('Failed to save');
      setAnalyses(prev => prev.map(a =>
        a.departmentId === analysis.departmentId ? { ...a, status: 'saved' as const } : a
      ));
    } catch (err) {
      setAnalyses(prev => prev.map(a =>
        a.departmentId === analysis.departmentId ? { ...a, status: 'error' as const, error: String(err) } : a
      ));
    }
  };

  // 全件一括保存
  const saveAll = async () => {
    const targets = analyses.filter(a => a.status === 'loaded' && a.suggestedItems.length > 0);
    for (const analysis of targets) {
      await saveBillingInfo(analysis);
    }
    setMessage(`${targets.length}件の請求情報を保存しました`);
  };

  // 最新の請求書タイトルから年月部分を除去して件名を抽出
  const extractTitle = (billings: BillingRecord[]): string => {
    if (billings.length === 0) return '';
    const latestTitle = billings[0].title || '';
    // 「2026年4月分 」「2026年04月分」「2026/4 」等のパターンを除去
    return latestTitle
      .replace(/\d{4}年\d{1,2}月分\s*/g, '')
      .replace(/\d{4}\/\d{1,2}\s*/g, '')
      .trim();
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

  const variableCustomers = analyses.filter(a => a.analysis?.isVariable);
  const fixedCustomers = analyses.filter(a => a.analysis && !a.analysis.isVariable && a.status === 'loaded');

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

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setStep('mapping')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              step === 'mapping' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Step 1: 取引先マッピング
          </button>
          <button
            onClick={() => setStep('billing-import')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              step === 'billing-import' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Step 2: 請求履歴分析・取り込み
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded">{message}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      {/* Step 1: 取引先マッピング */}
      {step === 'mapping' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">MF取引先 → Firestore顧客 マッピング</h2>
            <div className="flex gap-2">
              <button onClick={fetchData} disabled={dataLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400">
                {dataLoading ? '読み込み中...' : 'MFデータ取得'}
              </button>
              {Object.keys(mappings).length > 0 && (
                <button onClick={saveMappings} disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400">
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
                            <select value={mapping?.departmentId || ''}
                              onChange={(e) => updateMapping(partner.id, 'departmentId', e.target.value)}
                              className="rounded border-gray-300 text-sm text-gray-900">
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
                          <select value={mapping?.customerId || ''}
                            onChange={(e) => {
                              updateMapping(partner.id, 'customerId', e.target.value);
                              if (e.target.value && partner.departments.length === 1) {
                                updateMapping(partner.id, 'departmentId', partner.departments[0].id);
                              }
                            }}
                            className="rounded border-gray-300 text-sm text-gray-900 max-w-xs">
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
            <p className="text-gray-500 text-center py-8">「MFデータ取得」ボタンでMoneyForwardの取引先データを読み込みます</p>
          )}
        </div>
      )}

      {/* Step 2: 請求履歴分析 */}
      {step === 'billing-import' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">請求履歴分析・取り込み</h2>
              <div className="flex gap-2">
                <button onClick={fetchAllBillings} disabled={fetchingAll}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400">
                  {fetchingAll ? `取得中... ${fetchProgress.done}/${fetchProgress.total}` : '請求履歴を取得・分析'}
                </button>
                {analyses.filter(a => a.status === 'loaded').length > 0 && (
                  <button onClick={saveAll}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                    全件一括保存
                  </button>
                )}
              </div>
            </div>

            {/* サマリー */}
            {analyses.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-sm text-gray-500">取得済み</p>
                  <p className="text-xl font-bold">{analyses.filter(a => a.status !== 'error').length}件</p>
                </div>
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-sm text-blue-500">定額</p>
                  <p className="text-xl font-bold text-blue-700">{fixedCustomers.length}件</p>
                </div>
                <div className="bg-yellow-50 rounded p-3">
                  <p className="text-sm text-yellow-600">金額変動あり</p>
                  <p className="text-xl font-bold text-yellow-700">{variableCustomers.length}件</p>
                </div>
                <div className="bg-red-50 rounded p-3">
                  <p className="text-sm text-red-500">エラー</p>
                  <p className="text-xl font-bold text-red-700">{analyses.filter(a => a.status === 'error').length}件</p>
                </div>
              </div>
            )}
          </div>

          {/* 金額変動ありの顧客（要確認） */}
          {variableCustomers.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-yellow-700 mb-4">
                要確認: 金額変動あり ({variableCustomers.length}件)
              </h3>
              <div className="space-y-3">
                {variableCustomers.map((a) => (
                  <div key={a.departmentId} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{a.customerName}</h4>
                        <p className="text-sm text-gray-600">
                          請求書: {a.totalBillings}件 / スケジュール: {getScheduleLabel(a.suggestedSchedule)}
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          金額パターン: {a.analysis.uniqueAmounts.map(amt => `¥${amt.toLocaleString()}`).join(' / ')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setExpandedDept(expandedDept === a.departmentId ? null : a.departmentId)}
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                        >
                          {expandedDept === a.departmentId ? '閉じる' : '履歴を見る'}
                        </button>
                        <button onClick={() => saveBillingInfo(a)}
                          disabled={a.status === 'saved'}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-400">
                          {a.status === 'saved' ? '保存済' : '保存'}
                        </button>
                      </div>
                    </div>

                    {/* 最新の品目 */}
                    {a.suggestedItems.length > 0 && (
                      <div className="mt-2 bg-white rounded p-2">
                        <p className="text-xs text-gray-500 mb-1">最新の品目:</p>
                        {a.suggestedItems.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.name}</span>
                            <span className="font-medium">¥{item.price.toLocaleString()} x {item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 請求書履歴（展開） */}
                    {expandedDept === a.departmentId && (
                      <div className="mt-3 bg-white rounded p-3 max-h-64 overflow-y-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-500">
                              <th className="text-left py-1">日付</th>
                              <th className="text-left py-1">タイトル</th>
                              <th className="text-right py-1">金額</th>
                              <th className="text-left py-1">品目</th>
                            </tr>
                          </thead>
                          <tbody>
                            {a.billings.map((b) => (
                              <tr key={b.id} className="border-t border-gray-100">
                                <td className="py-1 text-gray-600">{b.billingDate}</td>
                                <td className="py-1 text-gray-700">{b.title}</td>
                                <td className="py-1 text-right font-medium">¥{b.totalAmount.toLocaleString()}</td>
                                <td className="py-1 text-gray-500 text-xs">
                                  {b.items.map(i => `${i.name}(¥${i.price.toLocaleString()})`).join(', ')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 定額顧客一覧 */}
          {fixedCustomers.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                定額顧客 ({fixedCustomers.length}件)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">顧客名</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">件名</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">スケジュール</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">金額</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">品目</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">請求書数</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">状態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {fixedCustomers.map((a) => (
                      <tr key={a.departmentId}>
                        <td className="px-4 py-2 font-medium text-gray-900">{a.customerName}</td>
                        <td className="px-4 py-2 text-gray-600 text-xs">
                          {extractTitle(a.billings) || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{getScheduleLabel(a.suggestedSchedule)}</td>
                        <td className="px-4 py-2 text-right font-medium">¥{a.analysis.latestAmount.toLocaleString()}</td>
                        <td className="px-4 py-2 text-gray-600 text-xs">
                          {a.suggestedItems.map(i => i.name).join(', ')}
                        </td>
                        <td className="px-4 py-2 text-gray-500">{a.totalBillings}件</td>
                        <td className="px-4 py-2">
                          {a.status === 'saved' ? (
                            <span className="text-green-600 text-xs font-medium">保存済</span>
                          ) : (
                            <button onClick={() => saveBillingInfo(a)}
                              className="text-indigo-600 text-xs font-medium hover:underline">保存</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {analyses.length === 0 && !fetchingAll && (
            <div className="bg-white shadow rounded-lg p-6">
              <p className="text-gray-500 text-center py-8">
                「請求履歴を取得・分析」ボタンでマッピング済み顧客の請求書データを取得します
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
