"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Star, AlertCircle } from "lucide-react";
import type {
  UserProfile,
  UserStats,
  UserEvent,
  UserContributionStats,
  ActivityTimeAnalysis,
} from "@/lib/github/types";
import { calculateUserBadges } from "@/lib/badges";
import { calculateAccountYears } from "@/lib/insight-score";
import { fetchApi } from "@/lib/api-utils";
import { safeDecodePathSegment } from "@/lib/path-utils";
import DashboardLayout, { SectionCard } from "@/components/DashboardLayout";
import { InsightScoreCard } from "@/components/InsightScoreCard";
import { StreakCard } from "@/components/StreakCard";
import { ActivityTimeCard } from "@/components/ActivityTimeCard";
import { UserProfileHeader } from "@/components/user/UserProfileHeader";
import { UserCardModal } from "@/components/UserCardModal";

// チャートコンポーネント（SSR無効化）
const LanguagesPieChart = dynamic(
  () => import("@/components/charts/LanguagesPieChart"),
  { ssr: false }
);

const UserActivityHeatmap = dynamic(
  () => import("@/components/charts/UserActivityHeatmap"),
  { ssr: false }
);

const ContributionTypePie = dynamic(
  () => import("@/components/charts/ContributionTypePie"),
  { ssr: false }
);

// ユーザーデータを取得する関数
async function fetchUserData(username: string): Promise<{
  profile: UserProfile;
  stats: UserStats;
  events: UserEvent[];
  contributionStats: UserContributionStats;
  activityTime: ActivityTimeAnalysis | null;
}> {
  return fetchApi(`/api/github/user/${encodeURIComponent(username)}`, {
    notFoundError: "USER_NOT_FOUND",
  });
}

export default function UserProfilePage() {
  const params = useParams();
  const username = safeDecodePathSegment(params.username as string);
  const [showCardModal, setShowCardModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["userProfile", username],
    queryFn: () => fetchUserData(username),
    staleTime: 1000 * 60 * 30, // 30分
    retry: false,
  });

  // バッジ計算（メモ化）
  const userBadges = useMemo(() => {
    if (!data) return [];
    const { profile, stats } = data;
    return calculateUserBadges({
      followers: profile.followers,
      publicRepos: stats.totalRepos,
      createdAt: profile.createdAt,
    });
  }, [data]);

  // Contribution Types セクションのスクリーンリーダー向けサマリー
  const userEvents = data?.events;
  const contributionTypeSummary = useMemo(() => {
    if (!userEvents || userEvents.length === 0) return "";

    const typeCount: Record<string, number> = {};
    userEvents.forEach((e) => {
      typeCount[e.type] = (typeCount[e.type] || 0) + 1;
    });
    const total = userEvents.length;
    return Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => `${type}: ${Math.round((count / total) * 100)}%`)
      .join(", ");
  }, [userEvents]);

  // エラー状態
  if (error || (!isLoading && !data)) {
    const errorMessage = error instanceof Error ? error.message : "UNKNOWN";

    return (
      <DashboardLayout>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          {errorMessage === "USER_NOT_FOUND" ||
          /user not found/i.test(errorMessage) ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                User Not Found
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                The user &quot;{username}&quot; does not exist or is not
                accessible.
              </p>
            </>
          ) : errorMessage === "RATE_LIMIT" ||
            /rate limit/i.test(errorMessage) ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Rate Limit Exceeded
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait a moment and try again.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Error Occurred
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Failed to fetch user information.
              </p>
            </>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ローディング状態
  if (isLoading || !data) {
    return <DashboardLayout isLoading />;
  }

  const { profile, stats, events, contributionStats, activityTime } = data;
  const joinedDate = new Date(profile.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });

  // Insight Score 用の入力データ
  const insightScoreInput = {
    followers: profile.followers,
    totalStars: stats.totalStars,
    totalForks: stats.totalForks,
    publicRepos: stats.totalRepos,
    totalPRs: contributionStats.totalPRs,
    totalIssues: contributionStats.totalIssues,
    accountYears: calculateAccountYears(profile.createdAt),
  };

  return (
    <DashboardLayout>
      {/* プロファイルヘッダー */}
      <UserProfileHeader
        profile={profile}
        joinedDate={joinedDate}
        userBadges={userBadges}
        onOpenCardModal={() => setShowCardModal(true)}
      />

      {/* Insight Score */}
      <div className="mb-6">
        <InsightScoreCard input={insightScoreInput} />
      </div>

      {/* Streak - 認証済みのみ表示 */}
      {contributionStats.currentStreak !== undefined &&
        contributionStats.longestStreak !== undefined && (
          <div className="mb-6">
            <StreakCard
              currentStreak={contributionStats.currentStreak}
              longestStreak={contributionStats.longestStreak}
            />
          </div>
        )}

      {/* Activity Time - イベントがある場合のみ表示 */}
      {activityTime && (
        <div className="mb-6">
          <ActivityTimeCard activityTime={activityTime} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Languages */}
        {stats.languageBreakdown.length > 0 && (
          <SectionCard title="Languages">
            {/* スクリーンリーダー向けテキストサマリー */}
            <p className="sr-only">
              {stats.languageBreakdown
                .slice(0, 8)
                .map((lang) => `${lang.name}: ${lang.percentage}%`)
                .join(", ")}
            </p>
            <div className="h-72 sm:h-64" aria-hidden="true">
              <LanguagesPieChart
                data={stats.languageBreakdown.slice(0, 8).map((lang) => ({
                  name: lang.name,
                  color: lang.color || "#6b7280",
                  size: lang.count,
                  percentage: lang.percentage,
                }))}
              />
            </div>
          </SectionCard>
        )}

        {/* Top Repositories */}
        {stats.topRepositories.length > 0 && (
          <SectionCard title="Top Repositories">
            <ul className="space-y-2 sm:space-y-3">
              {stats.topRepositories.slice(0, 3).map((repo) => (
                <li key={repo.nameWithOwner}>
                  <Link
                    href={`/repo/${repo.nameWithOwner}`}
                    className="block p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                  >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">
                        {repo.name}
                      </p>
                      {repo.description && (
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                          {repo.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 sm:ml-4 shrink-0">
                      {repo.primaryLanguage && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: repo.primaryLanguage.color,
                            }}
                          />
                          {repo.primaryLanguage.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                        <Star className="w-3 h-3" />
                        {repo.stargazerCount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {/* Activity Heatmap */}
        {events.length > 0 && (
          <SectionCard title="Activity Heatmap">
            <UserActivityHeatmap events={events} />
          </SectionCard>
        )}

        {/* Contribution Type Distribution */}
        {events.length > 0 && (
          <SectionCard title="Contributions">
            <p className="sr-only">{contributionTypeSummary}</p>
            <div aria-hidden="true">
              <ContributionTypePie events={events} />
            </div>
          </SectionCard>
        )}
      </div>

      {/* OGカード生成モーダル */}
      <UserCardModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        username={profile.login}
        name={profile.name || profile.login}
      />
    </DashboardLayout>
  );
}
