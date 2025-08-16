# Vercel デプロイガイド

## 前提条件

1. Vercel CLIがインストールされていること
2. Vercelアカウントにログインしていること
3. 環境変数が設定されていること

## Vercelの利点

**Next.jsアプリケーションのフル機能がサポートされます：**
- API routes（`/api/create-user` など）が正常に動作
- 動的ルートとSSR（Server-Side Rendering）
- 自動スケーリングと高いパフォーマンス
- 簡単なデプロイプロセス

## デプロイ手順

### 1. Vercel CLIのインストール

```bash
npm install -g vercel
```

### 2. Vercelにログイン

```bash
vercel login
```

ブラウザが開き、GitHub/Google/Email等でログインできます。

### 3. プロジェクトの初期設定

```bash
vercel
```

初回実行時に以下の質問が表示されます：
- Project name: `members.invento.jp`
- Framework: `Next.js` (自動検出)
- Build command: `npm run build` (デフォルト)
- Output directory: `.next` (デフォルト)

### 4. 環境変数の設定

Vercelダッシュボード（https://vercel.com/dashboard）で：

1. プロジェクトを選択
2. **Settings** → **Environment Variables** に移動
3. 以下の環境変数を追加：

```bash
# Firebase Client Configuration (Production & Preview & Development)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBVANdNNH-SU2QkbzNZRTcpxOeaPLHrKfc
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=members-invento-jp.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=members-invento-jp
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=members-invento-jp.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=155984774825
NEXT_PUBLIC_FIREBASE_APP_ID=1:155984774825:web:9dcc1ca8625035ce3a8bb8

# Firebase Admin SDK (Production & Preview & Development)
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDOOC1+AvNsuXeB\nrgyL/XbLfZrEPzY4XX7ihBN0FGH361Ockg+OQQb5RrMyVOA8//IQVeICZGDnYJzN\nmHhw0nEVRa4p9Uiz/ql5zLRmHs0Chv6Wmqe3vqXp7OPltjLxaykZdNLjoerIO4eS\nSUUDhJHIwu824UZB8nywHtM7ZDhGF4V6HiwaD2rJej8jxryaUqBE5n9ncaKVvp68\nQgOkOXFkkfE+Rco/3npE9YCJnaQQJ7cMWO21G0ccuorqJ00Ph17JteKxHRMIVdNw\npoMiNSYsqKwIBuTbwgUti78KkGZQ/f+KnTHfCui0IG4teRGR/UAz9r1OWBTvQfPJ\nJXkFKqNrAgMBAAECggEAAh0z5HmIIHcSSCNXW5ZS5nJKxE/8cL18ojqzihE/bQHw\nKjW+1RRcuTnF5M3FF01I+9q+rtUGCLkz1JqZsFixFqjhyKEwrOaRTVrITzxFUFZR\nqYwpMW7kMoonl/LXyyPLqxFIh5yXwksrFMYfzbZtx5oba7J3PKKx5oqaW3o5+OOs\n+6ME4G76MRmm7vAE4X51nKlq2965hAkh9OcMuvi3wOBw2Slr1OIRPLnHkcZAzDx1\naqEWMMWMDB36hHvfcVspoUioVy/yFC8y50k2cAoMmXAQ5yzvOQxXFOfoBP2Nl8iI\n9q2MHh5g37rdM4HMMwwMGKUdtEV6sqQRHyTOVTIU+QKBgQDv4vcpQZT1MQVlVjAi\nhSuPy3Ol+CHJmV6i6oQJkSPm+hqHYSCNhblTohqO2ulmiPt3VogDNc+yK7F3nF/4\nyo2VEvHrQIuLKjMQ1tgc0Adk3+0GYVH4wj6h0H7VovVg/h12v7nLBV7Uthq2Cku1\nsXjm7aovsE76m3tlqKZKrBEdbwKBgQDcEkejhhFGC7Jm8RjSOcP0jvBIemlkpOz4\nDMzCYZHO1G24Zjb8KX/0T0sumZjcLZYzGkWGxmBV31Wxh1RI+Axo0Nad9LuBnN+O\nUsfrJrf9exMLyPPpxABtLTVGeHq8vqkpx5dF4c+8GHfIizMhvzf6g7pSMRlV8L39\nopDMlcxTxQKBgG3phG22ytV9XIeN8ggfFFKSWa7V/kUsrJvg8BaiFd0jAzy8V/oA\nJ2YWhCyoSQDeCronP7KY2U09j9bKI38O78g6IfY0YLum3jb8+ZBaEMk7gJLHzJM6\nDRB/Q14HiH6kcEOUnUBUeZrkxWBbX00kv8yvYKbxFX7l9qghme/k3wKpAoGAG4Wd\nt/GYT24/DWixdfkLbJZDrozAiXmmuQ7AvL5/AaLHZfxCfB6kheU0vcsvtrlsw09R\nyp0chyC7Esyd2dJLmwAjFvX4TSlVO/NWVS4ubGDr7Nlgx6dfdkflFb8Tem9NsI/p\ndy/aTuewc0AVUO8dDRNURdsmE/1bhVDDUxKYzxECgYAeWh+Dy+zTO3fpU+TX8lfP\nAw7JMTZGNLFhbDSYUOswEMhypykASZMUXrpEVfjOxdIBTHWdu/duY0L1Q2cc4QzW\ni6mjF6drBouNYx0nVaTb9vLr2o+uLK62+AIWTUl/UfFmwAMuhX4OhW8JEqkz8/z9\n4GjNcmjaP13Lt7hH1HLu4A==\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@members-invento-jp.iam.gserviceaccount.com
```

### 5. 本番環境へのデプロイ

```bash
# 本番環境にデプロイ
vercel --prod
```

### 6. カスタムドメインの設定

Vercelダッシュボードで：

1. プロジェクトを選択
2. **Settings** → **Domains** に移動
3. `members.invento.jp` を追加
4. 表示されるDNS設定をドメインプロバイダーで設定：
   - CNAMEレコード: `members.invento.jp` → `cname.vercel-dns.com`

### 7. Firebase Authenticationの設定

Firebase Console（https://console.firebase.google.com）で：

1. **Authentication** → **Settings** → **承認済みドメイン**
2. 以下のドメインを追加：
   - `members.invento.jp` (本番用)
   - `*.vercel.app` (プレビュー用)

## デプロイ後の確認

### 1. 基本機能テスト

**管理者機能：**
- [ ] ログイン (`niino@art-at.com`)
- [ ] 顧客一覧表示
- [ ] 顧客新規作成（自動ユーザーアカウント作成含む）
- [ ] サービス管理

**ユーザー機能：**
- [ ] ユーザーログイン
- [ ] ダッシュボード表示
- [ ] 契約プラン変更申請
- [ ] 問い合わせフォーム

### 2. API routes確認

```bash
# 以下のエンドポイントが正常に動作することを確認
curl -X POST https://members.invento.jp/api/create-user
```

## 継続的デプロイ

### Git連携の設定

1. Vercelダッシュボードで **Settings** → **Git**
2. GitHubリポジトリと連携
3. `main`ブランチへのpush時に自動デプロイ設定

### デプロイコマンド

```bash
# プレビューデプロイ（開発・テスト用）
vercel

# 本番デプロイ
vercel --prod
```

## トラブルシューティング

### ビルドエラーが発生する場合

```bash
# ローカルでビルドテスト
npm run build

# キャッシュクリア
rm -rf .next node_modules package-lock.json
npm install
```

### 環境変数が読み込まれない場合

1. Vercelダッシュボードで環境変数が正しく設定されているか確認
2. **Production**, **Preview**, **Development** すべてに設定されているか確認
3. `NEXT_PUBLIC_`プレフィックスが付いているか確認

### Firebase接続エラーの場合

1. Firebase Console で承認済みドメインを確認
2. Firestore Security Rules が本番環境用に設定されているか確認
3. Firebase Admin SDK の秘密鍵が正しく設定されているか確認

## パフォーマンス最適化

### 1. 画像最適化

```javascript
// next.config.ts
const nextConfig = {
  images: {
    domains: ['firebase.googleapis.com'],
    unoptimized: false, // Vercelでは最適化を有効にできる
  },
}
```

### 2. バンドルサイズ分析

```bash
# バンドルサイズ分析
npm install --save-dev @next/bundle-analyzer
npm run build
```

## セキュリティ

### 1. CSP設定

```javascript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' *.googleapis.com; style-src 'self' 'unsafe-inline';"
          }
        ],
      },
    ]
  },
}
```

### 2. 環境変数の管理

- 本番環境では`.env.local`ファイルを使用しない
- Vercelダッシュボードで環境変数を管理
- 秘密鍵は定期的にローテーション

## 監視とロギング

### 1. Vercel Analytics

Vercelダッシュボードで Analytics を有効化

### 2. エラー監視

```bash
# Sentryなどの監視ツール導入を検討
npm install @sentry/nextjs
```