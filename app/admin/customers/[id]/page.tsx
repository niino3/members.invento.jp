'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCustomer, cancelCustomer } from '@/lib/firebase/customers';
import { getServicesByIds } from '@/lib/firebase/services';
import { Customer } from '@/types/customer';
import { Service } from '@/types/service';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userCreated, setUserCreated] = useState(false);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        setLoading(true);
        const customerData = await getCustomer(customerId);
        
        if (!customerData) {
          router.push('/admin/customers');
          return;
        }
        
        setCustomer(customerData);
        
        // 顧客が利用しているサービス情報を取得
        if (customerData.serviceIds.length > 0) {
          const serviceData = await getServicesByIds(customerData.serviceIds);
          setServices(serviceData);
        }
      } catch (error) {
        console.error('Failed to fetch customer:', error);
        router.push('/admin/customers');
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId, router]);

  const handleCancel = async () => {
    if (!customer) return;
    
    try {
      setCancelling(true);
      await cancelCustomer(customer.id);
      router.push('/admin/customers');
    } catch (error) {
      console.error('Failed to cancel customer:', error);
      alert('顧客の解約に失敗しました');
    } finally {
      setCancelling(false);
      setShowCancelConfirm(false);
    }
  };

  const handleCreateUser = async () => {
    if (!customer || !customer.email) {
      alert('顧客のメールアドレスが設定されていません');
      return;
    }

    try {
      setCreatingUser(true);
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customer.email,
          customerId: customer.id,
          role: 'user',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setUserCreated(true);
        alert(`ユーザーアカウントが作成されました。\n\nメールアドレス: ${customer.email}\n初期パスワード: ${result.initialPassword}\n\nこの情報を顧客に安全にお伝えください。`);
      } else {
        alert(`エラー: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('ユーザー作成に失敗しました');
    } finally {
      setCreatingUser(false);
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return date.toLocaleDateString('ja-JP');
  };

  const getCompanyTypeLabel = (type: string) => {
    return type === 'corporate' ? '法人' : '個人';
  };

  const getPaymentMethodLabel = (method: string | undefined) => {
    if (!method) return '-';
    return method === 'bank_transfer' ? '振込' : 'PayPal';
  };

  const getInvoiceDeliveryMethodLabel = (method: string | undefined) => {
    if (!method) return '-';
    return method === 'email' ? 'メール' : '郵送';
  };

  const getContractStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '有効';
      case 'cancelled': return '解約済み';
      case 'suspended': return '停止中';
      default: return status;
    }
  };

  const getContractStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'suspended': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>顧客が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li>
                <Link href="/admin/customers" className="text-gray-500 hover:text-gray-700">
                  顧客管理
                </Link>
              </li>
              <li>
                <span className="text-gray-400 mx-2">/</span>
                <span className="text-gray-900">{customer.companyName}</span>
              </li>
            </ol>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">{customer.companyName}</h1>
          <p className="mt-1 text-sm text-gray-500">
            顧客ID: {customer.id}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Link
            href={`/admin/customers/${customer.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            編集
          </Link>
          {customer.email && !userCreated && (
            <button
              onClick={handleCreateUser}
              disabled={creatingUser}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {creatingUser ? 'ユーザー作成中...' : 'ユーザーアカウント作成'}
            </button>
          )}
          {userCreated && (
            <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md">
              ✓ ユーザー作成済み
            </span>
          )}
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            解約
          </button>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">基本情報</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-500">法人・個人種別</label>
            <p className="mt-1 text-sm text-gray-900">{getCompanyTypeLabel(customer.companyType)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">
              {customer.companyType === 'corporate' ? '会社名' : '氏名'}
            </label>
            <p className="mt-1 text-sm text-gray-900">{customer.companyName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">担当者名</label>
            <p className="mt-1 text-sm text-gray-900">{customer.contactName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">メールアドレス</label>
            <p className="mt-1 text-sm text-gray-900">{customer.email || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">電話番号</label>
            <p className="mt-1 text-sm text-gray-900">{customer.phoneNumber || '-'}</p>
          </div>
        </div>
      </div>

      {/* 住所情報 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">住所情報</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-500">住所</label>
            <div className="mt-1 text-sm text-gray-900">
              {customer.postalCode && <div>〒{customer.postalCode}</div>}
              {customer.address1 && <div>{customer.address1}</div>}
              {customer.address2 && <div>{customer.address2}</div>}
              {!customer.postalCode && !customer.address1 && !customer.address2 && <div>-</div>}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-500">転送先住所</label>
            <div className="mt-1 text-sm text-gray-900">
              {customer.forwardingPostalCode && <div>〒{customer.forwardingPostalCode}</div>}
              {customer.forwardingAddress1 && <div>{customer.forwardingAddress1}</div>}
              {customer.forwardingAddress2 && <div>{customer.forwardingAddress2}</div>}
              {!customer.forwardingPostalCode && !customer.forwardingAddress1 && !customer.forwardingAddress2 && <div>-</div>}
            </div>
          </div>
        </div>
      </div>

      {/* 契約情報 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">契約情報</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-500">契約開始日</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(customer.contractStartDate)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">契約終了日</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(customer.contractEndDate)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">契約状態</label>
            <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getContractStatusColor(customer.contractStatus)}`}>
              {getContractStatusLabel(customer.contractStatus)}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">支払い方法</label>
            <p className="mt-1 text-sm text-gray-900">{getPaymentMethodLabel(customer.paymentMethod)}</p>
          </div>
        </div>
      </div>

      {/* 専用電話番号 */}
      {(customer.dedicatedPhoneNumber || customer.dedicatedPhoneForwardingNumber) && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">専用電話番号</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-500">専用電話番号</label>
              <p className="mt-1 text-sm text-gray-900">{customer.dedicatedPhoneNumber || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">専用電話転送先番号</label>
              <p className="mt-1 text-sm text-gray-900">{customer.dedicatedPhoneForwardingNumber || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* 請求書設定 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">請求書設定</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-500">請求書送付</label>
            <p className="mt-1 text-sm text-gray-900">{customer.invoiceRequired ? '必要' : '不要'}</p>
          </div>
          {customer.invoiceRequired && (
            <div>
              <label className="block text-sm font-medium text-gray-500">送付方法</label>
              <p className="mt-1 text-sm text-gray-900">{getInvoiceDeliveryMethodLabel(customer.invoiceDeliveryMethod)}</p>
            </div>
          )}
        </div>
      </div>

      {/* 利用サービス */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">利用サービス</h3>
        {services.length === 0 ? (
          <p className="text-gray-500">利用中のサービスはありません</p>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{service.name}</h4>
                    {service.description && (
                      <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                    )}
                  </div>
                  {service.price && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ¥{service.price.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        / {service.billingCycle === 'monthly' ? '月' : service.billingCycle === 'yearly' ? '年' : '回'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 備考 */}
      {customer.notes && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">備考</h3>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{customer.notes}</p>
        </div>
      )}

      {/* メタ情報 */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">作成・更新情報</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-500">作成日時</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(customer.createdAt)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">更新日時</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(customer.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* 解約確認モーダル */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">顧客の解約</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  「{customer.companyName}」を解約してもよろしいですか？
                  <br />
                  この操作は取り消せません。
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 mr-2"
                >
                  {cancelling ? '解約中...' : '解約'}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="mt-3 px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}