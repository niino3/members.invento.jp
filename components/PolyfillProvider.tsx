'use client';

import { useEffect, useState } from 'react';

/**
 * レガシータブレット対応のためのポリフィルプロバイダー
 * このコンポーネントは最初に読み込まれ、必要なポリフィルをロードします
 */
export default function PolyfillProvider({ children }: { children: React.ReactNode }) {
  const [polyfillsLoaded, setPolyfillsLoaded] = useState(false);

  useEffect(() => {
    // クライアントサイドでのみポリフィルを読み込む
    if (typeof window !== 'undefined') {
      const loadPolyfills = async () => {
        try {
          // 必要なポリフィルを動的にインポート
          await Promise.all([
            import('core-js/stable/promise'),
            import('core-js/stable/array/includes'),
            import('core-js/stable/array/find'),
            import('core-js/stable/array/find-index'),
            import('core-js/stable/array/from'),
            import('core-js/stable/object/assign'),
            import('core-js/stable/string/includes'),
            import('core-js/stable/string/starts-with'),
            import('core-js/stable/string/ends-with'),
            import('core-js/stable/number/is-nan'),
            import('core-js/stable/number/is-finite'),
            import('core-js/stable/symbol'),
            import('core-js/stable/map'),
            import('core-js/stable/set'),
            import('core-js/stable/weak-map'),
            import('core-js/stable/weak-set'),
          ]);
          
          // URL ポリフィル（古いブラウザ対応）
          if (typeof URL === 'undefined' || typeof URLSearchParams === 'undefined') {
            await import('core-js/stable/url');
          }
          
          // fetch ポリフィル（古いブラウザ対応）
          if (typeof fetch === 'undefined') {
            try {
              await import('whatwg-fetch');
            } catch (err) {
              console.warn('Failed to load fetch polyfill:', err);
            }
          }
          
          setPolyfillsLoaded(true);
          console.log('Polyfills loaded for legacy browser support');
        } catch (error) {
          console.error('Failed to load some polyfills:', error);
          // エラーが発生してもアプリケーションは続行
          setPolyfillsLoaded(true);
        }
      };

      loadPolyfills();
    } else {
      // サーバーサイドでは即座に完了
      setPolyfillsLoaded(true);
    }
  }, []);

  // ポリフィルが読み込まれるまで待機（オプション）
  // レガシータブレットではポリフィルが必要な場合があるため
  if (!polyfillsLoaded) {
    return null; // またはローディング表示
  }

  return <>{children}</>;
}

