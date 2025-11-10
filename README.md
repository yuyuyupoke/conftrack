# Conference Tracker

企業学会発表トラッカー - 博士就活生のための企業研究マッチングツール

## 機能

- 研究キーワードによる企業検索
- 学会発表データベース
- マッチング度スコアリング
- お気に入り企業管理

## 技術スタック

- **フロントエンド**: React + Vite + TypeScript + TailwindCSS
- **バックエンド**: Express + tRPC
- **データベース**: MySQL (Drizzle ORM)
- **認証**: Manus OAuth

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
DATABASE_URL=mysql://user:password@host:port/database
```

### 3. データベースマイグレーション

```bash
pnpm run db:push
```

### 4. 学会データの投入

初期データとして学会情報を投入します：

```bash
tsx scripts/seed-conferences.ts
```

## 開発

### 開発サーバーの起動

```bash
pnpm run dev
```

### ビルド

```bash
pnpm run build
```

### 本番環境での起動

```bash
pnpm run start
```

## データベーススキーマ

### conferences（学会マスター）
- id: 学会ID
- name: 学会名（ユニーク）
- url: 学会URL
- createdAt, updatedAt

### organizations（企業/組織マスター）
- id: 組織ID
- name: 組織名（ユニーク）
- createdAt, updatedAt

### presentations（発表データ）
- id: 発表ID
- conferenceId: 学会ID（外部キー）
- organizationId: 組織ID（外部キー）
- title: 発表タイトル
- authorName: 発表者名
- keywords: キーワード（JSON配列）
- createdAt, updatedAt

### userFavorites（お気に入り企業）
- userId: ユーザーID
- organizationId: 組織ID
- createdAt

### userKeywords（検索キーワード履歴）
- id: ID
- userId: ユーザーID
- keyword: キーワード
- searchedAt: 検索日時

## スクリプト

### 学会データ投入

```bash
tsx scripts/seed-conferences.ts
```

12件の学会データ（国内会議9件、国際会議2件）をデータベースに投入します。

## ライセンス

MIT
