"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toPng } from "html-to-image";
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
import type { ActivityTimeType } from "@/lib/github/types";
import { WRAPPED_BADGES } from "@/lib/badges";
import DashboardLayout from "@/components/DashboardLayout";

// バッジデータ型
interface WrappedBadgeData {
  id: string;
  name: string;
  description: string;
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
  const bgClass = isPositive 
    ? "bg-green-500/20 text-green-300 border-green-500/30" 
    : "bg-red-500/20 text-red-300 border-red-500/30";
  
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${bgClass}`}>
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
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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
      <div 
        ref={cardRef}
        className="relative bg-linear-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* 装飾的な背景エフェクト */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-linear-to-t from-black/20 to-transparent" />
        </div>

        {/* ヘッダー */}
        <div className="relative px-8 pt-10 pb-6 text-center">
          <p className="text-purple-300 text-sm font-semibold tracking-widest uppercase mb-3">
            GitHub Wrapped
          </p>
          <h1 className="text-7xl font-black text-white mb-3 drop-shadow-lg">
            {year}
          </h1>
          <p className="text-purple-200 text-xl font-medium">
            @{data.username}
          </p>
        </div>

        {/* 統計グリッド */}
        <div className="relative grid grid-cols-2 gap-4 p-8">
          {/* Total Contributions - メインの成果 */}
          {data.yearlyStats.totalContributions !== undefined && (
            <div className="relative bg-linear-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-xl p-6 text-center col-span-2 border border-white/10 transition-transform hover:scale-[1.01]">
              <div className="absolute inset-0 bg-linear-to-r from-purple-500/10 via-transparent to-pink-500/10 rounded-xl" />
              <Activity className="w-10 h-10 text-purple-300 mx-auto mb-3 drop-shadow-lg" />
              <p className="relative text-5xl font-black text-white mb-2 drop-shadow-lg">
                {formatNumber(data.yearlyStats.totalContributions)}
              </p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-purple-200 font-medium">Total Contributions</p>
                {data.growth?.contributions !== null && (
                  <GrowthBadge value={data.growth?.contributions ?? null} />
                )}
              </div>
            </div>
          )}

          {/* Longest Streak */}
          {data.yearlyStats.longestStreak !== undefined && data.yearlyStats.longestStreak > 0 && (
            <div className="bg-linear-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-xl p-5 text-center col-span-2 border border-white/10 transition-transform hover:scale-[1.01]">
              <Flame className="w-10 h-10 text-orange-400 mx-auto mb-2 drop-shadow-lg" />
              <p className="text-4xl font-black text-white mb-1">
                {data.yearlyStats.longestStreak}
              </p>
              <p className="text-purple-200 font-medium">
                Day Streak
              </p>
            </div>
          )}

          {/* PRs */}
          <div className="bg-linear-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-xl p-5 text-center border border-white/10 transition-transform hover:scale-[1.01]">
            <GitPullRequest className="w-8 h-8 text-green-400 mx-auto mb-2 drop-shadow-lg" />
            <p className="text-3xl font-bold text-white mb-1">
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
          <div className="bg-linear-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-xl p-5 text-center border border-white/10 transition-transform hover:scale-[1.01]">
            <CircleDot className="w-8 h-8 text-orange-400 mx-auto mb-2 drop-shadow-lg" />
            <p className="text-3xl font-bold text-white mb-1">
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
          <div className="bg-linear-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-xl p-5 col-span-2 border border-white/10 transition-transform hover:scale-[1.01]">
            <Code2 className="w-8 h-8 text-blue-400 mx-auto mb-2 drop-shadow-lg" />
            <p className="text-purple-200 text-sm mb-3 font-medium">Top Languages</p>
            <div className="flex justify-center gap-4 flex-wrap">
              {data.topLanguages.map((lang, index) => (
                <div key={lang.name} className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                  <Medal
                    className="w-5 h-5 drop-shadow"
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
                    className="w-3 h-3 rounded-full shadow-lg"
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
            <div className="bg-linear-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-xl p-5 text-center col-span-2 border border-white/10 transition-transform hover:scale-[1.01]">
              {(() => {
                const ActivityIcon = getActivityIcon(data.activityTime.type);
                return <ActivityIcon className="w-10 h-10 text-yellow-400 mx-auto mb-2 drop-shadow-lg" />;
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
            <div className="bg-linear-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-xl p-6 col-span-2 border border-white/10 transition-transform hover:scale-[1.01]">
              <Award className="w-10 h-10 text-purple-300 mx-auto mb-3 drop-shadow-lg" />
              <p className="text-purple-200 font-semibold text-base mb-4 text-center">Achievements</p>
              <div className="flex flex-wrap justify-center gap-3">
                {data.badges.slice(0, 6).map((badge) => {
                  const badgeDef = WRAPPED_BADGES[badge.id];
                  if (!badgeDef) return null;
                  const BadgeIcon = badgeDef.icon;
                  return (
                    <span
                      key={badge.id}
                      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${badgeDef.color} shadow-lg`}
                      title={badge.description}
                    >
                      <BadgeIcon className="w-4 h-4" />
                      <span>{badge.name}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Insight Score */}
        <div className="px-8 pb-6">
          <div
            className="relative rounded-xl p-6 text-center overflow-hidden shadow-xl"
            style={{ backgroundColor: rankColors.bg }}
          >
            <div className="absolute inset-0 bg-linear-to-t from-black/10 to-transparent" />
            <Trophy className="relative w-12 h-12 mx-auto mb-3 drop-shadow-lg" style={{ color: rankColors.text }} />
            <p className="relative text-sm font-medium mb-2" style={{ color: rankColors.text, opacity: 0.9 }}>
              Insight Score
            </p>
            <p className="relative text-5xl font-black mb-2 drop-shadow-lg" style={{ color: rankColors.text }}>
              {formatNumber(data.insightScore.score)}
            </p>
            <p className="relative text-xl font-bold tracking-wide" style={{ color: rankColors.text }}>
              {data.insightScore.rank} Rank
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="bg-black/30 backdrop-blur-sm px-8 py-4 flex items-center justify-between border-t border-white/10">
          <div className="flex items-center gap-2 text-purple-300 text-sm font-medium">
            <Calendar className="w-4 h-4" />
            Member since {data.memberSince}
          </div>
          <p className="text-purple-400 text-sm font-medium">
            github-insights.vercel.app
          </p>
        </div>
      </div>

      {/* シェアボタン */}
      <div className="mt-8 flex justify-center gap-4">
        <button
          onClick={async () => {
            if (!cardRef.current || isDownloading) return;
            
            setIsDownloading(true);
            try {
              const dataUrl = await toPng(cardRef.current, {
                quality: 1.0,
                pixelRatio: 2, // 高解像度
                cacheBust: true,
              });
              
              const link = document.createElement("a");
              link.download = `${username}-wrapped-${year}.png`;
              link.href = dataUrl;
              link.click();
            } catch (err) {
              console.error("Download failed:", err);
            } finally {
              setIsDownloading(false);
            }
          }}
          disabled={isDownloading}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-purple-500/25 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <Download className="w-5 h-5" />
          {isDownloading ? "Generating..." : "Download Card"}
        </button>
        <button
          onClick={async () => {
            const url = `${window.location.origin}/user/${username}/wrapped/${year}`;
            const shareText = `🎉 My GitHub Wrapped ${year} is here!\nCheck out my coding journey this year.\n\n`;
            const hashtags = "GitHubWrapped,GitHub";
            
            // Web Share API対応チェック
            if (navigator.share) {
              try {
                await navigator.share({
                  title: `GitHub Wrapped ${year} - @${username}`,
                  text: shareText,
                  url: url,
                });
              } catch (err) {
                // ユーザーがキャンセルした場合は無視
                if ((err as Error).name !== "AbortError") {
                  console.error("Share failed:", err);
                }
              }
            } else {
              // フォールバック: Twitter/X で共有
              const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;
              window.open(twitterUrl, "_blank", "noopener,noreferrer");
            }
          }}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 hover:bg-white/20 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-white rounded-xl transition-all font-semibold border border-gray-200 dark:border-white/20 hover:scale-105"
        >
          <Share2 className="w-5 h-5" />
          Share
        </button>
      </div>
    </DashboardLayout>
  );
}
