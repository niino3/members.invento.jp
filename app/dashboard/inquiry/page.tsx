'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCustomerByUserId } from '@/lib/firebase/customers';
import { createInquiry, getInquiriesByCustomer } from '@/lib/firebase/inquiries';
import { Customer } from '@/types/customer';
import { Inquiry, InquiryCategory, INQUIRY_CATEGORY_LABELS, INQUIRY_STATUS_LABELS } from '@/types/inquiry';
import MobileNav from '@/components/MobileNav';
import { formatJSTDate } from '@/lib/utils/date';

export default function InquiryPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [category, setCategory] = useState<InquiryCategory>('general');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && user.role === 'admin') {
      router.push('/admin');
    }
  }, [user, loading, router]);

  // 顧客情報と問い合わせ履歴を取得
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user.customerId) {
        setDataLoading(false);
        return;
      }

      try {
        const [customerData, inquiriesData] = await Promise.all([
          getCustomerByUserId(user.uid),
          getInquiriesByCustomer(user.customerId)
        ]);
        
        if (customerData) {
          setCustomer(customerData);
        }
        setInquiries(inquiriesData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (user && user.role === 'user') {
      fetchData();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customer || !user) return;
    
    setSubmitting(true);
    try {
      // Create inquiry in Firestore
      const inquiryId = await createInquiry({
        customerId: customer.id,
        customerEmail: customer.email || '',
        customerName: customer.contactName,
        companyName: customer.companyName,
        category,
        subject,
        content,
        status: 'pending'
      });
      
      // Send email notifications
      const inquiryData = {
        customerEmail: customer.email,
        customerName: customer.contactName,
        companyName: customer.companyName,
        category,
        categoryLabel: INQUIRY_CATEGORY_LABELS[category],
        subject,
        content
      };
      
      try {
        const emailResponse = await fetch('/api/send-inquiry-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inquiry: inquiryData, type: 'new' })
        });
        
        if (!emailResponse.ok) {
          const contentType = emailResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await emailResponse.json();
            console.error('Email API error:', errorData);
          } else {
            const errorText = await emailResponse.text();
            console.error('Email API error (non-JSON):', errorText);
          }
          alert('メール送信に失敗しましたが、問い合わせは保存されました。');
        } else {
          console.log('Email sent successfully');
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        alert('メール送信に失敗しましたが、問い合わせは保存されました。');
      }
      
      // Reset form and refresh inquiries
      setCategory('general');
      setSubject('');
      setContent('');
      setShowForm(false);
      
      // Refresh inquiries list
      const updatedInquiries = await getInquiriesByCustomer(customer.id);
      setInquiries(updatedInquiries);
      
      alert('お問い合わせを受け付けました。');
    } catch (error) {
      console.error('Failed to submit inquiry:', error);
      alert('送信に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!user || !customer) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* ナビゲーションバー */}
      <nav className="bg-white shadow-sm border-b border-gray-200 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                  お客様ポータル
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                >
                  ダッシュボード
                </Link>
                <Link
                  href="/dashboard/services"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                >
                  サービス詳細
                </Link>
                <Link
                  href="/dashboard/service-logs"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                >
                  サービスログ
                </Link>
                <Link
                  href="/dashboard/inquiry"
                  className="border-indigo-500 text-gray-900 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                >
                  問い合わせ
                </Link>
              </div>
            </div>
            
            {/* デスクトップメニュー */}
            <div className="hidden sm:flex sm:items-center">
              <span className="text-sm text-gray-700 mr-4">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ログアウト
              </button>
            </div>

            {/* モバイルメニュー */}
            <MobileNav userEmail={user.email || ''} onSignOut={handleSignOut} />
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* ページヘッダー */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">問い合わせ</h1>
              <p className="mt-1 text-sm text-gray-500">
                サービスに関するお問い合わせを受け付けています
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              新規問い合わせ
            </button>
          </div>

          {/* 問い合わせフォーム */}
          {showForm && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">新規問い合わせ</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    カテゴリー
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as InquiryCategory)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
                  >
                    {Object.entries(INQUIRY_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
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
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 h-10"
                    placeholder="お問い合わせの件名を入力してください"
                  />
                </div>

                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                    内容
                  </label>
                  <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={6}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
                    placeholder="お問い合わせ内容を詳しくご記入ください"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setCategory('general');
                      setSubject('');
                      setContent('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submitting ? '送信中...' : '送信'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 問い合わせ履歴 */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">問い合わせ履歴</h2>
            </div>
            {inquiries.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">まだ問い合わせはありません</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {inquiries.map((inquiry) => (
                  <div key={inquiry.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-sm font-medium text-gray-900">{inquiry.subject}</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {INQUIRY_CATEGORY_LABELS[inquiry.category]}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            inquiry.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {INQUIRY_STATUS_LABELS[inquiry.status]}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{inquiry.content}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          送信日時: {formatJSTDate(inquiry.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}