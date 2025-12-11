"use server";

import { signIn, signOut, SCOPES } from "@/lib/auth";

// Publicリポジトリのみでログイン
export async function signInWithPublicScope() {
  await signIn("github", { 
    redirectTo: "/dashboard",
  });
}

// Privateリポジトリも含めてログイン
// 注: NextAuth v5では動的スコープ変更に制限があるため、
// 再認証時はGitHubの権限ページで追加権限を承認する必要があります
export async function signInWithPrivateScope() {
  // GitHubのOAuth URLに直接スコープを追加してリダイレクト
  const params = new URLSearchParams({
    scope: SCOPES.PRIVATE,
  });
  await signIn("github", { 
    redirectTo: "/dashboard",
  }, params);
}

// ログアウト
export async function handleSignOut() {
  await signOut({ redirectTo: "/" });
}
