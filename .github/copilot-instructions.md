# GitHub Insights - Copilot Instructions

## プロジェクト概要

GitHub リポジトリの貢献度・統計を可視化する日本語向け Web サービス。認証/未認証の両モードに対応し、GitHub GraphQL API からデータ取得・可視化を行う。

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)、React 19、TypeScript
- **認証**: NextAuth v5 (beta) + GitHub OAuth
- **データ取得**: TanStack Query v5 + Octokit GraphQL
- **チャート**: Recharts (SSR 無効化必須)
- **スタイル**: Tailwind CSS v4

## アーキテクチャ

### ページ構成

- `/` - ランディング（未認証で Public リポジトリ検索可）
- `/login` - ログイン（Public/Private スコープ選択）
- `/dashboard` - 認証済みユーザー向けダッシュボード
- `/repo/[owner]/[repo]` - Public リポジトリ詳細（未認証アクセス可）

### データフロー

```
lib/github.ts（GraphQL API）
  ↓
hooks/useRepoData.ts, useCommitHistory.ts（React Query）
  ↓
components/charts/*（Recharts可視化）
```

### 認証/未認証の分岐パターン

`accessToken`が`null`の場合は未認証として処理。`lib/github.ts`の各関数は第 1 引数で判定：

```typescript
// 認証/未認証両対応パターン
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

## 重要な規約

### チャートコンポーネントは SSR 無効化必須

Recharts はサーバーサイドレンダリング非対応。必ず`dynamic`でインポート：

```typescript
const LanguagesPieChart = dynamic(
  () => import("@/components/charts/LanguagesPieChart"),
  { ssr: false }
);
```

### React Query のキャッシュ設定

`QueryProvider.tsx`でグローバル設定済み。カスタムフックでは`staleTime`で鮮度を調整：

- 言語統計: 10 分
- コミット履歴: 5〜10 分（期間に応じて変動）
- コントリビューター: 5 分

### レート制限への対応

未認証時は GitHub API のレート制限が厳しい（60 回/時間）。`getPublicRateLimitInfo()`でグローバル状態を管理し、UI で警告表示。未認証ユーザーは 30 日以内のデータ取得に制限。

### Server Actions

`lib/actions.ts`に`"use server"`で定義。認証関連のアクション（`signInWithPublicScope`、`signInWithPrivateScope`）を集約。

## 開発コマンド

```bash
npm run dev    # ポート3001で起動
npm run build  # 本番ビルド
npm run lint   # ESLint実行
npm run test   # Vitestでテスト実行
```

## 環境変数（必須）

```
GITHUB_ID=<OAuth App Client ID>
GITHUB_SECRET=<OAuth App Client Secret>
AUTH_SECRET=<NextAuth用シークレット>
```

## ファイル命名規約

- コンポーネント: PascalCase（`ContributorRanking.tsx`）
- フック: camelCase + `use`プレフィックス（`useRepoData.ts`）
- 型定義: `types/`ディレクトリに集約

## UI パターン

- ローディング: `animate-spin`でスピナー表示
- アイコン: Lucide React 使用
- 日本語ロケール前提（コメント・UI テキスト共に日本語）

## テスト

### フレームワーク

- **Vitest** + **React Testing Library** を使用
- テストファイルは `__tests__/` または `*.test.ts(x)` で配置

### テスト対象の優先順位

1. `lib/github.ts` - 認証/未認証分岐ロジック、GraphQL クエリのモック
2. `hooks/` - React Query フックの動作確認
3. `components/` - ユーザーインタラクション（チャートはスナップショット程度）

### モックパターン

```typescript
// GitHub APIのモック例
vi.mock("@octokit/graphql", () => ({
  graphql: { defaults: vi.fn(() => vi.fn()) },
}));
```

## デプロイ（Vercel）

### 環境変数設定

Vercel ダッシュボードで以下を設定：

- `GITHUB_ID` - GitHub OAuth App Client ID
- `GITHUB_SECRET` - GitHub OAuth App Client Secret
- `AUTH_SECRET` - `npx auth secret`で生成

### GitHub OAuth App 設定

本番・プレビュー両環境のコールバック URL を登録：

```
https://your-domain.vercel.app/api/auth/callback/github
https://your-project-git-*.vercel.app/api/auth/callback/github
```

### デプロイ時の注意

- `next.config.ts`の`images.remotePatterns`に GitHub アバター URL を許可済み
- Recharts はクライアントサイドのみで動作するため、SSR 無効化が正しく設定されていればビルドエラーは発生しない
