# GitHub Insights - Copilot Instructions

## プロジェクト概要

GitHub リポジトリの貢献度・統計を可視化する日本語向け Web サービス。認証/未認証の両モードに対応し、GitHub GraphQL API からデータ取得・可視化を行う。

## 技術スタック

- **フレームワーク**: Next.js (App Router)、React、TypeScript
- **認証**: NextAuth v5 + GitHub OAuth
- **データ取得**: TanStack Query + Octokit GraphQL
- **チャート**: Recharts (SSR 無効化必須)
- **スタイル**: Tailwind CSS
- **テスト**: Vitest + React Testing Library + Storybook

## アーキテクチャ

### ページ構成

- `/` - ランディング（未認証で Public リポジトリ検索可）
- `/login` - ログイン（Public/Private スコープ選択）
- `/dashboard` - 認証済みユーザー向けダッシュボード
- `/repo/[owner]/[repo]` - Public リポジトリ詳細（未認証アクセス可）

### ディレクトリ構成

```
src/
├── app/           # App Router ページ・API Route Handler
├── components/    # UIコンポーネント（charts/はチャート専用）
├── hooks/         # カスタムフック（React Query ラッパー中心）
├── lib/           # ユーティリティ・API クライアント・設定
├── providers/     # Context Provider（Query, Session）
├── stories/       # Storybook ストーリー
└── types/         # 型定義
```

### データフロー

```
lib/github.ts（GraphQL API クライアント）
  ↓
hooks/（React Query によるキャッシュ・状態管理）
  ↓
components/（可視化・UI）
```

## 設計原則

### 認証/未認証の分岐パターン

`accessToken` が `null` の場合は未認証として処理。API 関数は第 1 引数で判定：

```typescript
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

### SSR 無効化パターン（Recharts）

Recharts はサーバーサイドレンダリング非対応。チャートコンポーネントは必ず `dynamic` でインポート：

```typescript
import dynamic from "next/dynamic";

const ChartComponent = dynamic(
  () => import("@/components/charts/ChartComponent"),
  { ssr: false }
);
```

### キャッシュ設定の一元管理

`lib/cache-config.ts` でサーバー/クライアント両方のキャッシュ設定を一元管理。新しいデータ取得を追加する際はここを参照。

### Server Actions

`lib/actions.ts` に `"use server"` で定義。認証関連のアクションを集約。

### レート制限への対応

未認証時は GitHub API のレート制限が厳しい（60 回/時間）。以下の対策を実施：

- サーバーサイドキャッシュ（Route Handler）
- クライアントサイドキャッシュ（React Query staleTime）
- 人気リポジトリのローカル JSON による API 呼び出し削減
- UI でのレート制限警告表示

## 開発コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド
npm run lint         # ESLint 実行
npm run test         # Vitest でテスト実行
npm run test:run     # テスト実行（ウォッチなし）
npm run storybook    # Storybook 起動
```

## 環境変数（必須）

```
GITHUB_ID=<OAuth App Client ID>
GITHUB_SECRET=<OAuth App Client Secret>
AUTH_SECRET=<NextAuth 用シークレット>
```

## コーディング規約

### ファイル命名

- コンポーネント: PascalCase（`ContributorRanking.tsx`）
- フック: camelCase + `use` プレフィックス（`useRepoData.ts`）
- ユーティリティ: camelCase（`cache-config.ts`）
- 型定義: `types/` ディレクトリに集約

### UI パターン

- ローディング: Skeleton コンポーネントまたは `animate-spin` スピナー
- アイコン: Lucide React 使用
- 日本語ロケール前提（コメント・UI テキスト共に日本語可）

### テスト方針

- テストファイルは `__tests__/` ディレクトリまたは `*.test.ts(x)` で配置
- Storybook でコンポーネントの視覚的なテストも可能
- 優先順位: API ロジック → フック → コンポーネント

## デプロイ（Vercel）

### 環境変数設定

Vercel ダッシュボードで上記の環境変数を設定。

### GitHub OAuth App 設定

本番・プレビュー両環境のコールバック URL を登録：

```
https://your-domain.vercel.app/api/auth/callback/github
https://your-project-git-*.vercel.app/api/auth/callback/github
```

### 注意事項

- `next.config.ts` の `images.remotePatterns` に GitHub アバター URL を許可済み
- Recharts は SSR 無効化必須（`dynamic` import で対応済み）
