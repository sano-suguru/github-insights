"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AlertTriangle, AlertCircle, Lightbulb, GitCommit, GitPullRequest, CircleDot, Star, Frown, ExternalLink } from "lucide-react";
import { getPublicRepository, getPublicRateLimitInfo } from "@/lib/github";
import { useQuery } from "@tanstack/react-query";
import { useLanguageStats, useContributorStats, useRepositoryStats } from "@/hooks/useRepoData";
import { useCommitHistory } from "@/hooks/useCommitHistory";
import DashboardLayout, { SectionCard } from "@/components/DashboardLayout";
import {
  PieChartSkeleton,
  LineChartSkeleton,
  HeatmapSkeleton,
  BarChartSkeleton,
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
const ContributorsChart = dynamic(
  () => import("@/components/charts/ContributorsChart"),
  { ssr: false }
);
const ActivityHeatmap = dynamic(
  () => import("@/components/charts/ActivityHeatmap"),
  { ssr: false }
);

export default function PublicRepoPage() {
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;

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
  const { data: languages = [], isLoading: langLoading } = useLanguageStats({
    owner,
    repo,
    enabled: !!repository,
  });

  const { data: commits = [], isLoading: commitsLoading } = useCommitHistory({
    accessToken: null,
    owner,
    repo,
    days: 30, // 未認証は30日固定（レート制限考慮）
    enabled: !!repository,
  });

  const { data: contributors = [], isLoading: contributorsLoading } = useContributorStats({
    owner,
    repo,
    enabled: !!repository,
  });

  const { data: stats } = useRepositoryStats({
    owner,
    repo,
    enabled: !!repository,
  });

  // レート制限情報
  const rateLimit = getPublicRateLimitInfo();

  // レート制限警告の判定
  const isRateLimitWarning = rateLimit && rateLimit.remaining < 20;
  const isRateLimitCritical = rateLimit && rateLimit.remaining < 5;

  const error = repoError instanceof Error ? repoError.message : repoError ? String(repoError) : null;

  if (repoLoading) {
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
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
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
        </div>
      </div>

      {/* レート制限警告 */}
      {isRateLimitWarning && (
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

      {/* 未認証バナー */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">
              ログインするとさらに便利に
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              ログインすると、自分のリポジトリの分析、プライベートリポジトリへのアクセス、
              APIレート制限の大幅な緩和（60回/時間 → 5,000回/時間）が利用できます。
            </p>
          </div>
        </div>
      </div>

      {/* 統計カード */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <RepoStatCard label="Commits" value={stats.commits.toLocaleString()} icon={<GitCommit className="w-5 h-5 text-purple-500" />} />
          <RepoStatCard label="Pull Requests" value={stats.pullRequests.toLocaleString()} icon={<GitPullRequest className="w-5 h-5 text-blue-500" />} />
          <RepoStatCard label="Issues" value={stats.issues.toLocaleString()} icon={<CircleDot className="w-5 h-5 text-green-500" />} />
          <RepoStatCard label="Stars" value={stats.stars.toLocaleString()} icon={<Star className="w-5 h-5 text-yellow-500" />} />
        </div>
      )}

      {/* グラフエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Languages">
          <ChartSkeletonWrapper isLoading={langLoading} skeleton={<PieChartSkeleton />}>
            <LanguagesPieChart data={languages} />
          </ChartSkeletonWrapper>
        </SectionCard>

        <SectionCard title="Commits">
          <ChartSkeletonWrapper isLoading={commitsLoading} skeleton={<LineChartSkeleton />}>
            <CommitsLineChart data={commits} />
          </ChartSkeletonWrapper>
        </SectionCard>

        <SectionCard title="Contributors">
          <ChartSkeletonWrapper isLoading={contributorsLoading} skeleton={<BarChartSkeleton />}>
            <ContributorsChart data={contributors} />
          </ChartSkeletonWrapper>
        </SectionCard>

        <SectionCard title="Activity">
          <ChartSkeletonWrapper isLoading={commitsLoading} skeleton={<HeatmapSkeleton />}>
            <ActivityHeatmap data={commits} />
          </ChartSkeletonWrapper>
        </SectionCard>
      </div>
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
