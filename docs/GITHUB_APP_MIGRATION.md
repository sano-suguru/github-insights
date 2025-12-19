# GitHub App移行計画

## 目的

OAuth AppからGitHub Appへ移行し、以下を実現する：

1. **セキュリティ向上**: 読み取り専用権限の明示的な設定
2. **ユーザー信頼性**: 書き込み権限を要求しない透明性
3. **将来の拡張性**: GitHub Marketplace対応、より高いレート制限
4. **最小権限の原則**: 必要な権限のみを要求

---

## 現状分析

### 現在のOAuth App構成

**環境変数:**
```bash
GITHUB_ID=<OAuth App Client ID>
GITHUB_SECRET=<OAuth App Client Secret>
NEXTAUTH_SECRET=<NextAuth Secret>
NEXTAUTH_URL=http://localhost:3001
```

**スコープ設定:**
- **Public**: `read:user user:email` (デフォルト)
- **Private**: `read:user user:email repo` (オプション、書き込み権限含む)

**認証フロー:**
1. NextAuth v5 + GitHub Provider
2. 2つのサインイン関数:
   - `signInWithPublicScope()` - Publicリポジトリのみ
   - `signInWithPrivateScope()` - Private含む（repo権限）

**トークン管理:**
- JWT callbackでアクセストークンを取得
- Session callbackでクライアントに渡す
- 全APIルートハンドラーで `auth()` を使用してトークン取得

**使用箇所:**
- `src/lib/auth.ts` - NextAuth設定
- `src/lib/actions.ts` - Server Actions
- `src/app/api/github/**/route.ts` - 33ファイルでアクセストークン使用
- `src/lib/github/*.ts` - GitHubクライアント作成

---

## GitHub Appの設計

### 権限設定（Permissions）

GitHub Appでは以下の細かい権限を設定可能：

| 権限 | アクセスレベル | 用途 |
|------|--------------|------|
| **Repository permissions** | | |
| Contents | Read-only | リポジトリのコード、コミット履歴を読み取り |
| Metadata | Read-only | リポジトリの基本情報（デフォルトで付与） |
| **Account permissions** | | |
| Email addresses | Read-only | ユーザーのメールアドレス取得 |

**重要**:
- `Contents: Read-only` で、コミット履歴・言語統計・ファイル内容の読み取りが可能
- 書き込み権限（Write）は一切要求しない
- OAuth Appの `repo` スコープより格段に安全

### インストール方式

GitHub Appには2つのインストール方式がある：

#### 1. User-to-Server (推奨)
- ユーザーが自分のアカウントにインストール
- 既存のOAuth Appと同様のUX
- NextAuthとの統合が容易

#### 2. Installation-based
- ユーザーがリポジトリを選択してインストール
- より細かい権限制御
- 実装が複雑

**選択**: User-to-Server方式を採用（既存フローとの互換性が高い）

---

## 技術実装計画

### フェーズ1: GitHub App作成と設定（手動作業）

#### ステップ1: GitHub Appの登録

1. GitHub設定画面へアクセス
   - https://github.com/settings/apps/new

2. 基本設定
   ```
   GitHub App name: GitHub Insights (Production)
   Homepage URL: https://github-insights-orpin.vercel.app
   Callback URL: https://github-insights-orpin.vercel.app/api/auth/callback/github

   開発環境用:
   Callback URL: http://localhost:3001/api/auth/callback/github
   ```

3. Webhook設定
   ```
   Active: ❌ (無効化 - このアプリはWebhookを使用しない)
   ```

4. 権限設定
   ```
   Repository permissions:
     - Contents: Read-only
     - Metadata: Read-only (自動付与)

   Account permissions:
     - Email addresses: Read-only
   ```

5. Where can this GitHub App be installed?
   ```
   ✅ Any account (公開アプリとして誰でもインストール可能)
   ```

6. 作成後に取得する情報
   - **App ID**
   - **Client ID**
   - **Client Secret** (生成してコピー)
   - **Private Key** (Generate private keyをクリック、.pemファイルをダウンロード)

#### ステップ2: 環境変数の更新

`.env.local` を更新:

```bash
# GitHub App設定（OAuth Appから移行）
GITHUB_APP_CLIENT_ID=Iv1.xxxxxxxxxxxxx
GITHUB_APP_CLIENT_SECRET=xxxxxxxxxxxxx
# Private Keyは改行を含むため、base64エンコードして保存
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIE...省略...\n-----END RSA PRIVATE KEY-----

# NextAuth設定（変更なし）
NEXTAUTH_SECRET=existing_secret
NEXTAUTH_URL=http://localhost:3001

# 後方互換性のため、旧環境変数も残す（移行期間中）
GITHUB_ID=old_oauth_client_id
GITHUB_SECRET=old_oauth_client_secret
```

Vercel環境変数も同様に設定。

---

### フェーズ2: コード修正

#### 変更1: `src/lib/auth.ts`

**Before (OAuth App):**
```typescript
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const SCOPES = {
  PUBLIC: "read:user user:email",
  PRIVATE: "read:user user:email repo",
} as const;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: SCOPES.PUBLIC,
        },
      },
    }),
  ],
  // callbacks...
});
```

**After (GitHub App):**
```typescript
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// GitHub Appでは権限はアプリ設定で管理されるため、スコープ不要
// ただし、user情報取得のため最小限のスコープは指定
export const SCOPES = {
  USER: "read:user user:email",
} as const;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_APP_CLIENT_ID!,
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: SCOPES.USER,
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        // GitHub Appではインストール情報も取得可能
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      if (profile) {
        token.login = (profile as { login?: string }).login;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.login = token.login as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
```

**主な変更点:**
- 環境変数を `GITHUB_ID` → `GITHUB_APP_CLIENT_ID` に変更
- `SCOPES.PRIVATE` を削除（GitHub Appでは不要）
- `scope` フィールドを削除（Session型から）

#### 変更2: `src/lib/actions.ts`

**Before:**
```typescript
"use server";

import { signIn, signOut, SCOPES } from "@/lib/auth";

export async function signInWithPublicScope() {
  await signIn("github", { redirectTo: "/dashboard" });
}

export async function signInWithPrivateScope() {
  const params = new URLSearchParams({
    scope: SCOPES.PRIVATE,
  });
  await signIn("github", { redirectTo: "/dashboard" }, params);
}

export async function handleSignOut() {
  await signOut({ redirectTo: "/" });
}
```

**After:**
```typescript
"use server";

import { signIn, signOut } from "@/lib/auth";

// GitHub Appでは単一のサインインのみ
// 権限はアプリ登録時に設定済み
export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/dashboard" });
}

export async function handleSignOut() {
  await signOut({ redirectTo: "/" });
}
```

**主な変更点:**
- `signInWithPublicScope` と `signInWithPrivateScope` を統合
- スコープ指定を削除

#### 変更3: `src/types/next-auth.d.ts`

**Before:**
```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    scope?: string;
    login?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    scope?: string;
    login?: string;
  }
}
```

**After:**
```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    login?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    login?: string;
  }
}
```

**主な変更点:**
- `scope` フィールドを削除
- `refreshToken`, `expiresAt` を追加（将来のトークン更新に備える）

#### 変更4: UIコンポーネントの更新

**ファイル:**
- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/components/AppHeader.tsx`

**変更内容:**
1. Private/Publicの切り替えUIを削除
2. 単一の「GitHubでログイン」ボタンに統合
3. 権限説明を更新:
   ```tsx
   <p>
     このアプリは読み取り専用権限のみを要求します。
     リポジトリへの書き込みは一切行いません。
   </p>
   ```

**Before (login/page.tsx):**
```tsx
<form action={signInWithPublicScope}>
  <button>Publicのみでログイン</button>
</form>
<form action={signInWithPrivateScope}>
  <button>Privateリポジトリも含めてログイン</button>
</form>
```

**After:**
```tsx
<form action={signInWithGitHub}>
  <button className="...">
    <Github className="w-5 h-5" />
    GitHubでログイン
  </button>
</form>
<div className="mt-4 text-sm text-gray-600">
  <p>✅ 読み取り専用アクセス</p>
  <p>❌ 書き込み権限は不要</p>
</div>
```

#### 変更5: `src/lib/github/client.ts`

**変更なし** - トークンの使用方法は同じ

GitHub Appから取得したアクセストークンも、OAuth Appと同じ形式で使用可能。

```typescript
export function createGitHubClient(accessToken: string) {
  return graphql.defaults({
    headers: {
      authorization: `token ${accessToken}`,
    },
  });
}
```

#### 変更6: APIルートハンドラー

**変更なし** - `auth()` の使用方法は同じ

すべてのAPIルートハンドラー（33ファイル）はそのまま動作。

```typescript
export async function GET(request: NextRequest) {
  const session = await auth();
  const accessToken = session?.accessToken ?? null;
  // ...
}
```

---

### フェーズ3: テスト計画

#### ローカル環境でのテスト

1. **環境変数の設定**
   ```bash
   cp .env.local .env.local.backup
   # .env.localにGitHub App情報を設定
   ```

2. **開発サーバー起動**
   ```bash
   npm run dev
   ```

3. **認証フローのテスト**
   - [ ] ログインページにアクセス
   - [ ] 「GitHubでログイン」をクリック
   - [ ] GitHub App承認画面が表示される
   - [ ] 権限が「Contents: Read-only」のみであることを確認
   - [ ] 承認後、ダッシュボードにリダイレクト
   - [ ] アクセストークンが取得できている

4. **機能テスト**
   - [ ] Publicリポジトリの分析
   - [ ] Privateリポジトリの分析（アクセス権があるリポジトリ）
   - [ ] 言語統計の表示
   - [ ] コミット履歴の表示
   - [ ] コントリビューターランキング
   - [ ] OGカード生成

5. **エラーハンドリング**
   - [ ] 存在しないリポジトリ
   - [ ] アクセス権のないPrivateリポジトリ
   - [ ] レート制限のテスト

#### Vercel（本番）でのテスト

1. **環境変数の設定**
   - Vercel Dashboardで環境変数を更新
   - Production, Preview, Development すべてに設定

2. **デプロイ**
   ```bash
   git push origin main
   ```

3. **本番環境で同様のテストを実施**

---

### フェーズ4: 移行とロールバック計画

#### 段階的移行（推奨）

**ステップ1: Preview環境で検証**
1. GitHub Appを作成（Development用）
2. Vercel Preview環境でテスト
3. 問題がなければ次へ

**ステップ2: 本番環境へ移行**
1. 本番用GitHub App作成
2. Vercel本番環境変数を更新
3. デプロイ

**ステップ3: 既存ユーザーへの対応**
- OAuth Appの認証は自動的に無効化される
- 次回ログイン時にGitHub Appでの再認証を促す
- 「セッションが切れました。再度ログインしてください」メッセージを表示

#### ロールバック計画

問題が発生した場合:

1. **環境変数を元に戻す**
   ```bash
   GITHUB_APP_CLIENT_ID → GITHUB_ID
   GITHUB_APP_CLIENT_SECRET → GITHUB_SECRET
   ```

2. **コードをリバート**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **古いOAuth Appは削除しない**（移行完了まで保持）

---

## 変更ファイル一覧

### コード変更が必要なファイル

| ファイル | 変更内容 | 難易度 |
|---------|---------|-------|
| `src/lib/auth.ts` | 環境変数名、スコープ定義の変更 | ⭐ 簡単 |
| `src/lib/actions.ts` | サインイン関数の統合 | ⭐ 簡単 |
| `src/types/next-auth.d.ts` | Session型からscope削除 | ⭐ 簡単 |
| `src/app/page.tsx` | ログインUIの簡素化 | ⭐⭐ 中程度 |
| `src/app/login/page.tsx` | Public/Private選択UIの削除 | ⭐⭐ 中程度 |
| `src/components/AppHeader.tsx` | アップグレードバナー削除 | ⭐⭐ 中程度 |
| `.env.local.example` | 環境変数名の更新 | ⭐ 簡単 |
| `CLAUDE.md` | ドキュメント更新 | ⭐ 簡単 |
| `README.md` | 環境変数セクション更新 | ⭐ 簡単 |
| `docs/IMPLEMENTATION.md` | 認証セクション更新 | ⭐ 簡単 |

### 変更不要なファイル

- `src/lib/github/*.ts` - GitHubクライアント（トークン使用方法は同じ）
- `src/app/api/github/**/route.ts` - APIルートハンドラー（auth()使用は同じ）
- `src/hooks/*.ts` - React Query hooks（変更なし）
- すべてのテストファイル（認証モックは同じロジック）

---

## 実装スケジュール

### 推定作業時間

| フェーズ | タスク | 所要時間 |
|---------|-------|---------|
| **準備** | GitHub App作成と設定 | 30分 |
| | 環境変数の設定 | 15分 |
| **実装** | auth.ts, actions.ts修正 | 30分 |
| | UI コンポーネント修正 | 1時間 |
| | ドキュメント更新 | 30分 |
| **テスト** | ローカルテスト | 30分 |
| | E2Eテスト修正（必要なら） | 30分 |
| | Vercel Preview環境テスト | 30分 |
| **デプロイ** | 本番デプロイと監視 | 30分 |

**合計: 約5時間**

### マイルストーン

1. ✅ GitHub App作成完了（2024-12-19）
2. ✅ コード修正完了（2024-12-19）
3. ✅ ローカル環境で動作確認完了（2024-12-19）
4. ✅ 本番用GitHub App作成完了（2024-12-19）
5. ✅ Vercel環境変数設定完了（2024-12-19）
6. ✅ 本番環境デプロイ成功（2024-12-19）
7. ⬜ 旧OAuth Appの無効化（移行完了後）

---

## リスクと対策

### リスク1: 既存ユーザーのセッション切断

**影響**: 既存のログインユーザーが強制ログアウトされる

**対策**:
- リリースノートで事前通知
- ログインページに「認証方式を更新しました」メッセージ表示
- 影響は一時的（再ログインで解決）

### リスク2: Private keyの管理

**影響**: Private keyが漏洩するとアプリが悪用される

**対策**:
- `.gitignore`に `.pem` を追加
- 環境変数で安全に管理
- Vercelの暗号化ストレージを使用

### リスク3: レート制限の変化

**影響**: GitHub Appのレート制限が異なる可能性

**対策**:
- ドキュメント確認: GitHub Appは通常OAuth Appより高い制限
- 監視ダッシュボードでレート制限をモニタリング

### リスク4: NextAuth v5の互換性

**影響**: GitHub App特有のトークン形式に対応が必要な場合

**対策**:
- NextAuth v5はGitHub Appをサポート済み
- テスト環境で事前検証

---

## 移行後の利点

### セキュリティ

- ✅ 書き込み権限を一切要求しない
- ✅ 読み取り専用が明示的
- ✅ ユーザーの信頼性向上

### パフォーマンス

- ✅ より高いレート制限（5,000+ req/h）
- ✅ 専用APIエンドポイント

### 将来性

- ✅ GitHub Marketplace対応可能
- ✅ 組織向け販売対応
- ✅ Webhookでリアルタイム更新（将来実装可能）
- ✅ GitHubが推奨する公式方式

---

## 次のアクション

### ✅ 完了済み（2024-12-19）

1. ✅ このドキュメントをレビュー
2. ✅ GitHub App作成（Development用: Insights Hub Dev）
3. ✅ フェーズ1: GitHub App作成
4. ✅ フェーズ2: コード修正
   - ✅ `src/lib/auth.ts` - 環境変数とスコープ変更
   - ✅ `src/lib/actions.ts` - サインイン関数統合
   - ✅ `src/types/next-auth.d.ts` - 型定義更新
   - ✅ `src/app/page.tsx` - トップページUI更新
   - ✅ `src/app/login/page.tsx` - ログインページUI更新
   - ✅ `src/components/AppHeader.tsx` - ヘッダーUI更新
   - ✅ `.env.local.example` - 環境変数テンプレート更新
5. ✅ フェーズ3: ローカルテスト（2024-12-19）
   - ✅ ローカル環境でブラウザテスト（http://localhost:3001）
   - ✅ 認証フローの動作確認
   - ✅ リポジトリ分析機能の動作確認
6. ✅ 本番用GitHub App作成（Production: App ID 2497175）
7. ✅ Vercel環境変数の設定（Dashboard経由）
8. ✅ フェーズ4: 本番デプロイ（2024-12-19）
   - ✅ 本番環境で認証フローの動作確認
   - ✅ 読み取り専用権限の確認

### 📋 今後の作業

1. ⬜ 既存ユーザーへの通知（移行完了の案内）
2. ⬜ 旧OAuth Appの無効化（既存ユーザーの移行完了後）
3. ⬜ ドキュメント更新（README.md、CLAUDE.mdなど）

---

## 参考資料

- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [NextAuth GitHub Provider](https://next-auth.js.org/providers/github)
- [GitHub App Permissions](https://docs.github.com/en/rest/overview/permissions-required-for-github-apps)
- [Migrating OAuth Apps to GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/guides/migrating-oauth-apps-to-github-apps)
