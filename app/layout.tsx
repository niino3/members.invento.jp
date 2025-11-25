import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import PolyfillProvider from "@/components/PolyfillProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap', // フォント読み込み中のフォールバック表示
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'], // フォント読み込み失敗時のフォールバック
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  fallback: ['Monaco', 'Courier New', 'monospace'],
});

export const metadata: Metadata = {
  title: "顧客管理システム - members.invento.jp",
  description: "顧客管理とサービス管理のための統合プラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          fontFamily: geistSans.style.fontFamily + ', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <PolyfillProvider>
          <AuthProvider>{children}</AuthProvider>
        </PolyfillProvider>
      </body>
    </html>
  );
}
