import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserProfile,
  getUserRepositories,
  getYearlyContributionStats,
  calculateUserStats,
  GitHubRateLimitError,
} from "@/lib/github";
import {
  calculateInsightScore,
  calculateAccountYears,
} from "@/lib/insight-score";

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

    // 並列でデータ取得
    const [repositories, yearlyStats] = await Promise.all([
      getUserRepositories(username, accessToken),
      getYearlyContributionStats(username, year, accessToken),
    ]);

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
    const insightScore = calculateInsightScore({
      followers: profile.followers,
      totalStars: stats.totalStars,
      totalForks: stats.totalForks,
      publicRepos: stats.totalRepos,
      totalPRs: yearlyStats.prs,
      totalIssues: yearlyStats.issues,
      accountYears: calculateAccountYears(profile.createdAt),
    });

    return NextResponse.json({
      year,
      username: profile.login,
      name: profile.name || profile.login,
      avatarUrl: profile.avatarUrl,
      yearlyStats,
      topLanguages,
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
