'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Customer } from '@/types/customer';
import { InquiryCategory, InquiryPriority } from '@/types/request';

export default function InquiryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [category, setCategory] = useState<InquiryCategory>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<InquiryPriority>('medium');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'user') {
      router.push('/admin');
      return;
    }

    loadCustomer();
  }, [user, router]);

  const loadCustomer = async () => {
    try {
      if (!user?.customerId) {
        console.error('Customer ID not found');
        return;
      }

      const customersQuery = query(
        collection(db, 'customers'),
        where('__name__', '==', user.customerId)
      );
      const customerSnapshot = await getDocs(customersQuery);
      if (!customerSnapshot.empty) {
        const customerData = { id: customerSnapshot.docs[0].id, ...customerSnapshot.docs[0].data() } as Customer;
        setCustomer(customerData);
      }
    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.customerId || !subject.trim() || !message.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'inquiries'), {
        customerId: user.customerId,
        customerEmail: user.email,
        category,
        subject: subject.trim(),
        message: message.trim(),
        priority,
        status: 'open',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      alert('お問い合わせを送信しました。お返事までしばらくお待ちください。');
      setSubject('');
      setMessage('');
      setCategory('general');
      setPriority('medium');
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      alert('お問い合わせの送信に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">お問い合わせ</h1>
          <p className="mt-2 text-gray-600">
            ご質問、ご不明な点がございましたらお気軽にお問い合わせください。
          </p>
        </div>

        {customer && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">お客様情報</h2>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">会社名：</span>
                  <span className="ml-2 text-gray-900">{customer.companyName}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">担当者：</span>
                  <span className="ml-2 text-gray-900">{customer.contactName}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">メールアドレス：</span>
                  <span className="ml-2 text-gray-900">{user?.email}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">お問い合わせ内容</h2>
          </div>
          <div className="px-6 py-4 space-y-6">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                カテゴリ
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as InquiryCategory)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="general">一般的なお問い合わせ</option>
                <option value="technical">技術的なお問い合わせ</option>
                <option value="billing">請求・支払いに関するお問い合わせ</option>
                <option value="other">その他</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                優先度
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as InquiryPriority)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">緊急</option>
              </select>
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                件名
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="お問い合わせの件名をご入力ください"
                required
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                お問い合わせ内容
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="詳細な内容をご記入ください"
                required
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting || !subject.trim() || !message.trim()}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '送信中...' : 'お問い合わせを送信'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            通常、1-2営業日以内にご返答いたします。緊急の場合は電話でお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
}