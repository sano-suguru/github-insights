"use client";

import { useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AlertTriangle, AlertCircle, Lightbulb, GitCommit, GitPullRequest, CircleDot, Star, Frown, ExternalLink } from "lucide-react";
import { GitHubIcon } from "@/components/icons";
import { getPublicRateLimitInfo } from "@/lib/github/client";
import { useRepoAllData } from "@/hooks/useRepoData";
import { useCommitHistory, usePrefetchCommitHistory } from "@/hooks/useCommitHistory";
import DashboardLayout, { SectionCard } from "@/components/DashboardLayout";
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
    enabled: !!owner && !!repo,
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

  const error = allDataErrorData instanceof Error ? allDataErrorData.message : allDataErrorData ? String(allDataErrorData) : null;

  // ローディング状態
  if (allDataLoading || authStatus === "loading") {
    return <DashboardLayout isLoading />;
  }

  if (allDataError || error) {
    const isRateLimitError = error?.includes("rate limit") ?? false;
    
    return (
      <DashboardLayout>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-8 text-center max-w-md mx-auto">
          {isRateLimitError ? (
            <>
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                APIレート制限に達しました
              </h1>
              {isAuthenticated ? (
                // 認証済みユーザー向けメッセージ
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  GitHub APIのレート制限に達しました。<br />
                  しばらく時間をおいてから再度お試しください。
                </p>
              ) : (
                // 未認証ユーザー向けメッセージ
                <>
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
                    className="inline-flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium px-6 py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-lg"
                  >
                    <GitHubIcon className="w-5 h-5" />
                    GitHubでログイン
                  </Link>
                </>
              )}
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
    <DashboardLayout>
      {/* リポジトリヘッダー */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6 overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-linear-to-r from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
            <GitHubIcon className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <a
              href={`https://github.com/${owner}/${repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 group max-w-full"
            >
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors break-all">
                {owner}/{repo}
              </h1>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors shrink-0" />
            </a>
            {repository?.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-1 wrap-break-word">
                {repository.description}
              </p>
            )}
          </div>
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
              className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              <GitHubIcon className="w-3.5 h-3.5" />
              GitHubでログイン
            </Link>
          </div>
        </div>
      )}

      {/* 未認証バナー（未認証の場合のみ） */}
      {!isAuthenticated && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <Lightbulb className="w-5 h-5 text-blue-500 shrink-0 mt-0.5 sm:mt-0" />
              <div className="text-sm">
                <span className="font-medium text-blue-900 dark:text-blue-100">ログインで機能アップ：</span>
                <span className="text-blue-700 dark:text-blue-300">プライベートリポジトリ・期間変更・API 5,000回/時間</span>
              </div>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm shrink-0"
            >
              <GitHubIcon className="w-4 h-4" />
              <span className="hidden sm:inline">GitHubで</span>ログイン
            </Link>
          </div>
        </div>
      )}

      {/* 統計カード */}
      {allDataLoading ? (
        <StatsGridSkeleton />
      ) : allDataError && !stats ? (
        <div className="mb-6">
          <ChartErrorWrapper
            isError={true}
            error={allDataErrorData}
            onRetry={() => refetchAllData()}
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
        <SectionCard title="Languages">
          <ChartSkeletonWrapper isLoading={allDataLoading} skeleton={<PieChartSkeleton />}>
            <ChartErrorWrapper
              isError={allDataError && languages.length === 0}
              error={allDataErrorData}
              onRetry={() => refetchAllData()}
            >
              <LanguagesPieChart data={languages} />
            </ChartErrorWrapper>
          </ChartSkeletonWrapper>
        </SectionCard>

        {/* Commits */}
        <section aria-labelledby="commits-section" className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
            <h2 id="commits-section" className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full" aria-hidden="true"></span>
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
        </section>

        {/* Contributors */}
        <section aria-labelledby="contributors-section" className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6">
          {/* 認証済みの場合はトグル付きチャート内でタイトル表示、未認証は外側で表示 */}
          {!isAuthenticated && (
            <h2 id="contributors-section" className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full" aria-hidden="true"></span>
              Contributors
            </h2>
          )}
          <ChartSkeletonWrapper
            isLoading={allDataLoading}
            skeleton={<BarChartSkeleton />}
          >
            <ChartErrorWrapper
              isError={allDataError && contributors.length === 0}
              error={allDataErrorData}
              onRetry={() => refetchAllData()}
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
        </section>

        {/* Activity */}
        <SectionCard title="Activity">
          <ChartSkeletonWrapper isLoading={commitsLoading} skeleton={<HeatmapSkeleton />}>
            <ChartErrorWrapper
              isError={commitsError}
              error={commitsErrorData}
              onRetry={() => refetchCommits()}
            >
              <ActivityHeatmap data={commits} />
            </ChartErrorWrapper>
          </ChartSkeletonWrapper>
        </SectionCard>
      </div>

      {/* Your Contribution（認証済みの場合のみ） */}
      {isAuthenticated &&
        session?.login &&
        (allDataLoading ? (
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
      {allDataLoading ? (
        <div className="mt-8">
          <SectionCard title="Ranking">
            <RankingSkeleton />
          </SectionCard>
        </div>
      ) : (
        contributorDetails.length > 0 && (
          <div className="mt-8">
            <SectionCard title="Ranking">
              <ContributorRanking
                contributors={contributorDetails}
                currentUserLogin={isAuthenticated ? session?.login : undefined}
                owner={owner}
                repo={repo}
              />
            </SectionCard>
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
