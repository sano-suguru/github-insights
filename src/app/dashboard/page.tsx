"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { GitCommit, GitPullRequest, CircleDot, Star, Plus, Minus, Trophy, ExternalLink, Share2, Github } from "lucide-react";
import type { ContributorDetailStat } from "@/lib/github/types";
import { calculateBadges, sortBadgesByImportance } from "@/lib/badges";
import dynamic from "next/dynamic";
import RepoSearchCombobox from "@/components/RepoSearchCombobox";
import ContributionCardModal from "@/components/ContributionCardModal";
import ContributorRanking from "@/components/ContributorRanking";
import { PeriodSelector } from "@/components/PeriodSelector";
import { useRepositories } from "@/hooks/useRepositories";
import { useCommitHistory, usePrefetchCommitHistory } from "@/hooks/useCommitHistory";
import { useRepoAllData } from "@/hooks/useRepoData";
import { ChartErrorWrapper } from "@/components/ErrorDisplay";
import AppHeader from "@/components/AppHeader";
import {
  StatsGridSkeleton,
  PieChartSkeleton,
  LineChartSkeleton,
  HeatmapSkeleton,
  BarChartSkeleton,
  RankingSkeleton,
  MyContributionSkeleton,
  ChartSkeletonWrapper,
} from "@/components/Skeleton";

// SSR無効化してチャートを読み込み
const LanguagesPieChart = dynamic(
  () => import("@/components/charts/LanguagesPieChart"),
  { ssr: false }
);
const CommitsLineChart = dynamic(
  () => import("@/components/charts/CommitsLineChart"),
  { ssr: false }
);
const ContributorChartWithToggle = dynamic(
  () => import("@/components/charts/ContributorChartWithToggle"),
  { ssr: false }
);
const ActivityHeatmap = dynamic(
  () => import("@/components/charts/ActivityHeatmap"),
  { ssr: false }
);

// ローディングコンポーネント
function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">読み込み中...</p>
      </div>
    </div>
  );
}

// メインのダッシュボードページ（Suspenseでラップ）
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}

// 実際のダッシュボードコンテンツ
function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefetchCommits = usePrefetchCommitHistory();

  // URLからリポジトリを取得
  const repoFromUrl = searchParams.get("repo");
  const selectedRepo = repoFromUrl || "";
  const [selectedDays, setSelectedDays] = useState<number | null>(30);

  // リポジトリ一覧取得（React Query）
  const { data: repositories = [], isLoading: reposLoading } = useRepositories(
    session?.accessToken ?? null
  );

  // 実際に使用するリポジトリ（選択されていない場合は最初のリポジトリ）
  const activeRepo = selectedRepo || (repositories.length > 0 ? repositories[0].nameWithOwner : "");

  // リポジトリ選択時に /repo/owner/repo へ遷移
  const handleSelectRepo = useCallback((repo: string) => {
    router.push(`/repo/${repo}`, { scroll: false });
  }, [router]);

  // 選択リポジトリのowner/repo
  const [owner, repo] = activeRepo ? activeRepo.split("/") : ["", ""];

  // 統合API経由で全データを一括取得（セカンダリレート制限対策）
  const {
    repository,
    languages,
    contributorStats: contributors,
    contributorDetails,
    repositoryStats: stats,
    isLoading: allDataLoading,
    isError: allDataError,
    error: allDataErrorData,
    refetch: refetchAllData,
  } = useRepoAllData({
    owner,
    repo,
    enabled: !!activeRepo,
  });

  // 期間ホバー時にプリフェッチ
  const handlePeriodHover = useCallback((days: number | null) => {
    if (!repository) return;
    prefetchCommits(session?.accessToken ?? null, owner, repo, days);
  }, [prefetchCommits, session?.accessToken, owner, repo, repository]);

  const { data: commits = [], isLoading: commitsLoading, isFetching: commitsFetching, isError: commitsError, error: commitsErrorData, refetch: refetchCommits } = useCommitHistory({
    accessToken: session?.accessToken ?? null,
    owner,
    repo,
    days: selectedDays,
    enabled: !!repository,
  });

  // 認証チェック
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // URLにリポジトリが指定されていれば /repo/owner/repo へリダイレクト
  useEffect(() => {
    if (repoFromUrl && status === "authenticated") {
      router.replace(`/repo/${repoFromUrl}`);
    }
  }, [repoFromUrl, status, router]);

  if (status === "loading" || reposLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-purple-50/30 to-gray-50 dark:from-gray-800 dark:via-purple-900/30 dark:to-gray-800">
      {/* ヘッダー */}
      <AppHeader />

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* リポジトリ選択エリア */}
        <div className="relative z-content bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8">
          <RepoSearchCombobox
            repositories={repositories}
            selectedRepo={activeRepo}
            onSelectRepo={handleSelectRepo}
          />
          
          {/* 現在選択中のリポジトリ */}
          {activeRepo && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <a
                href={`https://github.com/${activeRepo}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors group ${
                    allDataLoading || commitsLoading ? "animate-pulse shadow-lg shadow-purple-500/30" : ""
                }`}
              >
                <Github className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-purple-700 dark:text-purple-300">{activeRepo}</span>
                <ExternalLink className="w-3.5 h-3.5 text-purple-500 opacity-50 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          )}
        </div>

        {/* 統計カード */}
        {allDataLoading ? (
          <StatsGridSkeleton />
        ) : allDataError ? (
          <div className="mb-8">
            <ChartErrorWrapper
              isError={true}
              error={allDataErrorData}
              onRetry={() => refetchAllData()}
              errorHeight="h-24"
            />
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <StatCard
              label="Commits"
              value={stats.commits.toLocaleString()}
              icon={<GitCommit className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />}
            />
            <StatCard
              label="Pull Requests"
              value={stats.pullRequests.toLocaleString()}
              icon={<GitPullRequest className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />}
            />
            <StatCard
              label="Issues"
              value={stats.issues.toLocaleString()}
              icon={<CircleDot className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />}
            />
            <StatCard
              label="Stars"
              value={stats.stars.toLocaleString()}
              icon={<Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />}
            />
          </div>
        )}

        {/* グラフエリア */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Languages */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full"></span>
              Languages
            </h2>
            <ChartSkeletonWrapper isLoading={allDataLoading} skeleton={<PieChartSkeleton />}>
              <ChartErrorWrapper
                isError={allDataError}
                error={allDataErrorData}
                onRetry={() => refetchAllData()}
                >
                  <LanguagesPieChart data={languages} />
              </ChartErrorWrapper>
            </ChartSkeletonWrapper>
          </div>

          {/* Commits */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full"></span>
                Commits
              </h2>
              <PeriodSelector
                selectedDays={selectedDays}
                onPeriodChange={setSelectedDays}
                onPeriodHover={handlePeriodHover}
                isLoading={commitsFetching}
                isAuthenticated={!!session?.accessToken}
              />
            </div>
            <ChartSkeletonWrapper isLoading={commitsLoading} skeleton={<LineChartSkeleton />}>
              <ChartErrorWrapper
                isError={commitsError}
                error={commitsErrorData}
                onRetry={() => refetchCommits()}
              >
                <CommitsLineChart data={commits} days={selectedDays} />
              </ChartErrorWrapper>
            </ChartSkeletonWrapper>
          </div>

          {/* Contributors */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
            <ChartSkeletonWrapper isLoading={allDataLoading} skeleton={<BarChartSkeleton />}>
              <ChartErrorWrapper
                isError={allDataError}
                error={allDataErrorData}
                onRetry={() => refetchAllData()}
              >
                <ContributorChartWithToggle
                  contributors={contributors}
                  contributorDetails={contributorDetails}
                />
              </ChartErrorWrapper>
            </ChartSkeletonWrapper>
          </div>

          {/* Activity */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full"></span>
              Activity
            </h2>
            <ChartSkeletonWrapper isLoading={commitsLoading} skeleton={<HeatmapSkeleton />}>
              <ChartErrorWrapper
                isError={commitsError}
                error={commitsErrorData}
                onRetry={() => refetchCommits()}
              >
                <ActivityHeatmap data={commits} />
              </ChartErrorWrapper>
            </ChartSkeletonWrapper>
          </div>
        </div>

        {/* Your Contribution */}
        {session?.login && (
          allDataLoading ? (
            <div className="mt-8">
              <MyContributionSkeleton />
            </div>
          ) : contributorDetails.length > 0 && (
            <MyContributionSummary
              contributors={contributorDetails}
              currentUserLogin={session.login}
              owner={owner}
              repo={repo}
            />
          )
        )}

        {/* Ranking */}
        {allDataLoading ? (
          <div className="mt-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full"></span>
              Ranking
            </h2>
            <RankingSkeleton />
          </div>
        ) : contributorDetails.length > 0 && (
          <div className="mt-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full"></span>
              Ranking
            </h2>
            <ContributorRanking
              contributors={contributorDetails}
              currentUserLogin={session?.login}
              owner={owner}
              repo={repo}
            />
          </div>
        )}
      </main>
    </div>
  );
}

// 統計カードコンポーネント
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-3 sm:p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group overflow-hidden">
      {/* グラデーション装飾 */}
      <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="shrink-0 p-1.5 sm:p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50">{icon}</div>
        <div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

// あなたの貢献サマリーコンポーネント
function MyContributionSummary({
  contributors,
  currentUserLogin,
  owner,
  repo,
}: {
  contributors: ContributorDetailStat[];
  currentUserLogin: string;
  owner: string;
  repo: string;
}) {
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const myStats = contributors.find(
    (c) => c.login.toLowerCase() === currentUserLogin.toLowerCase()
  );

  if (!myStats) {
    return null;
  }

  const badges = sortBadgesByImportance(
    calculateBadges(myStats, contributors.length)
  );

  return (
    <>
      <div className="mt-8 bg-linear-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            <h2 className="text-base sm:text-lg font-semibold">Your Contribution</h2>
          </div>
          <button
            onClick={() => setIsCardModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs sm:text-sm font-medium transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">カードを生成</span>
            <span className="xs:hidden">共有</span>
          </button>
        </div>

      {/* 統計グリッド - 横スクロール可能 */}
      <div className="flex sm:grid sm:grid-cols-5 gap-3 sm:gap-4 mb-6 overflow-x-auto pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        {/* Rank */}
        <div className="bg-white/10 rounded-lg p-2.5 sm:p-3 text-center shrink-0 w-[100px] sm:w-auto">
          <p className="text-2xl sm:text-3xl font-bold">#{myStats.rank}</p>
          <p className="text-xs sm:text-sm text-white/80">of {contributors.length}</p>
        </div>

        {/* Commits */}
        <div className="bg-white/10 rounded-lg p-2.5 sm:p-3 text-center shrink-0 w-[100px] sm:w-auto">
          <div className="flex items-center justify-center gap-1 mb-1">
            <GitCommit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-bold">{myStats.commits.toLocaleString()}</p>
          <p className="text-xs sm:text-sm text-white/80">Commits</p>
        </div>

        {/* Additions */}
        <div className="bg-white/10 rounded-lg p-2.5 sm:p-3 text-center shrink-0 w-[100px] sm:w-auto">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-bold">{formatLargeNumber(myStats.additions)}</p>
          <p className="text-xs sm:text-sm text-white/80">Additions</p>
        </div>

        {/* Deletions */}
        <div className="bg-white/10 rounded-lg p-2.5 sm:p-3 text-center shrink-0 w-[100px] sm:w-auto">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-bold">{formatLargeNumber(myStats.deletions)}</p>
          <p className="text-xs sm:text-sm text-white/80">Deletions</p>
        </div>

        {/* Score */}
        <div className="bg-white/10 rounded-lg p-2.5 sm:p-3 text-center shrink-0 w-[100px] sm:w-auto">
          <p className="text-xl sm:text-2xl font-bold">{myStats.score.toLocaleString()}</p>
          <p className="text-xs sm:text-sm text-white/80">Score</p>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div>
          <p className="text-sm text-white/80 mb-2">Badges</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => {
              const IconComponent = badge.icon;
              return (
                <span
                  key={badge.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-full text-sm"
                  title={badge.description}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{badge.name}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
      </div>

      {/* 貢献度カードモーダル */}
      <ContributionCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        owner={owner}
        repo={repo}
        contributor={myStats}
      />
    </>
  );
}

// 大きな数値のフォーマット
function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}
