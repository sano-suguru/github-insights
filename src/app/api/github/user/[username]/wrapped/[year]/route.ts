import { NextRequest, NextResponse } from "next/server";
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
import { sequentialFetch } from "@/lib/api-utils";

interface Params {
  params: Promise<{
    username: string;
    year: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { username, year: yearStr } = await params;
    const year = parseInt(yearStr, 10);

    // 年のバリデーション
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 2008 || year > currentYear) {
      return NextResponse.json(
        { error: "Invalid year. Must be between 2008 and current year." },
        { status: 400 }
      );
    }

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // セッションからアクセストークンを取得
    const session = await auth();
    const accessToken = session?.accessToken ?? null;

    // プロファイルを取得
    const profile = await getUserProfile(username, accessToken);
    if (!profile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
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
    const calculateGrowthRate = (current: number, previous: number | undefined): number | null => {
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
    // NOTE: GitHub APIの制約により、followers/stars/forks/reposは「現在の値」を使用。
    // PRs/Issuesのみ年間データを使用するハイブリッド指標となる。
    // 過去年のWrappedでは、これらの累計値が当時より増加している可能性がある。
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

    return NextResponse.json({
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
      // 前年比成長率（%）- nullは比較データなし
      growth,
      // アクティビティ時間分析（直近90日間のイベントベース）
      activityTime: {
        type: activityTime.type,
        label: activityTime.label,
        peakHour: activityTime.peakHour,
      },
      topLanguages,
      // 獲得バッジ
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
      // アカウント作成年（Wrapped表示用）
      memberSince: new Date(profile.createdAt).getFullYear(),
    });
  } catch (error) {
    console.error("Error fetching wrapped data:", error);

    if (error instanceof GitHubRateLimitError) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch wrapped data" },
      { status: 500 }
    );
  }
}
