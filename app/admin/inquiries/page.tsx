'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllInquiries, updateInquiryStatus } from '@/lib/firebase/inquiries';
import { Inquiry, InquiryStatus, INQUIRY_CATEGORY_LABELS, INQUIRY_STATUS_LABELS } from '@/types/inquiry';
import { formatJSTDate } from '@/lib/utils/date';

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all');

  useEffect(() => {
    fetchInquiries();
  }, [statusFilter]);

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const { inquiries: data } = await getAllInquiries(
        statusFilter === 'all' ? undefined : statusFilter
      );
      setInquiries(data);
    } catch (error) {
      console.error('Failed to fetch inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (inquiryId: string, newStatus: InquiryStatus) => {
    try {
      await updateInquiryStatus(inquiryId, newStatus);
      await fetchInquiries();
    } catch (error) {
      console.error('Failed to update inquiry status:', error);
      alert('ステータスの更新に失敗しました');
    }
  };


  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">問い合わせ管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            顧客からの問い合わせを管理します
          </p>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">ステータス:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InquiryStatus | 'all')}
            className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="all">すべて</option>
            <option value="pending">未回答</option>
            <option value="resolved">回答済み</option>
          </select>
        </div>
      </div>

      {/* 問い合わせ一覧 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">読み込み中...</p>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">問い合わせはありません</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {inquiries.map((inquiry) => (
              <li key={inquiry.id}>
                <div className="px-6 py-4">
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
                      <div className="text-sm text-gray-600 mb-2">
                        <p><strong>会社名:</strong> {inquiry.companyName}</p>
                        <p><strong>お名前:</strong> {inquiry.customerName}</p>
                        <p><strong>メール:</strong> {inquiry.customerEmail}</p>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">{inquiry.content}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        受信日時: {formatJSTDate(inquiry.createdAt)}
                      </p>
                    </div>
                    <div className="ml-4">
                      <select
                        value={inquiry.status}
                        onChange={(e) => handleStatusChange(inquiry.id, e.target.value as InquiryStatus)}
                        className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="pending">未回答</option>
                        <option value="resolved">回答済み</option>
                      </select>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}