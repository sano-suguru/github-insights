import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sequentialFetch } from "@/lib/api-utils";
import type {
  UserProfile,
  UserStats,
  UserEvent,
  UserContributionStats,
} from "@/lib/github/types";
import {
  getUserProfile,
  getUserRepositories,
  getUserEvents,
  getUserContributionStats,
  calculateUserStats,
} from "@/lib/github/user";
import { GitHubRateLimitError } from "@/lib/github/errors";

interface Params {
  params: Promise<{
    username: string;
  }>;
}

// ユーザーデータを取得
// 注: クライアント側で React Query がキャッシュするため、サーバー側キャッシュは使用しない
// セカンダリレート制限対策: Promise.allから順次実行に変更
async function fetchUserData(
  username: string,
  accessToken: string | null
): Promise<{
  profile: UserProfile | null;
  stats: UserStats | null;
  events: UserEvent[];
  contributionStats: UserContributionStats;
}> {
  const profile = await getUserProfile(username, accessToken);

  if (!profile) {
    return { profile: null, stats: null, events: [], contributionStats: { totalPRs: 0, totalIssues: 0 } };
  }

  // セカンダリレート制限対策: 順次実行（各リクエスト間に100msの遅延）
  const [repositories, events, contributionStats] = await sequentialFetch([
    () => getUserRepositories(username, accessToken),
    () => getUserEvents(username, accessToken),
    () => getUserContributionStats(username, accessToken),
  ] as const);
  
  const stats = calculateUserStats(repositories);

  return { profile, stats, events, contributionStats };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { username } = await params;

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // セッションからアクセストークンを取得（あれば認証済み、なければ未認証）
    const session = await auth();
    const accessToken = session?.accessToken ?? null;

    const { profile, stats, events, contributionStats } = await fetchUserData(username, accessToken);

    if (!profile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      profile,
      stats,
      events,
      contributionStats,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);

    if (error instanceof GitHubRateLimitError) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
