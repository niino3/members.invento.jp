'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // ログイン済みの場合はダッシュボードへ
        router.push('/dashboard');
      } else {
        // 未ログインの場合はログインページへ
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  // ローディング中の表示
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">顧客管理システム</h1>
        <p className="text-gray-600">読み込み中...</p>
      </div>
    </div>
  );
}