'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createCustomer, updateCustomer } from '@/lib/firebase/customers';
import { getServices } from '@/lib/firebase/services';
import { Customer, CreateCustomerInput, UpdateCustomerInput, CompanyType, PaymentMethod, InvoiceDeliveryMethod, ContractStatus } from '@/types/customer';
import { Service } from '@/types/service';
import { jstStringToDate } from '@/lib/utils/date';

interface CustomerFormProps {
  customer?: Customer;
  isEdit?: boolean;
}

export default function CustomerForm({ customer, isEdit = false }: CustomerFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [forwardingAddressLoading, setForwardingAddressLoading] = useState(false);

  const [formData, setFormData] = useState({
    companyType: (customer?.companyType || 'corporate') as CompanyType,
    companyName: customer?.companyName || '',
    companyNameKana: customer?.companyNameKana || '',
    contactName: customer?.contactName || '',
    postalCode: customer?.postalCode || '',
    address1: customer?.address1 || '',
    address2: customer?.address2 || '',
    forwardingPostalCode: customer?.forwardingPostalCode || '',
    forwardingAddress1: customer?.forwardingAddress1 || '',
    forwardingAddress2: customer?.forwardingAddress2 || '',
    phoneNumber: customer?.phoneNumber || '',
    email: customer?.email || '',
    contractStartDate: customer?.contractStartDate ? 
      customer.contractStartDate.toISOString().split('T')[0] : '',
    contractEndDate: customer?.contractEndDate ? 
      customer.contractEndDate.toISOString().split('T')[0] : '',
    contractStatus: (customer?.contractStatus || 'active') as ContractStatus,
    paymentMethod: (customer?.paymentMethod || '') as PaymentMethod,
    dedicatedPhoneNumber: customer?.dedicatedPhoneNumber || '',
    dedicatedPhoneForwardingNumber: customer?.dedicatedPhoneForwardingNumber || '',
    invoiceRequired: customer?.invoiceRequired || false,
    invoiceDeliveryMethod: (customer?.invoiceDeliveryMethod || '') as InvoiceDeliveryMethod,
    serviceIds: customer?.serviceIds || [],
    notes: customer?.notes || '',
  });

  // サービス一覧を取得
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const fetchedServices = await getServices(false); // インデックスエラー回避のため全てのサービスを取得
        setServices(fetchedServices.filter(service => service.isActive)); // クライアント側でフィルター
      } catch (error) {
        console.error('Failed to fetch services:', error);
        // エラーの場合は空配列を設定
        setServices([]);
      }
    };
    fetchServices();
  }, []);

  // 郵便番号から住所を取得
  const fetchAddressFromPostalCode = async (postalCode: string, isForwarding = false) => {
    if (!postalCode || postalCode.length < 7) return;
    
    // ハイフンを除去
    const cleanPostalCode = postalCode.replace(/[^\d]/g, '');
    if (cleanPostalCode.length !== 7) return;

    try {
      if (isForwarding) {
        setForwardingAddressLoading(true);
      } else {
        setAddressLoading(true);
      }

      // zipcloud APIを使用（無料の郵便番号検索API）
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanPostalCode}`);
      const data = await response.json();

      if (data.status === 200 && data.results && data.results.length > 0) {
        const result = data.results[0];
        const address = `${result.address1}${result.address2}${result.address3}`;
        
        if (isForwarding) {
          setFormData(prev => ({
            ...prev,
            forwardingAddress1: address,
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            address1: address,
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch address:', error);
    } finally {
      if (isForwarding) {
        setForwardingAddressLoading(false);
      } else {
        setAddressLoading(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleServiceChange = (serviceId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      serviceIds: checked 
        ? [...prev.serviceIds, serviceId]
        : prev.serviceIds.filter(id => id !== serviceId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      // 日付の変換（JST文字列をUTC Dateオブジェクトに変換）
      const contractStartDate = formData.contractStartDate ? jstStringToDate(formData.contractStartDate) : undefined;
      const contractEndDate = formData.contractEndDate ? jstStringToDate(formData.contractEndDate) : undefined;

      // undefinedを除去してFirestore用のデータを準備
      const cleanData = {
        companyType: formData.companyType,
        companyName: formData.companyName,
        companyNameKana: formData.companyNameKana,
        contactName: formData.contactName,
        invoiceRequired: formData.invoiceRequired,
        serviceIds: formData.serviceIds,
        ...(formData.postalCode && { postalCode: formData.postalCode }),
        ...(formData.address1 && { address1: formData.address1 }),
        ...(formData.address2 && { address2: formData.address2 }),
        ...(formData.forwardingPostalCode && { forwardingPostalCode: formData.forwardingPostalCode }),
        ...(formData.forwardingAddress1 && { forwardingAddress1: formData.forwardingAddress1 }),
        ...(formData.forwardingAddress2 && { forwardingAddress2: formData.forwardingAddress2 }),
        ...(formData.phoneNumber && { phoneNumber: formData.phoneNumber }),
        ...(formData.email && { email: formData.email }),
        ...(contractStartDate && { contractStartDate }),
        ...(contractEndDate && { contractEndDate }),
        contractStatus: formData.contractStatus,
        ...(formData.paymentMethod && { paymentMethod: formData.paymentMethod }),
        ...(formData.dedicatedPhoneNumber && { dedicatedPhoneNumber: formData.dedicatedPhoneNumber }),
        ...(formData.dedicatedPhoneForwardingNumber && { dedicatedPhoneForwardingNumber: formData.dedicatedPhoneForwardingNumber }),
        ...(formData.invoiceDeliveryMethod && { invoiceDeliveryMethod: formData.invoiceDeliveryMethod }),
        ...(formData.notes && { notes: formData.notes }),
      };

      if (isEdit && customer) {
        // 更新
        const updateData = {
          ...cleanData,
          updatedBy: user.uid,
        };
        await updateCustomer(customer.id, updateData, user.uid, user.email || '管理者');
        router.push(`/admin/customers/${customer.id}`);
      } else {
        // 新規作成
        const createData: CreateCustomerInput = cleanData;
        const customerId = await createCustomer(createData, user.uid, user.email || '管理者');
        
        // メールアドレスが設定されている場合、自動的にユーザーアカウントを作成
        if (formData.email) {
          try {
            const response = await fetch('/api/create-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: formData.email,
                customerId: customerId,
                role: 'user',
              }),
            });
            
            const result = await response.json();
            
            if (response.ok) {
              alert(`顧客とユーザーアカウントが作成されました。\n\nメールアドレス: ${formData.email}\n初期パスワード: ${result.initialPassword}\n\nこの情報を顧客に安全にお伝えください。`);
            } else {
              console.warn('User account creation failed:', result.error);
              alert(`顧客は作成されましたが、ユーザーアカウントの作成に失敗しました。\nエラー: ${result.error}\n\n後で手動で作成してください。`);
            }
          } catch (error) {
            console.error('Failed to create user account:', error);
            alert('顧客は作成されましたが、ユーザーアカウントの作成に失敗しました。\n後で手動で作成してください。');
          }
        }
        
        router.push(`/admin/customers/${customerId}`);
      }
    } catch (error) {
      console.error('Failed to save customer:', error);
      setError('顧客情報の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* 基本情報 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">基本情報</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              法人・個人種別 <span className="text-red-500">*</span>
            </label>
            <select
              name="companyType"
              value={formData.companyType}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            >
              <option value="corporate">法人</option>
              <option value="individual">個人</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.companyType === 'corporate' ? '会社名' : '氏名'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.companyType === 'corporate' ? '会社名カナ' : '氏名カナ'}
            </label>
            <input
              type="text"
              name="companyNameKana"
              value={formData.companyNameKana}
              onChange={handleInputChange}
              placeholder="カタカナで入力してください"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              担当者名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="contactName"
              value={formData.contactName}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* 住所情報 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">住所情報</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleInputChange}
                placeholder="123-4567"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
              />
              <button
                type="button"
                onClick={() => fetchAddressFromPostalCode(formData.postalCode)}
                disabled={addressLoading || !formData.postalCode}
                className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addressLoading ? '取得中...' : '住所取得'}
              </button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">住所1</label>
            <input
              type="text"
              name="address1"
              value={formData.address1}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">住所2</label>
            <input
              type="text"
              name="address2"
              value={formData.address2}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            />
          </div>
        </div>

        <h4 className="text-md font-medium text-gray-900 mt-6 mb-4">転送先住所</h4>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">転送先郵便番号</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="forwardingPostalCode"
                value={formData.forwardingPostalCode}
                onChange={handleInputChange}
                placeholder="123-4567"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
              />
              <button
                type="button"
                onClick={() => fetchAddressFromPostalCode(formData.forwardingPostalCode, true)}
                disabled={forwardingAddressLoading || !formData.forwardingPostalCode}
                className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {forwardingAddressLoading ? '取得中...' : '住所取得'}
              </button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">転送先住所1</label>
            <input
              type="text"
              name="forwardingAddress1"
              value={formData.forwardingAddress1}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">転送先住所2</label>
            <input
              type="text"
              name="forwardingAddress2"
              value={formData.forwardingAddress2}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* 契約情報 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">契約情報</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">契約開始日</label>
            <input
              type="date"
              name="contractStartDate"
              value={formData.contractStartDate}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">契約終了日</label>
            <input
              type="date"
              name="contractEndDate"
              value={formData.contractEndDate}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">契約状態</label>
            <select
              name="contractStatus"
              value={formData.contractStatus}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            >
              <option value="active">有効</option>
              <option value="cancelled">解約済み</option>
              <option value="suspended">停止中</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">支払い方法</label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            >
              <option value="">選択してください</option>
              <option value="bank_transfer">振込</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>
        </div>
      </div>

      {/* 専用電話番号 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">専用電話番号</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">専用電話番号</label>
            <input
              type="tel"
              name="dedicatedPhoneNumber"
              value={formData.dedicatedPhoneNumber}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">専用電話転送先番号</label>
            <input
              type="tel"
              name="dedicatedPhoneForwardingNumber"
              value={formData.dedicatedPhoneForwardingNumber}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* 請求書設定 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">請求書設定</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="invoiceRequired"
              checked={formData.invoiceRequired}
              onChange={handleInputChange}
              className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              請求書送付が必要
            </label>
          </div>

          {formData.invoiceRequired && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">請求書送付方法</label>
              <select
                name="invoiceDeliveryMethod"
                value={formData.invoiceDeliveryMethod}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
              >
                <option value="">選択してください</option>
                <option value="email">メール</option>
                <option value="postal">郵送</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* サービス選択 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">利用サービス</h3>
        {services.length === 0 ? (
          <p className="text-gray-500">利用可能なサービスがありません</p>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.serviceIds.includes(service.id)}
                  onChange={(e) => handleServiceChange(service.id, e.target.checked)}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700">
                    {service.name}
                  </label>
                  {service.description && (
                    <p className="text-sm text-gray-500">{service.description}</p>
                  )}
                  {service.price && (
                    <p className="text-sm text-gray-600">
                      ¥{service.price.toLocaleString()} / {service.billingCycle === 'monthly' ? '月' : service.billingCycle === 'yearly' ? '年' : '回'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 備考 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">備考</h3>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 px-3 py-2"
          placeholder="その他の備考があれば記入してください"
        />
      </div>

      {/* 送信ボタン */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? '保存中...' : (isEdit ? '更新' : '登録')}
        </button>
      </div>
    </form>
  );
}