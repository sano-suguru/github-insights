"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  GitPullRequest,
  CircleDot,
  Trophy,
  Code2,
  ArrowLeft,
  Share2,
  Download,
  AlertCircle,
  Medal,
  Flame,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  Award,
} from "lucide-react";
import { getRankColors } from "@/lib/insight-score";
import type { InsightRank } from "@/lib/insight-score";
import type { ActivityTimeType } from "@/lib/github";
import type { WrappedBadgeRarity } from "@/lib/badges";
import { getWrappedBadgeColors, WRAPPED_BADGES } from "@/lib/badges";
import DashboardLayout from "@/components/DashboardLayout";

// バッジデータ型
interface WrappedBadgeData {
  id: string;
  name: string;
  description: string;
  rarity: WrappedBadgeRarity;
}

interface WrappedData {
  year: number;
  username: string;
  name: string;
  avatarUrl: string;
  yearlyStats: {
    year: number;
    prs: number;
    issues: number;
    totalContributions?: number;
    longestStreak?: number;
    currentStreak?: number;
  };
  // 前年比成長率（%）
  growth: {
    contributions: number | null;
    prs: number | null;
    issues: number | null;
  } | null;
  // アクティビティ時間分析
  activityTime: {
    type: ActivityTimeType;
    label: string;
    peakHour: number;
  };
  // バッジ
  badges: WrappedBadgeData[];
  topLanguages: {
    name: string;
    color: string;
    percentage: number;
  }[];
  insightScore: {
    score: number;
    rank: InsightRank;
  };
  memberSince: number;
}

async function fetchWrappedData(username: string, year: number): Promise<WrappedData> {
  const response = await fetch(`/api/github/user/${encodeURIComponent(username)}/wrapped/${year}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("USER_NOT_FOUND");
    }
    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    throw new Error("FETCH_ERROR");
  }

  return response.json();
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

// 成長率バッジコンポーネント
function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? "text-green-400" : "text-red-400";
  
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${colorClass}`}>
      <Icon className="w-3 h-3" />
      {isPositive ? "+" : ""}{value}%
    </span>
  );
}

// アクティビティタイプに対応するアイコンを返す
function getActivityIcon(type: ActivityTimeType) {
  switch (type) {
    case "night-owl":
      return Moon;
    case "early-bird":
      return Sunrise;
    case "business-hours":
      return Sun;
    case "evening-coder":
      return Sunset;
    default:
      return Clock;
  }
}

// 時間をフォーマット（0-23 -> "14:00 UTC"）
function formatPeakHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00 UTC`;
}

export default function WrappedPage() {
  const params = useParams();
  const username = params.username as string;
  const year = parseInt(params.year as string, 10);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["wrapped", username, year],
    queryFn: () => fetchWrappedData(username, year),
    staleTime: 1000 * 60 * 60, // 1時間
    retry: false,
  });

  const rankColors = useMemo(() => {
    if (!data) return null;
    return getRankColors(data.insightScore.rank);
  }, [data]);

  // OGカードURL
  const ogCardUrl = `/api/og/card/user/${username}/wrapped/${year}`;

  // エラー状態
  if (error || (!isLoading && !data)) {
    const errorMessage = error instanceof Error ? error.message : "UNKNOWN";
    
    return (
      <DashboardLayout>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          {errorMessage === "USER_NOT_FOUND" ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                User Not Found
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                The user &quot;{username}&quot; does not exist.
              </p>
            </>
          ) : errorMessage === "RATE_LIMIT" ? (
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
                Failed to fetch wrapped data.
              </p>
            </>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ローディング状態
  if (isLoading || !data || !rankColors) {
    return <DashboardLayout isLoading />;
  }

  return (
    <DashboardLayout>
      {/* 戻るリンク */}
      <div className="mb-6">
        <Link
          href={`/user/${username}`}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </Link>
      </div>

      {/* メインカード */}
      <div className="bg-linear-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* ヘッダー */}
        <div className="px-8 pt-8 pb-4 text-center">
          <p className="text-purple-300 text-sm font-medium mb-2">
            GitHub Wrapped
          </p>
          <h1 className="text-5xl font-black text-white mb-2">
            {year}
          </h1>
          <p className="text-purple-200">
            @{data.username}
          </p>
        </div>

        {/* 統計グリッド */}
        <div className="grid grid-cols-2 gap-4 p-8">
          {/* Total Contributions */}
          {data.yearlyStats.totalContributions !== undefined && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center col-span-2">
              <Activity className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-5xl font-bold text-white mb-1">
                {formatNumber(data.yearlyStats.totalContributions)}
              </p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-purple-200 text-sm">Total Contributions</p>
                {data.growth?.contributions !== null && (
                  <GrowthBadge value={data.growth?.contributions ?? null} />
                )}
              </div>
            </div>
          )}

          {/* Longest Streak */}
          {data.yearlyStats.longestStreak !== undefined && data.yearlyStats.longestStreak > 0 && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
              <Flame className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-4xl font-bold text-white mb-1">
                {data.yearlyStats.longestStreak}
              </p>
              <p className="text-purple-200 text-sm">
                Day Streak
              </p>
            </div>
          )}

          {/* PRs */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
            <GitPullRequest className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-4xl font-bold text-white mb-1">
              {formatNumber(data.yearlyStats.prs)}
            </p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-purple-200 text-sm">Pull Requests</p>
              {data.growth?.prs !== null && (
                <GrowthBadge value={data.growth?.prs ?? null} />
              )}
            </div>
          </div>

          {/* Issues */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
            <CircleDot className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <p className="text-4xl font-bold text-white mb-1">
              {formatNumber(data.yearlyStats.issues)}
            </p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-purple-200 text-sm">Issues</p>
              {data.growth?.issues !== null && (
                <GrowthBadge value={data.growth?.issues ?? null} />
              )}
            </div>
          </div>

          {/* Languages */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 col-span-2">
            <Code2 className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <p className="text-purple-200 text-sm mb-3">Top Languages</p>
            <div className="flex justify-center gap-4 flex-wrap">
              {data.topLanguages.map((lang, index) => (
                <div key={lang.name} className="flex items-center gap-2">
                  <Medal
                    className="w-5 h-5"
                    style={{
                      color:
                        index === 0
                          ? "#fbbf24"
                          : index === 1
                            ? "#9ca3af"
                            : "#cd7f32",
                    }}
                  />
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: lang.color }}
                  />
                  <span className="text-white font-medium">{lang.name}</span>
                  <span className="text-purple-300 text-sm">
                    {lang.percentage.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Time */}
          {data.activityTime && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center col-span-2">
              {(() => {
                const ActivityIcon = getActivityIcon(data.activityTime.type);
                return <ActivityIcon className="w-8 h-8 text-yellow-400 mx-auto mb-2" />;
              })()}
              <p className="text-2xl font-bold text-white mb-1">
                {data.activityTime.label}
              </p>
              <p className="text-purple-200 text-sm">
                Peak activity at {formatPeakHour(data.activityTime.peakHour)}
              </p>
            </div>
          )}

          {/* Badges */}
          {data.badges && data.badges.length > 0 && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 col-span-2">
              <Award className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <p className="text-purple-200 text-sm mb-4 text-center">Achievements</p>
              <div className="flex flex-wrap justify-center gap-2">
                {data.badges.slice(0, 6).map((badge) => {
                  const colors = getWrappedBadgeColors(badge.rarity);
                  const BadgeIcon = WRAPPED_BADGES[badge.id]?.icon || Award;
                  return (
                    <div
                      key={badge.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{
                        backgroundColor: colors.bg,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <BadgeIcon className="w-4 h-4" style={{ color: colors.text }} />
                      <span className="text-sm font-medium" style={{ color: colors.text }}>
                        {badge.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Insight Score */}
        <div className="px-8 pb-8">
          <div
            className="rounded-xl p-6 text-center"
            style={{ backgroundColor: rankColors.bg }}
          >
            <Trophy className="w-10 h-10 mx-auto mb-2" style={{ color: rankColors.text }} />
            <p className="text-sm mb-1" style={{ color: rankColors.text, opacity: 0.8 }}>
              Insight Score
            </p>
            <p className="text-4xl font-bold mb-1" style={{ color: rankColors.text }}>
              {formatNumber(data.insightScore.score)}
            </p>
            <p className="text-lg font-semibold" style={{ color: rankColors.text }}>
              {data.insightScore.rank} Rank
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="bg-black/20 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-300 text-sm">
            <Calendar className="w-4 h-4" />
            Member since {data.memberSince}
          </div>
          <p className="text-purple-400 text-xs">
            github-insights.vercel.app
          </p>
        </div>
      </div>

      {/* シェアボタン */}
      <div className="mt-6 flex justify-center gap-4">
        <button
          onClick={async () => {
            try {
              const response = await fetch(ogCardUrl);
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${username}-wrapped-${year}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } catch (err) {
              console.error("Download failed:", err);
            }
          }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium"
        >
          <Download className="w-5 h-5" />
          Download Card
        </button>
        <button
          onClick={async () => {
            const url = `${window.location.origin}/user/${username}/wrapped/${year}`;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-medium"
        >
          <Share2 className="w-5 h-5" />
          {copied ? "Copied!" : "Share"}
        </button>
      </div>
    </DashboardLayout>
  );
}
