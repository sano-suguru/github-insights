"use server";

import { signIn } from "@/lib/auth";

/**
 * GitHubでサインイン
 * GitHub Appでは単一のサインインのみ（権限はアプリ登録時に設定済み）
 */
export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/dashboard" });
}
