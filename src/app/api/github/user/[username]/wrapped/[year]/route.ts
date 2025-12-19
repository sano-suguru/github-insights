import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import {
  getUserProfile,
  getUserRepositories,
  getYearlyContributionStats,
  getContributionCalendar,
  getUserEvents,
  calculateUserStats,
} from "@/lib/github/user";
import { analyzeActivityTime } from "@/lib/github/transforms";
import { GitHubRateLimitError } from "@/lib/github/errors";
import {
  calculateInsightScore,
  calculateAccountYears,
} from "@/lib/insight-score";
import { calculateWrappedBadges } from "@/lib/badges";
import { createApiErrorResponse, sequentialFetch } from "@/lib/api-server-utils";
import { SERVER_CACHE } from "@/lib/cache-config";
import { safeDecodePathSegment } from "@/lib/path-utils";
import { buildPublicCacheControl } from "@/lib/cache-utils";

interface Params {
  params: Promise<{
    username: string;
    year: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { username: rawUsername, year: yearStr } = await params;
    const username = safeDecodePathSegment(rawUsername);
    const year = parseInt(yearStr, 10);

    // 年のバリデーション
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 2008 || year > currentYear) {
      return createApiErrorResponse(
        400,
        "BAD_REQUEST",
        "Invalid year. Must be between 2008 and current year."
      );
    }

    if (!username) {
      return createApiErrorResponse(400, "BAD_REQUEST", "Username is required");
    }

    // セッションからアクセストークンを取得
    const session = await auth();
    const accessToken = session?.accessToken ?? null;

    const isAuthenticated = Boolean(accessToken);
    const cacheKey = `wrapped:${username}:${year}:${isAuthenticated ? "auth" : "public"}`;

    const fetcher = async () => {
      // プロファイルを取得
      const profile = await getUserProfile(username, accessToken);
      if (!profile) {
        return null;
      }

      // 順次でデータ取得（セカンダリレート制限対策）
      const [repositories, yearlyStats, contributionCalendar, events] = await sequentialFetch([
        () => getUserRepositories(username, accessToken),
        () => getYearlyContributionStats(username, year, accessToken),
        () => getContributionCalendar(username, year, accessToken),
        () => getUserEvents(username, accessToken),
      ] as const);

      // アクティビティ時間分析（直近90日間のイベントから）
      const activityTime = analyzeActivityTime(events);

      // 前年データを取得（成長率計算用）
      // アカウント作成年より前の場合はスキップ
      const memberSinceYear = new Date(profile.createdAt).getFullYear();
      const previousYear = year - 1;
      let previousYearData: {
        prs: number;
        issues: number;
        totalContributions: number;
      } | null = null;

      if (previousYear >= memberSinceYear) {
        const [prevStats, prevCalendar] = await sequentialFetch([
          () => getYearlyContributionStats(username, previousYear, accessToken),
          () => getContributionCalendar(username, previousYear, accessToken),
        ] as const);
        previousYearData = {
          prs: prevStats.prs,
          issues: prevStats.issues,
          totalContributions: prevCalendar.totalContributions,
        };
      }

      // 成長率を計算
      const calculateGrowthRate = (
        current: number,
        previous: number | undefined
      ): number | null => {
        if (previous === undefined || previous === 0) return null;
        return Math.round(((current - previous) / previous) * 100);
      };

      const growth = previousYearData
        ? {
            contributions: calculateGrowthRate(
              contributionCalendar.totalContributions,
              previousYearData.totalContributions
            ),
            prs: calculateGrowthRate(yearlyStats.prs, previousYearData.prs),
            issues: calculateGrowthRate(yearlyStats.issues, previousYearData.issues),
          }
        : null;

      const stats = calculateUserStats(repositories);

      // 言語TOP3を取得
      const topLanguages = stats.languageBreakdown.slice(0, 3).map((lang) => ({
        name: lang.name,
        color: lang.color,
        percentage: lang.percentage,
      }));

      // Insight Score を計算
      const accountYears = calculateAccountYears(profile.createdAt);
      const insightScore = calculateInsightScore({
        followers: profile.followers,
        totalStars: stats.totalStars,
        totalForks: stats.totalForks,
        publicRepos: stats.totalRepos,
        totalPRs: yearlyStats.prs,
        totalIssues: yearlyStats.issues,
        accountYears,
      });

      // バッジを計算
      const badges = calculateWrappedBadges({
        longestStreak: contributionCalendar.longestStreak,
        totalContributions: contributionCalendar.totalContributions,
        prs: yearlyStats.prs,
        languageCount: stats.languageBreakdown.length,
        activityType: activityTime.type,
        contributionGrowth: growth?.contributions ?? null,
        accountYears,
        isFirstYear: memberSinceYear === year,
      });

      return {
        year,
        username: profile.login,
        name: profile.name || profile.login,
        avatarUrl: profile.avatarUrl,
        yearlyStats: {
          ...yearlyStats,
          totalContributions: contributionCalendar.totalContributions,
          longestStreak: contributionCalendar.longestStreak,
          currentStreak: contributionCalendar.currentStreak,
        },
        growth,
        activityTime: {
          type: activityTime.type,
          label: activityTime.label,
          peakHour: activityTime.peakHour,
        },
        topLanguages,
        badges: badges.map((b) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          rarity: b.rarity,
        })),
        insightScore: {
          score: insightScore.score,
          rank: insightScore.rank,
        },
        memberSince: new Date(profile.createdAt).getFullYear(),
      };
    };

    const data = isAuthenticated
      ? await fetcher()
      : await unstable_cache(fetcher, [cacheKey], {
          revalidate: SERVER_CACHE.USER_PROFILE_REVALIDATE,
          tags: [`wrapped:${username}`],
        })();

    if (!data) {
      return createApiErrorResponse(404, "NOT_FOUND", "User not found");
    }

    const response = NextResponse.json(data);
    if (!isAuthenticated) {
      response.headers.set(
        "Cache-Control",
        buildPublicCacheControl(
          SERVER_CACHE.USER_PROFILE_REVALIDATE,
          SERVER_CACHE.USER_PROFILE_REVALIDATE * 2
        )
      );
    }

    return response;
  } catch (error) {
    console.error("Error fetching wrapped data:", error);

    if (error instanceof GitHubRateLimitError) {
      return createApiErrorResponse(
        429,
        "RATE_LIMIT",
        "Rate limit exceeded. Please try again later."
      );
    }

    return createApiErrorResponse(500, "INTERNAL", "Failed to fetch wrapped data");
  }
}
