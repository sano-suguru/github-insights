# GitHub Insights - Copilot Instructions

このリポジトリでの作業時に、迷わず実装・検証まで進めるための統合ガイド。

## 作業開始前のチェックリスト

**すべての作業を開始する前に、以下を確認すること：**

1. **package.json の確認** - 利用可能なスクリプトと依存関係を把握

   - `npm run dev` - 開発サーバー（http://localhost:3001）
   - `npm run lint` - ESLint
   - `npm run test:run` - テスト実行（ウォッチなし）
   - `npm run similarity` - 類似コード検出（閾値 85%）
   - `npm run similarity:strict` - 厳格な類似コード検出（閾値 80%）

2. **現在のブランチ・変更状態** - 必要に応じて `git status` で確認

## プロジェクト概要

GitHub リポジトリ/ユーザーの貢献度・統計を可視化する日本語向け Web サービス。**認証/未認証の両モード**に対応し、GitHub GraphQL API からデータ取得・可視化を行う。

### 技術スタック

- **フレームワーク**: Next.js (App Router)、React、TypeScript
- **認証**: NextAuth v5 + **GitHub App（read-only）**
- **データ取得**: TanStack Query + Octokit GraphQL
- **チャート**: Recharts（SSR 無効化必須）
- **スタイル**: Tailwind CSS
- **テスト**: Vitest + React Testing Library + Playwright + Storybook

## アーキテクチャ（最重要）

### ページ構成

- `/` - ランディング（未認証で Public リポジトリ検索可）
- `/login` - ログイン
- `/dashboard` - 認証済みユーザー向けダッシュボード
- `/repo/[owner]/[repo]` - Public リポジトリ詳細（未認証アクセス可）
- `/user/[username]` - ユーザープロフィール
- `/user/[username]/wrapped/[year]` - GitHub Wrapped 年間サマリ

### ディレクトリ構成（目安）

```
src/
├── app/           # App Router ページ・Route Handler
├── components/    # UIコンポーネント（charts/はチャート専用）
├── hooks/         # TanStack Query ラッパー中心
├── lib/           # ユーティリティ・設定・GitHub クライアント
│   └── github/    # GitHub GraphQL クエリ/変換/エラー
├── providers/     # Query/Session/Theme Provider
└── types/         # 型定義
```

### 二層キャッシュ戦略（レート制限対策）

未認証は GitHub API のレート制限が厳しい（**60 req/hour**）。そのため以下の二層キャッシュを前提に設計する：

1. **クライアントキャッシュ**: TanStack Query（staleTime 5〜10 分）
2. **サーバーキャッシュ**: Route Handler + `unstable_cache`（revalidate 5〜10 分）

キャッシュ設定は一元管理：`src/lib/cache-config.ts`

## 設計原則・実装パターン

### 認証/未認証の分岐パターン

GitHub API 関数は基本的に第 1 引数で認証状態を受け取り、クライアントを切り替える：

```ts
export async function getLanguageStats(
  accessToken: string | null,
  owner: string,
  repo: string
) {
  const client = accessToken
    ? createGitHubClient(accessToken)
    : createPublicGitHubClient();
  // ...
}
```

Route Handler 側のキャッシュキーは auth/public を含めて衝突を避ける：

```ts
const cacheKey = `stats:${owner}:${repo}:${
  isAuthenticated ? "auth" : "public"
}`;
```

### SSR 無効化パターン（Recharts）

Recharts は SSR 非対応。チャートは必ず `dynamic` で `{ ssr: false }` を指定する：

```ts
import dynamic from "next/dynamic";

const ChartComponent = dynamic(
  () => import("@/components/charts/ChartComponent"),
  { ssr: false }
);
```

### Server Actions

サーバー専用処理（認証フロー等）は `src/lib/actions.ts` に `"use server"` で集約する。

### レート制限への対応（実務ルール）

- サーバーサイドキャッシュ（Route Handler）を優先
- クライアントサイドは staleTime/gcTime を適切に
- ローカル JSON 検索: `public/data/popular-repos.json` を活用
- リトライは `src/lib/github/client.ts` の `withRetry()` を踏襲

## 開発コマンド

```bash
# Development
npm run dev              # 開発サーバー起動（http://localhost:3001）
npm run build            # 本番ビルド
npm start                # 本番起動

# Lint & Type
npm run lint             # ESLint
npx tsc --noEmit         # 型チェック

# Testing
npm run test             # Vitest（watch）
npm run test:run         # Vitest（single run）
npm run test:coverage    # カバレッジ
npm run test:e2e         # Playwright E2E
npm run test:e2e:ui      # Playwright UI
npm run test:all         # unit + e2e

# Quality
npm run similarity       # 類似コード検出
npm run similarity:strict # 厳格モード

# Tools
npm run storybook        # Storybook
npm run update-repos     # popular-repos.json 更新
```

## 環境変数（必須）

ローカル開発は `.env.local` を利用。最低限これらが必要：

```bash
# GitHub App
GITHUB_APP_CLIENT_ID=<GitHub App Client ID>
GITHUB_APP_CLIENT_SECRET=<GitHub App Client Secret>
GITHUB_APP_ID=<GitHub App ID>

# NextAuth
NEXTAUTH_SECRET=<NextAuth secret>
NEXTAUTH_URL=http://localhost:3001
AUTH_TRUST_HOST=true
```

GitHub App の設定や移行背景は `docs/GITHUB_APP_MIGRATION.md` を参照。

## コーディング規約

### ファイル命名

- コンポーネント: PascalCase（例: `ContributorRanking.tsx`）
- フック: camelCase + `use` プレフィックス（例: `useRepoData.ts`）
- ユーティリティ: 既存ファイルに合わせる（例: `cache-config.ts`, `api-utils.ts`）
- 型定義: `src/types/` に集約

### UI パターン

- ローディング: Skeleton コンポーネント or `animate-spin`
- アイコン: Lucide React
- 日本語ロケール前提（UI/コメントとも日本語可）

### テスト方針（優先順位）

1. API/集計ロジック
2. hooks（React Query の振る舞い）
3. components（必要に応じて Storybook）

## よくある実装タスク（追加時の手順）

### 新しい GitHub データ Endpoint を追加する

1. `src/lib/github/*` にクエリ/集計を追加（必要なら `types.ts`）
2. `src/app/api/github/[endpoint]/route.ts` を追加
   - `src/lib/api-utils.ts` の `createCachedFetch()` を使う
   - `src/lib/cache-config.ts` の定数に合わせる
3. `src/hooks/use[DataName].ts` を追加（staleTime/gcTime を揃える）
4. 可能ならユニットテストを追加（既存パターンに合わせる）

## 既知の制約

- CSP: Recharts 互換のため `next.config.ts` で `unsafe-eval` を許容している（削除しない）
- 画像: GitHub アバター等は `next.config.ts` の `images.remotePatterns` により許可済み

## ペーパーカット（継続的品質改善）

ペーパーカットとは、コードベースの健全性と保守性を長期的に向上させる小さな改善。タスク完了時に可能な範囲で実施する。

### タスク完了時の自律的なチェック

1. `npm run lint` と `npx tsc --noEmit` の確認
2. 未使用 import/変数/関数、コメントアウトされた古いコードの削除
3. 命名規則・コンポーネント構造の一貫性
4. 必要に応じて README/ドキュメント更新、複雑箇所に JSDoc

### 発見次第対応すべき項目（ROI 重視）

| 問題                   | 対応                                         |
| ---------------------- | -------------------------------------------- |
| 重複コード             | 共通関数・共通コンポーネントへ抽出           |
| マジックナンバー       | 定数として定義                               |
| 過度に長い関数         | 責務ごとに分割                               |
| 型定義の欠落           | `any` を具体的な型に置換                     |
| エラーハンドリング不足 | try-catch、適切なフォールバック追加          |
| パフォーマンス問題     | `useMemo`, `useCallback`, 遅延読み込みの適用 |

迷う場合は TODO を残して先に進む：

```ts
// TODO: この処理は useXxx フックに抽出すべき
// TODO: エラーハンドリングを追加する
```

## デプロイ（Vercel）

Vercel 側に上記の環境変数を設定し、GitHub App のコールバック URL を登録する：

```
https://your-domain.vercel.app/api/auth/callback/github
https://your-project-git-*.vercel.app/api/auth/callback/github
```
