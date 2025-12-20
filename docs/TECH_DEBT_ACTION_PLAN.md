# 技術的負債 返済作業計画

作成日: 2025-12-20

## 概要

このドキュメントは、GitHub Insights プロジェクトの技術的負債を計画的に返済するための作業計画です。
各タスクは独立して実行可能で、コンテキストが失われても作業を継続できるよう詳細に記載しています。

---

## 現状サマリー（2025-12-20 時点）

| 項目 | 状態 |
|------|------|
| ESLint | エラーなし ✅ |
| TypeScript | 型エラーなし ✅ |
| `any` 型使用 | なし ✅ |
| テストカバレッジ | 88.55% |
| 関数重複 | なし ✅ |
| 型定義重複 | 解消 ✅ |
| ロギング | 統一済み ✅ |

---

## Phase 1: クイックウィン（計1時間）

### 1.1 未使用依存関係の削除

**工数**: 15分  
**重要度**: 中 / **緊急度**: 中

#### 背景
`npx depcheck --json` で検出された未使用パッケージ。

#### 対象パッケージ

**dependencies（本番）**:
- `@auth/core` — NextAuth v5 beta の内部依存として自動インストールされている。直接参照なし。
  - ⚠️ 削除前に `npm ls @auth/core` で依存関係を確認すること

**devDependencies**:
```
@chromatic-com/storybook
@storybook/addon-docs
@storybook/addon-onboarding
@storybook/addon-vitest
@testing-library/user-event
@vitest/coverage-v8
```

#### 作業手順

```bash
# 1. 現状確認
npm ls @auth/core

# 2. devDependencies の削除（安全）
npm uninstall @chromatic-com/storybook @storybook/addon-docs @storybook/addon-onboarding @testing-library/user-event

# 3. ビルド確認
npm run build

# 4. テスト確認
npm run test:run

# 5. Storybook 確認
npm run storybook
```

#### 注意事項
- `@storybook/addon-vitest` は `.storybook/vitest.setup.ts` で使用されている可能性あり。削除前に確認。
- `@vitest/coverage-v8` は `npm run test:coverage` で使用中。削除しない。
- `@tailwindcss/postcss` は `postcss.config.mjs` で使用中。削除しない。

#### 完了条件
- [ ] `npm run build` 成功
- [ ] `npm run test:run` 全テストパス
- [ ] `npm run storybook` 起動確認

---

### 1.2 型定義の共通化

**工数**: 15分  
**重要度**: 中 / **緊急度**: 低

#### 背景
`npm run similarity` で検出された重複型定義。

#### 重複箇所

**1. Props 型（UserEvent[] を受け取る）**
```
src/components/charts/ContributionTypePie.tsx:14-16
src/components/charts/UserActivityHeatmap.tsx:7-9
```

**2. User 型（Storybook テンプレート）**
```
src/stories/Header.tsx:4-6
src/stories/Page.tsx:6-8
```

#### 作業手順

**Step 1: EventsProps 型を作成**

ファイル: `src/types/chart.ts`（新規作成）

```typescript
import type { UserEvent } from "@/lib/github/types";

/**
 * イベントデータを受け取るチャートコンポーネント用Props
 */
export interface EventsChartProps {
  events: UserEvent[];
}
```

**Step 2: ContributionTypePie.tsx を修正**

```diff
- interface Props {
-   events: UserEvent[];
- }
+ import type { EventsChartProps } from "@/types/chart";

- export default function ContributionTypePie({ events }: Props) {
+ export default function ContributionTypePie({ events }: EventsChartProps) {
```

**Step 3: UserActivityHeatmap.tsx を修正**

```diff
- interface Props {
-   events: UserEvent[];
- }
+ import type { EventsChartProps } from "@/types/chart";

- export default function UserActivityHeatmap({ events }: Props) {
+ export default function UserActivityHeatmap({ events }: EventsChartProps) {
```

**Step 4: Storybook の User 型**
→ Phase 1.3 で Storybook テンプレートごと削除するため、対応不要。

#### 完了条件
- [ ] `npx tsc --noEmit` エラーなし
- [ ] `npm run similarity` で Props 重複が解消

---

### 1.3 Storybook テンプレート削除

**工数**: 10分  
**重要度**: 低 / **緊急度**: 低

#### 背景
Storybook 初期化時に生成されたサンプルファイル。プロジェクト固有のコンポーネントではないため削除可能。

#### 対象ファイル

```
src/stories/
├── Button.tsx          # 削除
├── Button.stories.ts   # 削除
├── button.css          # 削除
├── Header.tsx          # 削除
├── Header.stories.ts   # 削除
├── header.css          # 削除
├── Page.tsx            # 削除
├── Page.stories.ts     # 削除
├── page.css            # 削除
├── Configure.mdx       # 削除
└── assets/             # 削除（ディレクトリごと）
```

#### 作業手順

```bash
# 1. 削除
rm -rf src/stories/Button.tsx src/stories/Button.stories.ts src/stories/button.css
rm -rf src/stories/Header.tsx src/stories/Header.stories.ts src/stories/header.css
rm -rf src/stories/Page.tsx src/stories/Page.stories.ts src/stories/page.css
rm -rf src/stories/Configure.mdx
rm -rf src/stories/assets

# 2. stories ディレクトリが空なら削除（プロジェクト固有の stories があれば残す）
# ErrorDisplay.stories.tsx, Skeleton.stories.tsx は src/components/ にあるため影響なし

# 3. Storybook 起動確認
npm run storybook
```

#### 完了条件
- [ ] `npm run storybook` が既存の ErrorDisplay / Skeleton stories で正常動作
- [ ] `npm run similarity` で User 型重複が解消

---

### 1.4 パッケージのパッチ更新

**工数**: 20分  
**重要度**: 中 / **緊急度**: 中

#### 背景
`npm outdated` で検出されたパッチ/マイナー更新。

#### 更新対象（安全なもの）

| パッケージ | 現在 | 更新後 | 種別 |
|------------|------|--------|------|
| next | 16.0.10 | 16.1.0 | minor |
| recharts | 3.5.1 | 3.6.0 | minor |
| storybook 関連 | 10.1.8 | 10.1.10 | patch |
| @tailwindcss/postcss | 4.1.17 | 4.1.18 | patch |
| tailwindcss | 4.1.17 | 4.1.18 | patch |
| @testing-library/react | 16.3.0 | 16.3.1 | patch |
| @vercel/og | 0.8.5 | 0.8.6 | patch |
| eslint | 9.39.1 | 9.39.2 | patch |
| vite | 7.2.7 | 7.3.0 | minor |

#### 更新しないもの（破壊的変更の可能性）

| パッケージ | 現在 | 最新 | 理由 |
|------------|------|------|------|
| @vitest/browser | 3.2.4 | 4.0.16 | メジャーアップデート |
| @vitest/coverage-v8 | 3.2.4 | 4.0.16 | メジャーアップデート |
| react / react-dom | 19.2.1 | 19.2.3 | 個別検証推奨 |
| @types/node | 20.x | 25.x | メジャーアップデート |

#### 作業手順

```bash
# 1. パッチ更新（安全）
npm update

# 2. 個別にマイナー更新
npm install next@latest recharts@latest vite@latest

# 3. 動作確認
npm run build
npm run test:run
npm run dev  # 手動で http://localhost:3001 確認
```

#### 完了条件
- [ ] `npm run build` 成功
- [ ] `npm run test:run` 全テストパス
- [ ] `npm run dev` でページ表示正常

---

## Phase 2: 品質強化（計2時間）

### 2.1 share.ts のテスト追加

**工数**: 30分  
**重要度**: 高 / **緊急度**: 中  
**現在のカバレッジ**: 12.5%

#### 対象ファイル
- `src/lib/share.ts`

#### テスト対象関数

| 関数 | テスト内容 |
|------|-----------|
| `generateTwitterShareUrl` | URL生成、ハッシュタグ有無 |
| `copyToClipboard` | 成功/失敗ケース（navigator.clipboard モック） |
| `generateRepoContributionShareText` | 出力文字列検証 |
| `generateUserProfileShareText` | 出力文字列検証 |
| `generateWrappedShareText` | 出力文字列検証 |

#### 作業手順

**Step 1: テストファイル作成**

ファイル: `src/lib/__tests__/share.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateTwitterShareUrl,
  copyToClipboard,
  generateRepoContributionShareText,
  generateUserProfileShareText,
  generateWrappedShareText,
} from "../share";

describe("generateTwitterShareUrl", () => {
  it("基本的なURLを生成する", () => {
    const url = generateTwitterShareUrl({
      text: "テスト投稿",
      url: "https://example.com",
    });
    expect(url).toContain("https://twitter.com/intent/tweet");
    expect(url).toContain("text=");
    expect(url).toContain("url=");
  });

  it("ハッシュタグを含む場合", () => {
    const url = generateTwitterShareUrl({
      text: "テスト",
      url: "https://example.com",
      hashtags: ["GitHubInsights", "OSS"],
    });
    expect(url).toContain("hashtags=GitHubInsights%2COSS");
  });

  it("ハッシュタグが空配列の場合は含まない", () => {
    const url = generateTwitterShareUrl({
      text: "テスト",
      url: "https://example.com",
      hashtags: [],
    });
    expect(url).not.toContain("hashtags=");
  });
});

describe("copyToClipboard", () => {
  const mockWriteText = vi.fn();

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("コピー成功時にtrueを返す", async () => {
    mockWriteText.mockResolvedValueOnce(undefined);
    const result = await copyToClipboard("テスト文字列");
    expect(result).toBe(true);
    expect(mockWriteText).toHaveBeenCalledWith("テスト文字列");
  });

  it("コピー失敗時にfalseを返す", async () => {
    mockWriteText.mockRejectedValueOnce(new Error("Copy failed"));
    const result = await copyToClipboard("テスト文字列");
    expect(result).toBe(false);
  });
});

describe("generateRepoContributionShareText", () => {
  it("正しいフォーマットでテキストを生成する", () => {
    const text = generateRepoContributionShareText({
      owner: "facebook",
      repo: "react",
      username: "testuser",
      commits: 100,
      rank: 5,
    });
    expect(text).toContain("facebook/react");
    expect(text).toContain("100 コミット");
    expect(text).toContain("5位");
    expect(text).toContain("#GitHubInsights");
  });
});

describe("generateUserProfileShareText", () => {
  it("正しいフォーマットでテキストを生成する", () => {
    const text = generateUserProfileShareText({
      username: "testuser",
    });
    expect(text).toContain("@testuser");
    expect(text).toContain("#GitHubInsights");
  });
});

describe("generateWrappedShareText", () => {
  it("正しいフォーマットでテキストを生成する", () => {
    const text = generateWrappedShareText({
      username: "testuser",
      year: 2024,
      commits: 500,
      stars: 100,
    });
    expect(text).toContain("2024年");
    expect(text).toContain("500 コミット");
    expect(text).toContain("100");
    expect(text).toContain("#GitHubWrapped");
  });
});
```

**Step 2: テスト実行**

```bash
npm run test:run -- src/lib/__tests__/share.test.ts
npm run test:coverage -- src/lib/__tests__/share.test.ts
```

#### 完了条件
- [ ] 全テストパス
- [ ] `share.ts` のカバレッジ 90% 以上

---

### 2.2 api-utils.ts のテスト追加

**工数**: 1時間  
**重要度**: 高 / **緊急度**: 中  
**現在のカバレッジ**: 41.3%

#### 対象ファイル
- `src/lib/api-utils.ts`

#### カバーされていない行
- L22, L33-34, L37-73（`fetchApi` 関数の主要パス）

#### テスト対象

| 関数 | テストケース |
|------|-------------|
| `getErrorMessage` | JSON/非JSON レスポンス、パースエラー |
| `isRateLimitText` | 各種パターン |
| `isRateLimitResponse` | 429、テキストマッチ |
| `fetchApi` | 成功、404、429、その他エラー |

#### 作業手順

**Step 1: テストファイル確認・拡充**

既存ファイル: `src/lib/__tests__/api-utils.test.ts`

追加するテストケース:

```typescript
describe("fetchApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("成功時にJSONをパースして返す", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    });

    const result = await fetchApi<{ data: string }>("https://api.example.com/test");
    expect(result).toEqual({ data: "test" });
  });

  it("404エラー時にnotFoundErrorをスロー", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ error: "Not Found" }),
    });

    await expect(
      fetchApi("https://api.example.com/test", { notFoundError: "REPO_NOT_FOUND" })
    ).rejects.toThrow("REPO_NOT_FOUND");
  });

  it("429エラー時にrateLimitErrorをスロー", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ error: "Rate limit exceeded" }),
    });

    await expect(
      fetchApi("https://api.example.com/test", { rateLimitError: "RATE_LIMITED" })
    ).rejects.toThrow("RATE_LIMITED");
  });

  it("レート制限テキストを含む場合もrateLimitErrorをスロー", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ error: "API rate limit exceeded" }),
    });

    await expect(fetchApi("https://api.example.com/test")).rejects.toThrow("RATE_LIMIT");
  });

  it("その他のエラー時にfetchErrorをスロー", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ error: "Internal Server Error" }),
    });

    await expect(
      fetchApi("https://api.example.com/test", { fetchError: "SERVER_ERROR" })
    ).rejects.toThrow("SERVER_ERROR");
  });
});
```

**Step 2: テスト実行**

```bash
npm run test:run -- src/lib/__tests__/api-utils.test.ts
npm run test:coverage -- src/lib/__tests__/api-utils.test.ts
```

#### 完了条件
- [ ] 全テストパス
- [ ] `api-utils.ts` のカバレッジ 80% 以上

---

### 2.3 ロギングユーティリティ導入

**工数**: 30分  
**重要度**: 中 / **緊急度**: 低

#### 背景
20箇所以上の `console.error/warn/log` が散在。統一されたロギング戦略がない。

#### console 使用箇所（主要）

```
src/lib/github/user.ts          - 8箇所
src/lib/github/client.ts        - 1箇所
src/lib/github/commits.ts       - 1箇所
src/lib/github/repository.ts    - 1箇所
src/lib/api-server-utils.ts     - 1箇所
src/lib/share.ts                - 1箇所
src/components/ContributionCardModal.tsx - 3箇所
```

#### 作業手順

**Step 1: ロガー作成**

ファイル: `src/lib/logger.ts`

```typescript
/**
 * アプリケーションロガー
 * 
 * 本番環境では warn/error のみ出力
 * 開発環境では全レベル出力
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = process.env.NODE_ENV === "production" ? "warn" : "debug";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (shouldLog("debug")) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    if (shouldLog("info")) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (shouldLog("warn")) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    if (shouldLog("error")) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
};
```

**Step 2: 段階的に置き換え**

優先度の高いファイルから:

```typescript
// Before
console.error("Get user profile error:", error);

// After
import { logger } from "@/lib/logger";
logger.error("Get user profile error:", error);
```

**Step 3: ESLint ルール追加（オプション）**

`eslint.config.mjs` に追加:

```javascript
{
  rules: {
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
}
```

#### 完了条件
- [ ] `src/lib/logger.ts` 作成
- [ ] 主要ファイル（github/user.ts）で logger に置き換え
- [ ] `npm run lint` パス

---

## Phase 3: リファクタリング（計4-6時間）

### 3.1 user/[username]/page.tsx 分割

**工数**: 2-3時間  
**重要度**: 高 / **緊急度**: 低  
**現在の行数**: 643行

#### 抽出対象コンポーネント

| コンポーネント | 抽出先 | 行数目安 |
|---------------|--------|----------|
| `BadgeChip` | `src/components/BadgeChip.tsx` | 15行 |
| `UserCardModal` | `src/components/UserCardModal.tsx` | 100行 |
| ユーザー情報セクション | `src/components/user/UserProfileHeader.tsx` | 80行 |
| バッジセクション | `src/components/user/UserBadgesSection.tsx` | 50行 |
| 統計カード群 | `src/components/user/UserStatsGrid.tsx` | 100行 |

#### 作業手順

1. 各コンポーネントを個別ファイルに抽出
2. Props 型を定義
3. page.tsx から import して使用
4. 動作確認

#### 完了条件
- [ ] page.tsx が 300行以下
- [ ] 抽出したコンポーネントにテスト追加
- [ ] `npm run build` 成功

---

### 3.2 OG画像ルート共通化

**工数**: 2-3時間  
**重要度**: 中 / **緊急度**: 低

#### 対象ファイル

```
src/app/api/og/card/[owner]/[repo]/[user]/route.tsx  (661行)
src/app/api/og/card/user/[user]/route.tsx            (538行)
src/app/api/og/card/user/[user]/wrapped/[year]/route.tsx (440行)
```

#### 共通化対象

| 項目 | 抽出先 |
|------|--------|
| カード背景/フレーム | `src/lib/og/components/CardFrame.tsx` |
| ユーザーアバター表示 | `src/lib/og/components/Avatar.tsx` |
| バッジ表示 | `src/lib/og/components/BadgeList.tsx` |
| 統計カード | `src/lib/og/components/StatCard.tsx` |
| GitHub API 取得ロジック | `src/lib/og/github-fetcher.ts` |

#### 完了条件
- [ ] 各ルートファイルが 300行以下
- [ ] 共通コンポーネントのテスト追加
- [ ] OG画像生成の動作確認

---

## 検証コマンド一覧

```bash
# ビルド検証
npm run build

# 型チェック
npx tsc --noEmit

# Lint
npm run lint

# テスト
npm run test:run
npm run test:coverage

# 類似コード検出
npm run similarity
npm run similarity:strict

# 依存関係チェック
npx depcheck
npm outdated

# 開発サーバー
npm run dev

# Storybook
npm run storybook
```

---

## 進捗トラッキング

### Phase 1 ✅ 完了（2025-12-20）
- [x] 1.1 Storybook テンプレート削除（src/stories/ のサンプルファイル）
- [x] 1.2 未使用依存関係の削除（@testing-library/user-event）
- [x] 1.3 型定義の共通化（EventsChartProps を src/types/chart.ts に抽出）
- [x] 1.4 パッケージのパッチ更新（recharts 3.6.0 の型変更対応含む）

### Phase 2 ✅ 完了（2025-12-20）
- [x] 2.1 share.ts のテスト追加（12.5% → 100%）
- [x] 2.2 api-utils.ts のテスト追加（41.3% → 100%）
- [x] 2.3 ロギングユーティリティ導入（src/lib/logger.ts 作成、console.* を一括置換）
- 結果: カバレッジ 86.31% → 88.55% に向上

### Phase 3 🚧 進行中
- [x] 3.1 user/[username]/page.tsx 分割（PR #17: 644行 → 269行）
- [ ] 3.2 OG画像ルート共通化

### 追加改善（2025-12-20）
- [x] CI キャッシュ修正（PR #16）
- [x] 検索バーをヘッダーに統合（PR #18）
- [x] 検索バー重複修正 - DashboardLayoutに移動（PR #19）
- [x] Tailwind v4 の標準クラスに置き換え（PR #20）

---

## 参考リンク

- [プロジェクト README](../README.md)
- [実装ドキュメント](./IMPLEMENTATION.md)
- [GitHub App 移行ガイド](./GITHUB_APP_MIGRATION.md)
