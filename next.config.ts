import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Vercel環境用の最適化設定
  output: "standalone",
  // 古いブラウザ向けのポリフィル
  transpilePackages: ['firebase', 'firebase-admin'],
  // コンパイラオプション
  compiler: {
    // 古いブラウザ対応
    removeConsole: process.env.NODE_ENV === "production",
  },
  // レガシータブレット対応の設定
  experimental: {
    // 古いブラウザ対応のため、モダンな最適化を一部無効化
    optimizePackageImports: ['firebase'],
  },
  // Webpack設定でレガシー対応
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // クライアントサイドでポリフィルを有効化
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
