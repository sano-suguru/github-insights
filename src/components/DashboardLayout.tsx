"use client";

import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import AppHeader from "@/components/AppHeader";
import RepoSearchCombobox from "@/components/RepoSearchCombobox";
import { Repository } from "@/lib/github";

interface DashboardLayoutProps {
  /** 子要素（ページコンテンツ） */
  children?: ReactNode;
  /** Private スコープへのアップグレードバナーを表示するか */
  showUpgradeBanner?: boolean;
  /** ユーザーのリポジトリ一覧（認証済みの場合） */
  repositories?: Repository[];
  /** 現在選択中のリポジトリ（ダッシュボード用） */
  selectedRepo?: string;
  /** リポジトリ選択時のコールバック（ダッシュボード用） */
  onSelectRepo?: (repo: string) => void;
  /** 検索バーを非表示にする */
  hideSearchBar?: boolean;
  /** ローディング中かどうか */
  isLoading?: boolean;
}

/**
 * 統一レイアウトコンポーネント
 * - AppHeader（ロゴ + 認証状態）
 * - 検索バー（リポジトリ + ユーザー検索）
 * - コンテンツ領域
 */
export default function DashboardLayout({
  children,
  showUpgradeBanner = false,
  repositories = [],
  selectedRepo = "",
  onSelectRepo,
  hideSearchBar = false,
  isLoading = false,
}: DashboardLayoutProps) {
  const router = useRouter();

  // リポジトリ選択時のデフォルトハンドラー（リポジトリページへ遷移）
  const handleSelectRepo = (repo: string) => {
    if (onSelectRepo) {
      onSelectRepo(repo);
    } else {
      // デフォルト: リポジトリページへ遷移
      const [owner, repoName] = repo.split("/");
      if (owner && repoName) {
        router.push(`/repo/${owner}/${repoName}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-purple-50/30 to-gray-50 dark:from-gray-800 dark:via-purple-900/30 dark:to-gray-800">
      {/* 共通ヘッダー */}
      <AppHeader showUpgradeBanner={showUpgradeBanner} />

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 検索バーエリア */}
        {!hideSearchBar && (
          <div className="relative z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8">
            <RepoSearchCombobox
              repositories={repositories}
              selectedRepo={selectedRepo}
              onSelectRepo={handleSelectRepo}
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
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
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
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 ${className}`}>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}
