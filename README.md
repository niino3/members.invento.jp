# 顧客管理システム

## プロジェクト概要

自社用顧客管理システム（members.invento.jp）の開発プロジェクト

### 主な特徴
- 基本的な顧客管理機能
- サービス登録・管理機能
- サービス毎の機能拡張性
- 管理者とユーザー向けの2つのインターフェース
- サービスログ管理（WebRTCカメラ撮影機能付き）

### 技術スタック
- **フレームワーク**: Next.js (App Router)
- **言語**: TypeScript
- **UI**: Tailwind CSS
- **認証**: Firebase Authentication
- **データベース**: Firebase Firestore
- **ホスティング**: Firebase Hosting
- **サーバーレス関数**: Firebase Functions
- **ドメイン**: members.invento.jp

## 開発環境のセットアップ

### 1. 環境変数の設定
`.env.local.example`を`.env.local`にコピーして、Firebase設定を追加してください：

```bash
cp .env.local.example .env.local
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 開発サーバーの起動
```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアプリケーションにアクセスできます。

## プロジェクト構造

```
/
├── app/              # App Router用ディレクトリ
├── components/       # 共通コンポーネント
├── lib/             # ユーティリティ関数
├── types/           # TypeScript型定義
├── public/          # 静的ファイル
└── docs/            # ドキュメント
```

## 詳細ドキュメント

- [要件定義書](docs/requirements.md)
- [開発フェーズ詳細](docs/development-phases.md)

## ライセンス
プライベートプロジェクト
