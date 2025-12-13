"use client";

import { Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, Lock, GitCommit, GitPullRequest, CircleDot, Star, Plus, Minus, Trophy, Crown, Medal, Award, Eye, Cpu, Eraser, Sparkles, ExternalLink, Share2, LogOut, Github } from "lucide-react";
import { ContributorDetailStat } from "@/lib/github";
import { calculateBadges, sortBadgesByImportance } from "@/lib/badges";
import { signInWithPrivateScope } from "@/lib/actions";
import dynamic from "next/dynamic";
import RepoSearchCombobox from "@/components/RepoSearchCombobox";
import ContributionCardModal from "@/components/ContributionCardModal";
import ContributorRanking from "@/components/ContributorRanking";
import { PeriodSelector } from "@/components/PeriodSelector";
import { useRepositories } from "@/hooks/useRepositories";
import { useCommitHistory, usePrefetchCommitHistory } from "@/hooks/useCommitHistory";
import { useLanguageStats, useContributorStats, useContributorDetails, useRepositoryStats } from "@/hooks/useRepoData";
import { ChartErrorWrapper } from "@/components/ErrorDisplay";

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
  const [selectedRepo, setSelectedRepo] = useState<string>(repoFromUrl || "");
  const [selectedDays, setSelectedDays] = useState<number | null>(30);

  // リポジトリ一覧取得（React Query）
  const { data: repositories = [], isLoading: reposLoading } = useRepositories(
    session?.accessToken ?? null
  );

  // 実際に使用するリポジトリ（選択されていない場合は最初のリポジトリ）
  const activeRepo = selectedRepo || (repositories.length > 0 ? repositories[0].nameWithOwner : "");

  // リポジトリ選択時にURLを更新
  const handleSelectRepo = useCallback((repo: string) => {
    setSelectedRepo(repo);
    router.push(`/dashboard?repo=${encodeURIComponent(repo)}`, { scroll: false });
  }, [router]);

  // 選択リポジトリのowner/repo
  const [owner, repo] = activeRepo ? activeRepo.split("/") : ["", ""];

  // 期間ホバー時にプリフェッチ
  const handlePeriodHover = useCallback((days: number | null) => {
    prefetchCommits(session?.accessToken ?? null, owner, repo, days);
  }, [prefetchCommits, session?.accessToken, owner, repo]);

  // 各データ取得（React Query）
  const { data: languages = [], isLoading: langLoading, isError: langError, error: langErrorData, refetch: refetchLanguages } = useLanguageStats({
    owner,
    repo,
    enabled: !!activeRepo,
  });

  const { data: commits = [], isLoading: commitsLoading, isFetching: commitsFetching, isError: commitsError, error: commitsErrorData, refetch: refetchCommits } = useCommitHistory({
    accessToken: session?.accessToken ?? null,
    owner,
    repo,
    days: selectedDays,
    enabled: !!activeRepo,
  });

  const { data: contributors = [], isError: contributorsError, error: contributorsErrorData, refetch: refetchContributors } = useContributorStats({
    owner,
    repo,
    enabled: !!activeRepo,
  });

  const { data: contributorDetails = [], isError: detailsError, error: detailsErrorData, refetch: refetchDetails } = useContributorDetails({
    owner,
    repo,
    enabled: !!activeRepo,
  });

  const { data: stats, isError: statsError, error: statsErrorData, refetch: refetchStats } = useRepositoryStats({
    owner,
    repo,
    enabled: !!activeRepo,
  });

  // 認証チェック
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const dataLoading = langLoading || commitsLoading;

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
      {/* Privateスコープへのアップグレード促進バナー */}
      {session?.scope && !session.scope.includes("repo") && (
        <div className="bg-linear-to-r from-purple-600 to-pink-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-sm flex items-center gap-2">
                <Lock className="w-4 h-4" />
                現在Publicリポジトリのみ表示しています。Privateリポジトリも分析しますか？
              </p>
              <form action={signInWithPrivateScope}>
                <button
                  type="submit"
                  className="shrink-0 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                  Privateも含めて再認証
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-sm border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-linear-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  GitHub Insights
                </h1>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              {session?.user && (
                <div className="flex items-center gap-3">
                  {/* スコープバッジ */}
                  {session.scope && (
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      session.scope.includes("repo") 
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    }`}>
                      {session.scope.includes("repo") ? <><Lock className="w-3 h-3" /> Private</> : <><Globe className="w-3 h-3" /> Public</>}
                    </span>
                  )}
                  {session.user.image && (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {session.user.name}
                  </span>
                </div>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* リポジトリ選択エリア */}
        <div className="relative z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8">
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
                  dataLoading ? "animate-pulse shadow-lg shadow-purple-500/30" : ""
                }`}
              >
                <Github className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-purple-700 dark:text-purple-300">{activeRepo}</span>
                <ExternalLink className="w-3.5 h-3.5 text-purple-500 opacity-50 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          )}
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            {/* 統計カード */}
            {statsError ? (
              <div className="mb-8">
                <ChartErrorWrapper
                  isError={true}
                  error={statsErrorData}
                  onRetry={() => refetchStats()}
                  errorHeight="h-24"
                />
              </div>
            ) : stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                  label="Commits"
                  value={stats.commits.toLocaleString()}
                  icon={<GitCommit className="w-5 h-5 text-purple-500" />}
                />
                <StatCard
                  label="Pull Requests"
                  value={stats.pullRequests.toLocaleString()}
                  icon={<GitPullRequest className="w-5 h-5 text-blue-500" />}
                />
                <StatCard
                  label="Issues"
                  value={stats.issues.toLocaleString()}
                  icon={<CircleDot className="w-5 h-5 text-green-500" />}
                />
                <StatCard
                  label="Stars"
                  value={stats.stars.toLocaleString()}
                  icon={<Star className="w-5 h-5 text-yellow-500" />}
                />
              </div>
            )}

            {/* グラフエリア */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Languages */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl transition-shadow duration-300">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full"></span>
                  Languages
                </h2>
                <ChartErrorWrapper
                  isError={langError}
                  error={langErrorData}
                  onRetry={() => refetchLanguages()}
                >
                  <LanguagesPieChart data={languages} />
                </ChartErrorWrapper>
              </div>

              {/* Commits */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
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
                <ChartErrorWrapper
                  isError={commitsError}
                  error={commitsErrorData}
                  onRetry={() => refetchCommits()}
                >
                  <CommitsLineChart data={commits} days={selectedDays} />
                </ChartErrorWrapper>
              </div>

              {/* コントリビューター（棒グラフ/円グラフ切り替え） */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl transition-shadow duration-300">
                <ChartErrorWrapper
                  isError={contributorsError || detailsError}
                  error={contributorsErrorData || detailsErrorData}
                  onRetry={() => {
                    refetchContributors();
                    refetchDetails();
                  }}
                >
                  <ContributorChartWithToggle
                    contributors={contributors}
                    contributorDetails={contributorDetails}
                  />
                </ChartErrorWrapper>
              </div>

              {/* Activity */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl transition-shadow duration-300">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full"></span>
                  Activity
                </h2>
                <ChartErrorWrapper
                  isError={commitsError}
                  error={commitsErrorData}
                  onRetry={() => refetchCommits()}
                >
                  <ActivityHeatmap data={commits} />
                </ChartErrorWrapper>
              </div>
            </div>

            {/* Your Contribution */}
            {session?.login && contributorDetails.length > 0 && (
              <MyContributionSummary
                contributors={contributorDetails}
                currentUserLogin={session.login}
                owner={owner}
                repo={repo}
              />
            )}

            {/* Ranking */}
            {contributorDetails.length > 0 && (
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
          </>
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
    <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group overflow-hidden">
      {/* グラデーション装飾 */}
      <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="flex items-center gap-3">
        <div className="shrink-0 p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50">{icon}</div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

// アイコン名からコンポーネントを取得するマップ
const badgeIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Crown,
  Trophy,
  Medal,
  Award,
  Star,
  GitPullRequest,
  Eye,
  Cpu,
  Eraser,
  Sparkles,
};

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
      <div className="mt-8 bg-linear-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            <h2 className="text-lg font-semibold">Your Contribution</h2>
          </div>
          <button
            onClick={() => setIsCardModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            <Share2 className="w-4 h-4" />
            カードを生成
          </button>
        </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {/* Rank */}
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <p className="text-3xl font-bold">#{myStats.rank}</p>
          <p className="text-sm text-white/80">of {contributors.length}</p>
        </div>

        {/* Commits */}
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <GitCommit className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold">{myStats.commits.toLocaleString()}</p>
          <p className="text-sm text-white/80">Commits</p>
        </div>

        {/* Additions */}
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Plus className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold">{formatLargeNumber(myStats.additions)}</p>
          <p className="text-sm text-white/80">Additions</p>
        </div>

        {/* Deletions */}
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Minus className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold">{formatLargeNumber(myStats.deletions)}</p>
          <p className="text-sm text-white/80">Deletions</p>
        </div>

        {/* Score */}
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{myStats.score.toLocaleString()}</p>
          <p className="text-sm text-white/80">Score</p>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div>
          <p className="text-sm text-white/80 mb-2">Badges</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => {
              const IconComponent = badgeIconMap[badge.iconName];
              return (
                <span
                  key={badge.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-full text-sm"
                  title={badge.description}
                >
                  {IconComponent && <IconComponent className="w-4 h-4" />}
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
