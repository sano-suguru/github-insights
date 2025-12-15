# GitHub Insights

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

GitHub リポジトリ・ユーザーの貢献度を可視化する Web アプリケーション

**デモ**: [github-insights-orpin.vercel.app](https://github-insights-orpin.vercel.app)

![Dashboard](docs/screenshots/dashboard.png)

---

## なぜ作ったか

GitHub の貢献データは **Contributions グラフ、リポジトリページ、プロフィールページ** に分散しており、「自分がどれだけ貢献したか」を伝えにくい。

特に以下のような場面で課題を感じていた：

| 場面 | 課題 |
|------|------|
| OSS 貢献のアピール | コミット数や順位が一目でわからない |
| モチベーション | 数値だけでは達成感が湧きにくい |
| ポートフォリオ | SNS で共有できる形式がない |

本アプリケーションは、GitHub GraphQL API からデータを集約し、**バッジによる達成感の演出** と **SNS でシェアしたくなる OG カード** を提供することで、OSS 貢献を「見せる」体験に変える。

---

## 機能一覧

| 機能 | 説明 | ユーザー価値 |
|------|------|----------|
| バッジシステム | 貢献度に応じてバッジを自動付与 | 「Core Contributor」などの称号で達成感を演出 |
| OG カード生成 | SNS 共有用の画像を動的生成 | Twitter/X で「見せたくなる」カード |
| コントリビューターランキング | 貢献者を順位付け | 「あのリポジトリで 3 位」と言える |
| 言語統計 | リポジトリの言語構成を円グラフで表示 | プロジェクトの技術構成を一目で把握 |
| コミット推移 | 期間別コミット数を折れ線グラフで可視化 | 開発活動のトレンドを分析 |
| アクティビティヒートマップ | 曜日×時間帯の活動パターンを表示 | 作業スタイルの傾向を可視化 |

---

## OG カード

OSS 貢献を SNS でアピールするためのカード。`@vercel/og` を使用して Edge Runtime で動的に生成する。

![OG Card Example](docs/screenshots/og-card-user.png)

| エンドポイント | 用途 | シェア例 |
|---------------|------|--------|
| `/api/og/card/[owner]/[repo]/[user]` | リポジトリ貢献カード | 「Next.js に 50 コミットして 3 位になりました！」 |
| `/api/og/card/user/[user]` | ユーザープロファイルカード | 「私の GitHub 統計です」 |

バッジや順位がカードに表示されることで、「シェアしたい」と思わせるデザインにしている。

---

## 技術スタック

| 役割 | 技術 | 選定理由 |
|------|------|----------|
| フレームワーク | Next.js 16 (App Router) | RSC + Route Handler でフルスタック開発 |
| 言語 | TypeScript | 型安全性による開発効率向上 |
| 認証 | NextAuth v5 + GitHub OAuth | GitHub 連携に最適化された認証ライブラリ |
| データ取得 | TanStack Query + Octokit GraphQL | キャッシュ管理の自動化 + 型安全な API クライアント |
| チャート | Recharts | React 向け、カスタマイズ性が高い |
| スタイル | Tailwind CSS v4 | ユーティリティファーストで高速開発 |
| テスト | Vitest + React Testing Library | Jest 互換で高速、React 公式推奨 |
| UI カタログ | Storybook | コンポーネント単体の開発・テスト |

---

## アーキテクチャ

```mermaid
graph TB
    subgraph Client
        Component[React Component]
        Hook[Custom Hook]
        Query[TanStack Query]
    end
    
    subgraph Server
        Route[API Route Handler]
        Cache[unstable_cache]
    end
    
    subgraph External
        GitHub[(GitHub GraphQL API)]
    end
    
    Component --> Hook
    Hook --> Query
    Query --> Route
    Route --> Cache
    Cache --> GitHub
    
    style Client fill:#e1f5fe
    style Server fill:#fff3e0
```

---

## 認証フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant App as Next.js
    participant GitHub as GitHub OAuth

    User->>App: ログインボタン
    App->>GitHub: OAuth 認可リクエスト
    GitHub-->>User: 認可画面
    User->>GitHub: 許可
    GitHub-->>App: アクセストークン
    App-->>User: ダッシュボード
```

| スコープ | 説明 |
|---------|------|
| `read:user user:email` | Public リポジトリのみ |
| `read:user user:email repo` | Private リポジトリ含む |

`repo` スコープは Private リポジトリへのアクセス権限を含むため、ユーザーによっては抵抗がある。Public リポジトリのみ分析したいユーザー向けに、最小権限のスコープも選択可能にした。

未認証ユーザーも Public リポジトリの分析が可能。OSS リポジトリの分析に認証は本質的に不要で、ログインなしで試せることでユーザー獲得のハードルを下げる。ただし GitHub API のレート制限（60 リクエスト/時間）があるため、キャッシュ戦略で対応している（詳細は [IMPLEMENTATION.md](docs/IMPLEMENTATION.md)）。

---

## クイックスタート

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local

# 開発サーバー起動
npm run dev

# http://localhost:3001
```

### 環境変数

| 変数 | 説明 |
|------|------|
| `GITHUB_ID` | GitHub OAuth App Client ID |
| `GITHUB_SECRET` | GitHub OAuth App Client Secret |
| `AUTH_SECRET` | NextAuth 用シークレット |

---

## 開発コマンド

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 (port 3001) |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint 実行 |
| `npm run test` | Vitest 実行 (watch モード) |
| `npm run test:run` | テスト実行 (単発) |
| `npm run test:coverage` | カバレッジ計測 |
| `npm run storybook` | Storybook 起動 |
| `npm run update-repos` | 人気リポジトリ JSON 更新 |

---

## プロジェクト構成

```
├── src/
│   ├── app/                    # App Router
│   │   ├── api/
│   │   │   ├── auth/           # NextAuth ハンドラー
│   │   │   ├── github/         # GitHub API プロキシ（キャッシュ付き）
│   │   │   └── og/card/        # OG 画像生成
│   │   ├── dashboard/          # 認証済みダッシュボード
│   │   ├── repo/[owner]/[repo]/ # リポジトリ詳細（未認証アクセス可）
│   │   └── user/[username]/    # ユーザープロファイル
│   ├── components/
│   │   └── charts/             # Recharts ラッパー（SSR 無効化）
│   ├── hooks/                  # TanStack Query ラッパー
│   └── lib/                    # GitHub API クライアント・ユーティリティ
├── public/data/                # 人気リポジトリ JSON
├── scripts/                    # 人気リポジトリ取得スクリプト
└── docs/                       # ドキュメント
```

---

## 詳細ドキュメント

📖 **[技術解説 (IMPLEMENTATION.md)](docs/IMPLEMENTATION.md)**

- キャッシュ戦略（サーバー/クライアント）
- 認証/未認証の分岐パターン
- レート制限対策
- OG 画像生成
- バッジシステム
- GitHub Actions による人気リポジトリ自動更新

📋 **[開発ロードマップ (ROADMAP.md)](docs/ROADMAP.md)**

---

## License

MIT
