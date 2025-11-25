'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getInquiryStats } from '@/lib/firebase/inquiries';
import { getRecentActivities, formatActivityMessage, getActivityIcon } from '@/lib/firebase/activities';
import { Activity } from '@/types/activity';
import { formatJSTDate } from '@/lib/utils/date';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalServices: 0,
    pendingInquiries: 0,
    monthlyRevenue: 0,
  });
  const [inquiryStats, setInquiryStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  // 統計データと最近の活動を取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 並行してデータを取得
        const [inquiryData, activities] = await Promise.all([
          getInquiryStats(),
          getRecentActivities(5)
        ]);
        
        setInquiryStats(inquiryData);
        setStats({
          totalCustomers: 15,
          totalServices: 5,
          pendingInquiries: inquiryData.pending,
          monthlyRevenue: 250000,
        });
        setRecentActivities(activities);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  const quickActions = [
    {
      name: '新規顧客登録',
      href: '/admin/customers/new',
      icon: '👤',
      description: '新しい顧客を登録',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      name: 'サービス追加',
      href: '/admin/services/new',
      icon: '⚙️',
      description: '新しいサービスを追加',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      name: '顧客一覧',
      href: '/admin/customers',
      icon: '📋',
      description: '全顧客を表示',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      name: '問い合わせ確認',
      href: '/admin/inquiries',
      icon: '📧',
      description: '未対応の問い合わせ',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
  ];

  const statsCards = [
    {
      name: '総顧客数',
      value: stats.totalCustomers,
      icon: '👥',
      change: '+2',
      changeType: 'increase',
    },
    {
      name: '提供サービス数',
      value: stats.totalServices,
      icon: '⚙️',
      change: '+1',
      changeType: 'increase',
    },
    {
      name: '未対応問い合わせ',
      value: stats.pendingInquiries,
      icon: '📧',
      change: '-1',
      changeType: 'decrease',
    },
    {
      name: '月次売上',
      value: `¥${stats.monthlyRevenue.toLocaleString()}`,
      icon: '💰',
      change: '+5%',
      changeType: 'increase',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500">
          システムの概要と主要な統計情報
        </p>
      </div>

      {/* 問い合わせ通知 */}
      {stats.pendingInquiries > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <Link href="/admin/inquiries" className="font-medium underline hover:text-yellow-600">
                  {stats.pendingInquiries}件の未回答の問い合わせ
                </Link>
                があります。確認してください。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {statsCards.map((card) => (
          <div
            key={card.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">{card.icon}</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {card.value}
                      </div>
                      <div
                        className={`ml-2 flex items-baseline text-sm font-semibold ${
                          card.changeType === 'increase'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {card.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* クイックアクション */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">クイックアクション</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className={`${action.color} text-white rounded-lg p-6 block hover:shadow-lg transition-shadow duration-200`}
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">{action.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold">{action.name}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 最近の活動 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            最近の活動
          </h3>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-gray-500">最近の活動はありません</p>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => {
                const now = new Date();
                const diff = now.getTime() - activity.createdAt.getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const days = Math.floor(hours / 24);
                
                let timeAgo = '';
                if (days > 0) {
                  timeAgo = `${days}日前`;
                } else if (hours > 0) {
                  timeAgo = `${hours}時間前`;
                } else {
                  const minutes = Math.floor(diff / (1000 * 60));
                  timeAgo = minutes > 0 ? `${minutes}分前` : '今';
                }
                
                return (
                  <div key={activity.id} className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">{getActivityIcon(activity.type)}</span>
                    <span className="flex-1">{formatActivityMessage(activity)}</span>
                    <span className="ml-auto text-xs text-gray-400">{timeAgo}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}