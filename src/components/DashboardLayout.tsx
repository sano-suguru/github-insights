"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import RepoSearchCombobox from "@/components/RepoSearchCombobox";

interface DashboardLayoutProps {
  /** 子要素（ページコンテンツ） */
  children?: ReactNode;
  /** ローディング中かどうか */
  isLoading?: boolean;
  /** 検索バーを非表示にする */
  hideSearchBar?: boolean;
}

/**
 * 統一レイアウトコンポーネント
 * - AppHeader（ロゴ + 認証状態）
 * - 検索バー（カード型）
 * - コンテンツ領域
 */
export default function DashboardLayout({
  children,
  isLoading = false,
  hideSearchBar = false,
}: DashboardLayoutProps) {
  const router = useRouter();

  const handleSelectRepo = (repo: string) => {
    // @username 形式の場合はユーザーページへ
    if (repo.startsWith("@")) {
      router.push(`/user/${repo.slice(1)}`);
    } else {
      // owner/repo 形式の場合はリポジトリページへ
      router.push(`/repo/${repo}`);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-purple-50/30 to-gray-50 dark:from-gray-800 dark:via-purple-900/30 dark:to-gray-800">
      {/* 共通ヘッダー */}
      <AppHeader />

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 検索バー（カード型） */}
        {!hideSearchBar && (
          <div className="relative z-content bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 mb-8">
            <RepoSearchCombobox
              onSelectRepo={handleSelectRepo}
              placeholder="リポジトリ or @ユーザー を検索..."
            />
          </div>
        )}

        {/* ローディング状態 */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                読み込み中...
              </p>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

/**
 * 統計カードコンポーネント（共通化）
 */
interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: "purple" | "yellow" | "blue" | "green" | "default";
}

export function StatCard({ label, value, icon, color = "default" }: StatCardProps) {
  const colorClasses = {
    purple: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400",
    yellow: "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400",
    blue: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
    green: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
    default: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400",
  };

  return (
    <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-3 sm:p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group overflow-hidden">
      {/* グラデーション装飾 */}
      <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`shrink-0 p-1.5 sm:p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * セクションカードコンポーネント（共通化）
 */
interface SectionCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, children, className = "" }: SectionCardProps) {
  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300 ${className}`}>
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full"></span>
        {title}
      </h2>
      {children}
    </div>
  );
}
