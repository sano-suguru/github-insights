# GitHub Insights - Copilot Instructions

## 作業開始前のチェックリスト

**すべての作業を開始する前に、以下を確認すること：**

1. **package.json の確認** - 利用可能なスクリプトと依存関係を把握

   - `npm run dev` - 開発サーバー
   - `npm run lint` - ESLint
   - `npm run test:run` - テスト実行
   - `npm run similarity` - 類似コード検出（閾値 85%）
   - `npm run similarity:strict` - 厳格な類似コード検出（閾値 80%）

2. **現在のブランチ・変更状態** - 必要に応じて `git status` で確認

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

### MCP サーバーの活用

利用可能な MCP サーバーを積極的に活用すること：

| MCP           | このプロジェクトでの用途                               |
| ------------- | ------------------------------------------------------ |
| **Context7**  | TanStack Query, Next.js, Recharts 等のドキュメント参照 |
| **GitHub**    | Issue/PR 管理、コード検索、Copilot へのタスク割り当て  |
| **GitKraken** | Git 操作（commit, push, stash, blame）                 |
| **Serena**    | シンボル検索、参照一覧、リファクタリング支援           |

**推奨される使用場面:**

- ライブラリの API 仕様確認 → Context7 で最新ドキュメント取得
- バグ修正時の Issue 作成 → GitHub MCP で Issue 作成
- 変更のコミット → GitKraken MCP で `git add` → `git commit`
- 関数の使用箇所を調査 → Serena で `find_referencing_symbols`
- 大規模リファクタリング → Serena で影響範囲を特定してから編集

## ペーパーカット（継続的品質改善）

ペーパーカットとは、コードベースの健全性と保守性を長期的に向上させる細かくも重要な改善タスク。積極的に実施し、技術的負債の蓄積を防ぐこと。

### タスク完了時の自律的なペーパーカット

**すべてのタスク完了時に以下を確認・実施する：**

1. **リントエラー・型エラーの解消**

   - `npm run lint` と `npx tsc --noEmit` でエラーがないか確認
   - 警告レベルの問題も可能な限り解消

2. **未使用コードの削除**

   - 未使用の import、変数、関数を削除
   - コメントアウトされた古いコードを整理

3. **一貫性の確保**

   - 命名規則の統一（既存パターンに従う）
   - 類似コンポーネント間のスタイル・構造の統一

4. **ドキュメントの更新**
   - 新機能追加時は README や本ファイルへの反映を検討
   - 複雑なロジックには JSDoc コメントを追加

### 発見次第対応すべきペーパーカット

以下の問題を発見した場合、現在のタスクに大きな影響がなければ即座に修正：

| 問題                   | 対応                                         |
| ---------------------- | -------------------------------------------- |
| 重複コード             | 共通関数・コンポーネントに抽出               |
| マジックナンバー       | 定数として定義                               |
| 過度に長い関数         | 責務ごとに分割                               |
| 型定義の欠落           | `any` を具体的な型に置換                     |
| エラーハンドリング不足 | try-catch や適切なフォールバック追加         |
| パフォーマンス問題     | `useMemo`, `useCallback`, 遅延読み込みの適用 |

### 開発効率を上げる小さなツール

既存の処理パターンが繰り返される場合、以下を検討：

- **ユーティリティ関数の作成** - `lib/utils.ts` に共通処理を集約
- **カスタムフックの抽出** - 複数コンポーネントで使う状態管理ロジック
- **型ヘルパーの追加** - `types/` に再利用可能な型定義
- **テストヘルパー** - モック作成やセットアップの共通化

### ROI を意識した判断基準

ペーパーカットの優先度は以下で判断：

1. **影響範囲** - 多くのファイルで使われるコードほど優先
2. **頻度** - 頻繁に触る箇所ほど優先
3. **リスク** - バグの温床になりやすい箇所を優先
4. **時間対効果** - 5 分以内で完了する改善は即実施

**判断に迷う場合は、TODO コメントを残して先に進む：**

```typescript
// TODO: この処理は useXxx フックに抽出すべき
// TODO: エラーハンドリングを追加する
```

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
