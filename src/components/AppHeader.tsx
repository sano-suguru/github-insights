"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GitHubIcon } from "@/components/icons";

/**
 * 共通ヘッダーコンポーネント
 * - ロゴ + 認証状態 + テーマトグル + ログアウトボタン
 * - 認証済み/未認証の両方に対応
 * - 検索バーはDashboardLayout側で表示
 */
export default function AppHeader() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && session?.user;

  return (
    <header className="sticky top-0 z-header bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-sm border-b border-gray-200/50 dark:border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* ロゴ */}
          <Link href="/" className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-linear-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <GitHubIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <h1 className="hidden md:block text-xl font-bold text-gray-900 dark:text-white">
              GitHub Insights
            </h1>
          </Link>

          {/* 右側: テーマトグル + ユーザー情報またはログインリンク */}
          <nav className="flex items-center gap-2 sm:gap-4 shrink-0" aria-label="ユーザーメニュー">
            {/* テーマトグル */}
            <ThemeToggle />

            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* ユーザーアバター */}
                  {session.user?.image && (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      width={32}
                      height={32}
                      className="rounded-full w-7 h-7 sm:w-8 sm:h-8"
                    />
                  )}
                  {/* ユーザー名（デスクトップのみ） */}
                  <span className="hidden md:block text-sm text-gray-700 dark:text-gray-300 max-w-30 truncate">
                    {session.user?.name}
                  </span>
                </div>
                {/* ログアウトボタン */}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1.5 sm:px-3 sm:py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            ) : (
              // 未認証時はログインへのリンク
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm"
              >
                <GitHubIcon className="w-4 h-4" />
                <span className="hidden sm:inline">GitHubで</span>ログイン
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
