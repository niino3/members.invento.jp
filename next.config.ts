import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Vercel環境用の最適化設定
  output: "standalone",
};

export default nextConfig;
