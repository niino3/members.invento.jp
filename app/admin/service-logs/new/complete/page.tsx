'use client';

import Link from 'next/link';

export default function ServiceLogCompletePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white shadow rounded-lg p-8 text-center space-y-6">
        <div className="text-green-500">
          <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">サービスログを登録しました</h1>
        <div className="flex justify-center">
          <Link
            href="/admin/service-logs/new"
            className="px-6 py-3 text-base font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            続けて新規登録
          </Link>
        </div>
      </div>
    </div>
  );
}
