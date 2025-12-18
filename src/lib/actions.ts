"use server";

import { signIn, signOut } from "@/lib/auth";

/**
 * GitHubでサインイン
 * GitHub Appでは単一のサインインのみ（権限はアプリ登録時に設定済み）
 */
export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/dashboard" });
}

/**
 * サインアウト
 */
export async function handleSignOut() {
  await signOut({ redirectTo: "/" });
}
