"use client";

import { useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AlertTriangle, AlertCircle, Lightbulb, GitCommit, GitPullRequest, CircleDot, Star, Frown, ExternalLink, Github } from "lucide-react";
import { getPublicRepository, getPublicRateLimitInfo } from "@/lib/github";
import { useQuery } from "@tanstack/react-query";
import { useLanguageStats, useContributorStats, useContributorDetails, useRepositoryStats } from "@/hooks/useRepoData";
import { useCommitHistory, usePrefetchCommitHistory } from "@/hooks/useCommitHistory";
import DashboardLayout from "@/components/DashboardLayout";
import { PeriodSelector } from "@/components/PeriodSelector";
import ContributorRanking from "@/components/ContributorRanking";
import { ChartErrorWrapper } from "@/components/ErrorDisplay";
import {
  PieChartSkeleton,
  LineChartSkeleton,
  HeatmapSkeleton,
  BarChartSkeleton,
  RankingSkeleton,
  MyContributionSkeleton,
  ChartSkeletonWrapper,
  StatsGridSkeleton,
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
const ContributorsChart = dynamic(
  () => import("@/components/charts/ContributorsChart"),
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
function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">読み込み中...</p>
      </div>
    </div>
  );
}

// 自分の貢献サマリーコンポーネント
function MyContributionSummary({
  contributors,
  currentUserLogin,
}: {
  contributors: { login: string; rank: number; commits: number; additions: number; deletions: number; pullRequests: number }[];
  currentUserLogin: string;
}) {
  const currentUser = contributors.find(
    (c) => c.login.toLowerCase() === currentUserLogin.toLowerCase()
  );

  if (!currentUser) return null;

  return (
    <div className="mt-8 bg-linear-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-purple-900/30 rounded-xl p-6 border border-purple-200/50 dark:border-purple-700/50">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full"></span>
        Your Contribution
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            #{currentUser.rank}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Rank</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentUser.commits.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Commits</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            +{currentUser.additions.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Additions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            -{currentUser.deletions.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Deletions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {currentUser.pullRequests.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">PRs</p>
        </div>
      </div>
    </div>
  );
}

// メインのリポジトリページ（Suspenseでラップ）
export default function RepoPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RepoPageContent />
    </Suspense>
  );
}

// 実際のリポジトリページコンテンツ
function RepoPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const owner = params.owner as string;
  const repo = params.repo as string;

  // 認証状態を取得
  const { data: session, status: authStatus } = useSession();
  const isAuthenticated = authStatus === "authenticated" && !!session?.accessToken;
  const accessToken = session?.accessToken ?? null;

  // 期間選択（認証済みの場合のみ有効）
  const initialDays = searchParams.get("days");
  const [selectedDays, setSelectedDays] = useState<number | null>(
    initialDays ? (initialDays === "null" ? null : parseInt(initialDays, 10)) : 30
  );
  const prefetchCommits = usePrefetchCommitHistory();

  // リポジトリ情報取得
  const {
    data: repository,
    isLoading: repoLoading,
    error: repoError,
  } = useQuery({
    queryKey: ["publicRepository", owner, repo],
    queryFn: () => getPublicRepository(owner, repo),
    enabled: !!owner && !!repo,
    retry: 1,
  });

  // 各データ取得（React Query）
  const {
    data: languages = [],
    isLoading: langLoading,
    isError: langError,
    error: langErrorData,
    refetch: refetchLanguages,
  } = useLanguageStats({
    owner,
    repo,
    enabled: !!repository,
  });

  const {
    data: commits = [],
    isLoading: commitsLoading,
    isFetching: commitsFetching,
    isError: commitsError,
    error: commitsErrorData,
    refetch: refetchCommits,
  } = useCommitHistory({
    accessToken,
    owner,
    repo,
    days: isAuthenticated ? selectedDays : 30, // 未認証は30日固定
    enabled: !!repository,
  });

  const {
    data: contributors = [],
    isLoading: contributorsLoading,
    isError: contributorsError,
    error: contributorsErrorData,
    refetch: refetchContributors,
  } = useContributorStats({
    owner,
    repo,
    enabled: !!repository,
  });

  const {
    data: contributorDetails = [],
    isLoading: detailsLoading,
    isError: detailsError,
    error: detailsErrorData,
    refetch: refetchDetails,
  } = useContributorDetails({
    owner,
    repo,
    enabled: !!repository,
  });

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErrorData,
    refetch: refetchStats,
  } = useRepositoryStats({
    owner,
    repo,
    enabled: !!repository,
  });

  // 期間ホバー時にプリフェッチ（認証済みの場合のみ）
  const handlePeriodHover = useCallback(
    (days: number | null) => {
      if (isAuthenticated) {
        prefetchCommits(accessToken, owner, repo, days);
      }
    },
    [prefetchCommits, accessToken, owner, repo, isAuthenticated]
  );

  // レート制限情報（未認証の場合のみ表示）
  const rateLimit = !isAuthenticated ? getPublicRateLimitInfo() : null;
  const isRateLimitWarning = rateLimit && rateLimit.remaining < 20;
  const isRateLimitCritical = rateLimit && rateLimit.remaining < 5;

  const error = repoError instanceof Error ? repoError.message : repoError ? String(repoError) : null;

  // ローディング状態
  if (repoLoading || authStatus === "loading") {
    return <DashboardLayout isLoading />;
  }

  if (error) {
    const isRateLimitError = error.includes("rate limit");
    
    return (
      <DashboardLayout>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-8 text-center max-w-md mx-auto">
          {isRateLimitError ? (
            <>
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                APIレート制限に達しました
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                未認証のリクエストは1時間あたり60回までです。
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>ログインすると5,000回/時間</strong>に大幅アップ！<br />
                  プライベートリポジトリも分析できます。
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                GitHubでログイン
              </Link>
            </>
          ) : (
            <>
              <Frown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                エラー
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            </>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout hideSearchBar={true}>
      {/* リポジトリヘッダー */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-linear-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Github className="w-6 h-6 text-white" />
            </div>
            <div>
              <a
                href={`https://github.com/${owner}/${repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 group"
              >
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {owner}/{repo}
                </h1>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </a>
              {repository?.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {repository.description}
                </p>
              )}
            </div>
          </div>
          {/* 認証状態バッジ */}
          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-green-700 dark:text-green-300">認証済み</span>
            </div>
          )}
        </div>
      </div>

      {/* レート制限警告（未認証の場合のみ） */}
      {!isAuthenticated && isRateLimitWarning && (
        <div className={`${isRateLimitCritical ? 'bg-red-500' : 'bg-yellow-500'} text-white px-4 py-3 rounded-lg mb-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRateLimitCritical 
                ? <AlertCircle className="w-5 h-5" />
                : <AlertTriangle className="w-5 h-5" />
              }
              <span>
                {isRateLimitCritical 
                  ? `APIレート制限に達しそうです（残り${rateLimit?.remaining}回）`
                  : `APIリクエスト残り ${rateLimit?.remaining}/${rateLimit?.limit} 回`
                }
                {rateLimit?.resetAt && (
                  <span className="ml-2 opacity-75">
                    （リセット: {rateLimit.resetAt.toLocaleTimeString("ja-JP")}）
                  </span>
                )}
              </span>
            </div>
            <Link
              href="/login"
              className="text-sm underline hover:no-underline"
            >
              ログインして制限を解除
            </Link>
          </div>
        </div>
      )}

      {/* 未認証バナー（未認証の場合のみ） */}
      {!isAuthenticated && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                ログインするとさらに便利に
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                ログインすると、期間の変更、詳細なランキング表示、プライベートリポジトリへのアクセス、
                APIレート制限の大幅な緩和（60回/時間 → 5,000回/時間）が利用できます。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 統計カード */}
      {statsLoading ? (
        <StatsGridSkeleton />
      ) : statsError ? (
        <div className="mb-6">
          <ChartErrorWrapper
            isError={true}
            error={statsErrorData}
            onRetry={() => refetchStats()}
            errorHeight="h-24"
          />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <RepoStatCard label="Commits" value={stats.commits.toLocaleString()} icon={<GitCommit className="w-5 h-5 text-purple-500" />} />
          <RepoStatCard label="Pull Requests" value={stats.pullRequests.toLocaleString()} icon={<GitPullRequest className="w-5 h-5 text-blue-500" />} />
          <RepoStatCard label="Issues" value={stats.issues.toLocaleString()} icon={<CircleDot className="w-5 h-5 text-green-500" />} />
          <RepoStatCard label="Stars" value={stats.stars.toLocaleString()} icon={<Star className="w-5 h-5 text-yellow-500" />} />
        </div>
      ) : null}

      {/* グラフエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Languages */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full"></span>
            Languages
          </h2>
          <ChartSkeletonWrapper isLoading={langLoading} skeleton={<PieChartSkeleton />}>
            <ChartErrorWrapper
              isError={langError}
              error={langErrorData}
              onRetry={() => refetchLanguages()}
            >
              <LanguagesPieChart data={languages} />
            </ChartErrorWrapper>
          </ChartSkeletonWrapper>
        </div>

        {/* Commits */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full"></span>
              Commits
            </h2>
            {/* 認証済みの場合のみ期間選択を表示 */}
            {isAuthenticated && (
              <PeriodSelector
                selectedDays={selectedDays}
                onPeriodChange={setSelectedDays}
                onPeriodHover={handlePeriodHover}
                isLoading={commitsFetching}
                isAuthenticated={true}
              />
            )}
          </div>
          <ChartSkeletonWrapper isLoading={commitsLoading} skeleton={<LineChartSkeleton />}>
            <ChartErrorWrapper
              isError={commitsError}
              error={commitsErrorData}
              onRetry={() => refetchCommits()}
            >
              <CommitsLineChart data={commits} days={isAuthenticated ? selectedDays : 30} />
            </ChartErrorWrapper>
          </ChartSkeletonWrapper>
        </div>

        {/* Contributors */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full"></span>
            Contributors
          </h2>
          <ChartSkeletonWrapper
            isLoading={contributorsLoading || detailsLoading}
            skeleton={<BarChartSkeleton />}
          >
            <ChartErrorWrapper
              isError={contributorsError || detailsError}
              error={contributorsErrorData || detailsErrorData}
              onRetry={() => {
                refetchContributors();
                refetchDetails();
              }}
            >
              {/* 認証済みの場合はトグル付きチャート、未認証は基本チャート */}
              {isAuthenticated ? (
                <ContributorChartWithToggle
                  contributors={contributors}
                  contributorDetails={contributorDetails}
                />
              ) : (
                <ContributorsChart data={contributors} />
              )}
            </ChartErrorWrapper>
          </ChartSkeletonWrapper>
        </div>

        {/* Activity */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6">
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

      {/* Your Contribution（認証済みの場合のみ） */}
      {isAuthenticated &&
        session?.login &&
        (detailsLoading ? (
          <div className="mt-8">
            <MyContributionSkeleton />
          </div>
        ) : (
          contributorDetails.length > 0 && (
            <MyContributionSummary
              contributors={contributorDetails}
              currentUserLogin={session.login}
            />
          )
        ))}

      {/* Ranking */}
      {detailsLoading ? (
        <div className="mt-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full"></span>
            Ranking
          </h2>
          <RankingSkeleton />
        </div>
      ) : (
        contributorDetails.length > 0 && (
          <div className="mt-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full"></span>
              Ranking
            </h2>
            <ContributorRanking
              contributors={contributorDetails}
              currentUserLogin={isAuthenticated ? session?.login : undefined}
              owner={owner}
              repo={repo}
            />
          </div>
        )
      )}
    </DashboardLayout>
  );
}

function RepoStatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4">
      <div className="flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
