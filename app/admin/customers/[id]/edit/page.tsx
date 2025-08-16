'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomer, updateCustomer } from '@/lib/firebase/customers';
import { getServices } from '@/lib/firebase/services';
import { Customer } from '@/types/customer';
import { Service } from '@/types/service';
import CustomerForm from '@/components/CustomerForm';

export default function CustomerEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const customerId = params.id as string;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    loadData();
  }, [user, router, customerId]);

  const loadData = async () => {
    try {
      const [customerData, servicesData] = await Promise.all([
        getCustomer(customerId),
        getServices()
      ]);
      
      setCustomer(customerData);
      setServices(servicesData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!customer || !user) return;

    setSaving(true);
    try {
      await updateCustomer(customer.id, customerData, user.uid);
      alert('顧客情報を更新しました');
      router.push(`/admin/customers/${customer.id}`);
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('顧客情報の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-600">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600">顧客が見つかりません</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">顧客情報編集</h1>
          <p className="mt-2 text-gray-600">
            {customer.companyName} の情報を編集します
          </p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">顧客情報</h2>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push(`/admin/customers/${customer.id}`)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                キャンセル
              </button>
            </div>
          </div>

          <div className="p-6">
            <CustomerForm
              customer={customer}
              isEdit={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}