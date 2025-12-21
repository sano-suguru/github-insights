"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Shield, Check } from "lucide-react";
import { signInWithGitHub } from "@/lib/actions";
import { GitHubIcon } from "@/components/icons";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* ロゴ・タイトル */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-linear-to-r from-purple-500 to-pink-500 mb-4">
                <GitHubIcon className="w-8 h-8 text-white" />
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              GitHub Insights
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              GitHubの貢献度を可視化して分析しよう
            </p>
          </div>

          {/* 機能説明 */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">貢献度の可視化</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">コミット、PR、Issueをグラフで確認</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center">
                <svg className="w-4 h-4 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">言語統計</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">使用言語の割合を円グラフで表示</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">活動パターン</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">曜日・時間帯別の活動をヒートマップで分析</p>
              </div>
            </div>
          </div>

          {/* ログインボタン */}
          <div className="space-y-4 mb-6">
            <form action={signInWithGitHub}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium py-3 px-4 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-lg"
              >
                <GitHubIcon className="w-5 h-5" />
                GitHubでログイン
              </button>
            </form>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-sm">
              <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-medium mb-2">
                <Shield className="w-4 h-4" />
                <p>安全な読み取り専用アクセス</p>
              </div>
              <ul className="text-purple-800 dark:text-purple-300 space-y-1 text-xs">
                <li className="flex items-start gap-2">
                  <Check className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>リポジトリへの書き込みは一切行いません</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Public・Privateリポジトリ両方にアクセス可能</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>オープンソースで透明性を確保</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 未ログインで閲覧 */}
          <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link 
              href="/"
              className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              ← ログインせずにPublicリポジトリを閲覧
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
