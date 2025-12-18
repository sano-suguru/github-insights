"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";

/**
 * 共通ヘッダーコンポーネント
 * - ロゴ + 認証状態 + ログアウトボタン
 * - 認証済み/未認証の両方に対応
 */
export default function AppHeader() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && session?.user;

  return (
    <>

      {/* ヘッダー */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-sm border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            {/* ロゴ */}
            <Link href="/" className="flex items-center gap-2 sm:gap-4 shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-linear-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <h1 className="hidden sm:block text-xl font-bold text-gray-900 dark:text-white">
                GitHub Insights
              </h1>
            </Link>

            {/* 右側: ユーザー情報またはログインリンク */}
            <div className="flex items-center gap-2 sm:gap-4">
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
                    <span className="hidden md:block text-sm text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
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
                  className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  ログイン
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
