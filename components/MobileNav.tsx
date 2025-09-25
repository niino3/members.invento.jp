'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileNavProps {
  userEmail: string;
  onSignOut: () => void;
}

export default function MobileNav({ userEmail, onSignOut }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const navItems = [
    { href: '/dashboard', label: 'ダッシュボード' },
    { href: '/dashboard/services', label: 'サービス詳細' },
    { href: '/dashboard/service-logs', label: 'サービスログ' },
    { href: '/dashboard/inquiry', label: '問い合わせ' },
  ];

  return (
    <div className="sm:hidden">
      {/* ハンバーガーメニューボタン */}
      <button
        type="button"
        className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
        onClick={toggleMenu}
        aria-expanded="false"
      >
        <span className="sr-only">メインメニューを開く</span>
        {/* ハンバーガーアイコン */}
        <svg
          className={`${isOpen ? 'hidden' : 'block'} h-6 w-6`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        {/* クローズアイコン */}
        <svg
          className={`${isOpen ? 'block' : 'hidden'} h-6 w-6`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* モバイルメニュー */}
      <div className={`${isOpen ? 'block' : 'hidden'} absolute top-16 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50`}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${
                pathname === item.href
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              onClick={closeMenu}
            >
              {item.label}
            </Link>
          ))}
        </div>
        
        {/* ユーザー情報とログアウト */}
        <div className="pt-4 pb-3 border-t border-gray-200">
          <div className="flex items-center px-4">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {userEmail.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <div className="text-base font-medium text-gray-800">{userEmail}</div>
            </div>
          </div>
          <div className="mt-3 px-2 space-y-1">
            <button
              onClick={() => {
                onSignOut();
                closeMenu();
              }}
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 w-full text-left"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>

      {/* オーバーレイ */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={closeMenu}
        />
      )}
    </div>
  );
}