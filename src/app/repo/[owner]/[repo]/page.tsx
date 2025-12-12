"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AlertTriangle, AlertCircle, Lightbulb, GitCommit, GitPullRequest, CircleDot, Star, Frown, ExternalLink } from "lucide-react";
import { getPublicRepository, getPublicRateLimitInfo } from "@/lib/github";
import { useQuery } from "@tanstack/react-query";
import { useLanguageStats, useContributorStats, useRepositoryStats } from "@/hooks/useRepoData";
import { useCommitHistory } from "@/hooks/useCommitHistory";

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

  // 各データ取得（React Query）- 未認証なので accessToken = null
  const { data: languages = [] } = useLanguageStats({
    accessToken: null,
    owner,
    repo,
    enabled: !!repository,
  });

  const { data: commits = [] } = useCommitHistory({
    accessToken: null,
    owner,
    repo,
    days: 30, // 未認証は30日固定（レート制限考慮）
    enabled: !!repository,
  });

  const { data: contributors = [] } = useContributorStats({
    accessToken: null,
    owner,
    repo,
    enabled: !!repository,
  });

  const { data: stats } = useRepositoryStats({
    accessToken: null,
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {owner}/{repo} を読み込み中...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    const isRateLimitError = error.includes("rate limit");
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-4">
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
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  GitHubでログイン
                </Link>
                <Link
                  href="/"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                >
                  ← トップに戻る
                </Link>
              </div>
            </>
          ) : (
            <>
              <Frown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                エラー
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                ← トップに戻る
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                ← 戻る
              </Link>
              <div className="w-10 h-10 rounded-full bg-linear-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
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
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {owner}/{repo}
                  </h1>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
                </a>
                {repository?.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {repository.description}
                  </p>
                )}
              </div>
            </div>

            <Link
              href="/login"
              className="text-sm bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              ログインして詳細を見る
            </Link>
          </div>
        </div>
      </header>

      {/* レート制限警告 */}
      {isRateLimitWarning && (
        <div className={`${isRateLimitCritical ? 'bg-red-500' : 'bg-yellow-500'} text-white px-4 py-3`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
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

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 未認証バナー */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-8">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Commits" value={stats.commits.toLocaleString()} icon={<GitCommit className="w-5 h-5 text-purple-500" />} />
            <StatCard label="Pull Requests" value={stats.pullRequests.toLocaleString()} icon={<GitPullRequest className="w-5 h-5 text-blue-500" />} />
            <StatCard label="Issues" value={stats.issues.toLocaleString()} icon={<CircleDot className="w-5 h-5 text-green-500" />} />
            <StatCard label="Stars" value={stats.stars.toLocaleString()} icon={<Star className="w-5 h-5 text-yellow-500" />} />
          </div>
        )}

        {/* グラフエリア */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Languages
            </h2>
            <LanguagesPieChart data={languages} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Commits
            </h2>
            <CommitsLineChart data={commits} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Contributors
            </h2>
            <ContributorsChart data={contributors} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Activity
            </h2>
            <ActivityHeatmap data={commits} />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
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
