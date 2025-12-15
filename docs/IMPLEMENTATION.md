# GitHub Insights - 技術解説

本ドキュメントでは、設計判断の背景と実装のポイントを解説する。

---

## キャッシュ戦略

GitHub API には厳しいレート制限がある。未認証時は 60 リクエスト/時間で、数ページ閲覧しただけで枯渇する。

| 認証状態 | 制限 |
|---------|------|
| 認証済み | 5,000 リクエスト/時間 |
| 未認証 | 60 リクエスト/時間 |

そこで **TanStack Query（クライアント）+ unstable_cache（サーバー）** の 2 層キャッシュを採用した。

クライアントキャッシュのみではブラウザリロードで消え、複数ユーザーで共有できない。サーバーキャッシュのみでは同一ユーザーの連続アクセスでも毎回サーバーにリクエストが飛ぶ。2 層にすることで、クライアントで個人の連続アクセスを吸収し、サーバーで複数ユーザー間のキャッシュを共有できる。

### キャッシュ設定の一元管理

```typescript
// src/lib/cache-config.ts

// サーバーサイドキャッシュ（秒単位）
export const SERVER_CACHE = {
  LANGUAGES_REVALIDATE: 600,     // 10分
  STATS_REVALIDATE: 600,
  COMMITS_REVALIDATE: 300,       // 5分
  CONTRIBUTORS_REVALIDATE: 300,
} as const;

// クライアントサイドキャッシュ（ミリ秒単位）
export const CLIENT_CACHE = {
  LANGUAGES_STALE_TIME: SERVER_CACHE.LANGUAGES_REVALIDATE * 1000,
  GC_TIME: 30 * 60 * 1000,       // 30分
} as const;
```

言語統計は頻繁に変わらないため 10 分、コミット履歴やコントリビューターは開発中に更新頻度が高いため 5 分に設定。チケット予約システムのような即時性が求められるサービスとは異なり、数分の遅延は許容範囲なので、リアルタイム性より **レート制限回避** を優先した。

### 2層キャッシュの流れ

```mermaid
sequenceDiagram
    participant Component as コンポーネント
    participant Query as TanStack Query
    participant Route as Route Handler
    participant Cache as unstable_cache
    participant GitHub as GitHub API

    Component->>Query: データ要求
    alt staleTime 内
        Query-->>Component: キャッシュ返却
    else staleTime 超過
        Query->>Route: fetch
        Route->>Cache: getCachedData
        alt revalidate 内
            Cache-->>Route: キャッシュ返却
        else revalidate 超過
            Cache->>GitHub: GraphQL
            GitHub-->>Cache: データ
            Cache-->>Route: データ
        end
        Route-->>Query: データ
        Query-->>Component: データ
    end
```

### サーバーサイド: Route Handler + unstable_cache

```typescript
// src/app/api/github/languages/route.ts

async function getCachedLanguageStats(accessToken: string | null, owner: string, repo: string) {
  const isAuthenticated = !!accessToken;
  const cacheKey = `languages:${owner}:${repo}:${isAuthenticated ? "auth" : "public"}`;
  
  const cachedFetch = unstable_cache(
    async () => getLanguageStats(accessToken, owner, repo),
    [cacheKey],
    {
      revalidate: SERVER_CACHE.LANGUAGES_REVALIDATE,
      tags: [`languages:${owner}:${repo}`],
    }
  );

  return cachedFetch();
}
```

### クライアントサイド: TanStack Query

```typescript
// src/hooks/useRepoData.ts

export function useLanguageStats({ owner, repo, enabled = true }: UseRepoDataParams) {
  return useQuery({
    queryKey: ["languageStats", owner, repo],
    queryFn: () => fetchLanguagesFromAPI(owner, repo),
    enabled: enabled && !!owner && !!repo,
    staleTime: CLIENT_CACHE.LANGUAGES_STALE_TIME,
  });
}
```

---

## 認証/未認証の分岐

多くの GitHub 連携サービスはログイン必須だが、本アプリケーションでは **未認証でも Public リポジトリを分析可能** にした。

ログインなしで機能を試せることでコンバージョンが向上し、そもそも Public リポジトリの分析に認証は本質的に不要である。GitHub 認証への抵抗があるユーザーにも対応できる。

トレードオフとして、未認証時のレート制限（60 リクエスト/時間）は厳しい。これはキャッシュ戦略と人気リポジトリの事前取得で対応している。

```typescript
// src/lib/github.ts

// 認証済みクライアント
export function createGitHubClient(accessToken: string) {
  return graphql.defaults({
    headers: { authorization: `token ${accessToken}` },
  });
}

// 未認証クライアント
export function createPublicGitHubClient() {
  return graphql.defaults({});
}
```

API 関数での分岐パターン:

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

Route Handler でもキャッシュキーを分離:

```typescript
const cacheKey = `commits:${owner}:${repo}:${days ?? "all"}:${isAuthenticated ? "auth" : "public"}`;
```

---

## レート制限対策

未認証時は 60 リクエスト/時間の制限がある。1 リポジトリ表示で約 4-5 リクエスト消費するため、**15 リポジトリ程度で枯渇** する。これはサービスとして成立しない。

そこで 4 層の防御策を実装した。

```mermaid
flowchart TB
    subgraph Layer1[1. ローカル JSON]
        Popular[人気リポジトリ 400+件]
    end
    
    subgraph Layer2[2. TanStack Query]
        ClientCache[staleTime: 5-10分]
    end
    
    subgraph Layer3[3. unstable_cache]
        ServerCache[revalidate: 5-10分]
    end
    
    subgraph Layer4[4. GitHub API]
        API[実際のリクエスト]
    end
    
    Request[リクエスト] --> Layer1
    Layer1 -->|ミス| Layer2
    Layer2 -->|ミス| Layer3
    Layer3 -->|ミス| Layer4
```

### 1. 人気リポジトリのローカル JSON

**課題**: 検索のたびに GitHub Search API を呼ぶと、未認証ユーザーのレート制限を即座に消費してしまう。

**解決策**: 人気リポジトリ 400+ 件を JSON として保持し、検索時はまずローカルから候補を表示。GitHub API は補助的にのみ使用。

```typescript
// src/hooks/useSearchRepositories.ts

async function searchLocalRepos(query: string): Promise<string[]> {
  const response = await fetch("/data/popular-repos.json");
  const data: PopularReposData = await response.json();
  
  return data.all
    .filter((repo) => repo.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);
}
```

### 2. GitHub Actions による自動更新

**なぜ自動更新が必要か**: 人気リポジトリは日々変動する。手動更新では運用負荷が高いため、GitHub Actions で毎日自動更新する。

```yaml
# .github/workflows/update-popular-repos.yml

name: Update Popular Repos

on:
  schedule:
    - cron: "0 0 * * *"  # 毎日 UTC 0:00

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx tsx scripts/fetch-popular-repos.ts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: update popular repos [skip ci]"
          file_pattern: "public/data/popular-repos.json"
```

**なぜ `[skip ci]` を付けるか**: JSON 更新のコミットで CI を再実行する必要はない。無駄なビルドを防止。

---

## SSR 無効化

Recharts は内部で `window` オブジェクトを参照するため、サーバーサイドレンダリング時に `ReferenceError: window is not defined` が発生する。

Chart.js や Nivo なら SSR 対応可能だが、Chart.js は React との統合が複雑で、Nivo はカスタマイズ性が低い。Recharts は React コンポーネントとして自然に書け、カスタマイズ性が高い。SSR 無効化のデメリット（初期表示の空白）は Skeleton コンポーネントで緩和できるため、Recharts を採用した。

```typescript
// src/app/dashboard/page.tsx

import dynamic from "next/dynamic";

const LanguagesPieChart = dynamic(
  () => import("@/components/charts/LanguagesPieChart"),
  { ssr: false }
);

const CommitsLineChart = dynamic(
  () => import("@/components/charts/CommitsLineChart"),
  { ssr: false }
);

const ActivityHeatmap = dynamic(
  () => import("@/components/charts/ActivityHeatmap"),
  { ssr: false }
);
```

---

## OG 画像生成

バッジと並ぶコア機能。OSS 貢献を Twitter/X でアピールするためのカードを動的に生成する。

静的画像ではユーザーごとに異なる画像を事前生成する必要があり、データの鮮度も保てない。`@vercel/og` を使用すると、JSX で画像を記述でき、Edge Runtime で生成するため世界中から低レイテンシでアクセス可能。

```
src/app/api/og/card/
├── [owner]/[repo]/[user]/route.tsx  # リポジトリ貢献カード
└── user/[user]/route.tsx            # ユーザープロファイルカード
```

```typescript
// src/app/api/og/card/user/[user]/route.tsx

import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET(request: NextRequest, { params }: { params: { user: string } }) {
  const stats = await getUserStats(params.user);

  return new ImageResponse(
    (
      <div style={{ /* ... */ }}>
        <img src={stats.avatarUrl} />
        <h1>{stats.name}</h1>
        <p>{stats.followers} followers</p>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

---

## バッジシステム

本アプリケーションのコア機能。単なる数値（コミット数、PR 数）では「すごい」が伝わらないが、「Core Contributor」のようなラベルがあれば達成感が湧く。

OG カードにバッジを表示することで、SNS でシェアしたくなるインセンティブが生まれる。これが本アプリケーションのゲーミフィケーション要素。

閾値は実際の OSS プロジェクトを参考に設定。100+ コミットで Core Contributor（中規模プロジェクトの主要メンバー相当）、10+ PR で PR Master、1,000+ フォロワーで Influencer とした。

### コントリビューター用バッジ

```typescript
// src/lib/badges.ts

export function calculateBadges(
  contributor: ContributorDetailStat,
  totalContributors: number
): Badge[] {
  const badges: Badge[] = [];

  // コミット数ベース
  if (contributor.commits >= 100) badges.push(BADGES.core_contributor);
  else if (contributor.commits >= 50) badges.push(BADGES.dedicated_contributor);
  else if (contributor.commits >= 10) badges.push(BADGES.active_contributor);

  // 順位ベース
  if (contributor.rank === 1) badges.push(BADGES.top_contributor);
  else if (contributor.rank <= 3) badges.push(BADGES.top_3);

  // PR/レビューベース
  if (contributor.pullRequests >= 10) badges.push(BADGES.pr_master);
  if (contributor.reviews >= 10) badges.push(BADGES.reviewer);

  return badges;
}
```

### ユーザー用バッジ

```typescript
export function calculateUserBadges(stats: UserProfileStats): Badge[] {
  const badges: Badge[] = [];

  if (stats.followers >= 1000) badges.push(BADGES.influencer);
  else if (stats.followers >= 100) badges.push(BADGES.popular);

  if (stats.publicRepos >= 50) badges.push(BADGES.prolific);

  const createdYear = new Date(stats.createdAt).getFullYear();
  if (createdYear <= 2015) badges.push(BADGES.veteran);

  return badges;
}
```

### バッジ一覧

| バッジ | 条件 | カテゴリ |
|--------|------|---------|
| Top Contributor | 順位 1位 | コントリビューター |
| Core Contributor | 100+ コミット | コントリビューター |
| PR Master | 10+ PR | コントリビューター |
| Code Machine | 10,000+ 行追加 | コントリビューター |
| Influencer | 1,000+ フォロワー | ユーザー |
| Prolific | 50+ リポジトリ | ユーザー |
| Veteran | 2015年以前から利用 | ユーザー |

---

## コミット履歴のフィルタリング

認証状態に応じて取得期間を制限している。未認証は 30 日、認証済みは最大 365 日。

未認証時はレート制限が厳しいためデータ量を抑制する必要がある。長期トレンドを見たいユーザーには認証を促すインセンティブにもなる。

```typescript
// src/hooks/useCommitHistory.ts

function getBaseDays(requestedDays: number | null, isAuthenticated: boolean): number | null {
  // 未認証は30日まで
  if (!isAuthenticated) return 30;
  
  // 認証済みで90日以上リクエストなら365日分を取得
  if (requestedDays && requestedDays > 90) return 365;
  
  return 30;
}
```

クライアント側で表示用にフィルタリング:

```typescript
const filteredData = useMemo(() => {
  if (!query.data) return [];
  return filterCommitsByDays(query.data, days);
}, [query.data, days]);
```

---

## 検索機能

1 つの検索ボックスで **リポジトリ検索** と **ユーザー検索** の両方に対応したかった。検索ボックスを分けると UI が複雑になり、トグルボタンは操作が増える。

`@` プレフィックスは学習コストがあるが、Slack や GitHub 自体でも `@` がユーザー参照に使われており、開発者には馴染みがある。キーボードのみで完結するのもメリット。

```typescript
// src/hooks/useSearchRepositories.ts

export function useSearchRepositories(query: string, options: Options) {
  const isUserSearch = query.startsWith("@");
  const searchQuery = isUserSearch ? query.slice(1) : query;
  const debouncedQuery = useDebounce(searchQuery, 300);

  // ローカル + リモート検索を組み合わせ
  const repoResults = useQuery({
    queryKey: ["searchRepos", debouncedQuery],
    queryFn: async () => {
      const [local, remote] = await Promise.all([
        searchLocalRepos(debouncedQuery),
        searchRemoteRepos(debouncedQuery),
      ]);
      return mergeResults(local, remote);
    },
    enabled: !isUserSearch && debouncedQuery.length >= 2,
  });

  const userResults = useQuery({
    queryKey: ["searchUsers", debouncedQuery],
    queryFn: () => searchRemoteUsers(debouncedQuery),
    enabled: isUserSearch && debouncedQuery.length >= 1,
  });

  return { results: repoResults.data, userResults: userResults.data, isUserSearch };
}
```

---

## テスト

Vitest + React Testing Library を使用。

### テスト対象

| 対象 | ファイル |
|------|---------|
| ユーティリティ | `src/lib/__tests__/api-utils.test.ts` |
| GitHub クライアント | `src/lib/__tests__/github.test.ts` |
| バッジ計算 | `src/lib/__tests__/badges.test.ts` |
| フック | `src/hooks/__tests__/*.test.ts` |
| コンポーネント | `src/components/__tests__/*.test.tsx` |

### 実行

```bash
# watch モード
npm run test

# 単発実行
npm run test:run

# カバレッジ
npm run test:coverage
```

---

## デプロイ

### Vercel

1. リポジトリを Vercel に接続
2. 環境変数を設定: `GITHUB_ID`, `GITHUB_SECRET`, `AUTH_SECRET`
3. GitHub OAuth App のコールバック URL を設定:
   ```
   https://your-domain.vercel.app/api/auth/callback/github
   ```

### 注意事項

| 項目 | 対応 |
|------|------|
| 画像ドメイン許可 | `next.config.ts` に `avatars.githubusercontent.com` を設定 |
| Recharts SSR | `dynamic` インポートで無効化 |
| プレビュー環境 | コールバック URL にワイルドカード設定が必要 |
