import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { logger } from "@/lib/logger";
import { auth } from "@/lib/auth";
import { createApiErrorResponse, sequentialFetch } from "@/lib/api-server-utils";
import { SERVER_CACHE } from "@/lib/cache-config";
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
import { safeDecodePathSegment } from "@/lib/path-utils";
import { buildPublicCacheControl } from "@/lib/cache-utils";
import type { UserRouteParams } from "@/types/route-params";

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

export async function GET(request: NextRequest, { params }: UserRouteParams) {
  try {
    const { username: rawUsername } = await params;
    const username = safeDecodePathSegment(rawUsername);

    if (!username) {
      return createApiErrorResponse(400, "BAD_REQUEST", "Username is required");
    }

    // セッションからアクセストークンを取得（あれば認証済み、なければ未認証）
    const session = await auth();
    const accessToken = session?.accessToken ?? null;

    const isAuthenticated = Boolean(accessToken);
    const cacheKey = `user:${username}:${isAuthenticated ? "auth" : "public"}`;

    const fetcher = () => fetchUserData(username, accessToken);

    const { profile, stats, events, contributionStats } = isAuthenticated
      ? await fetcher()
      : await unstable_cache(fetcher, [cacheKey], {
          revalidate: SERVER_CACHE.USER_PROFILE_REVALIDATE,
          tags: [`user:${username}`],
        })();

    if (!profile) {
      return createApiErrorResponse(404, "NOT_FOUND", "User not found");
    }

    const response = NextResponse.json({
      profile,
      stats,
      events,
      contributionStats,
    });

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
    logger.error("Error fetching user data:", error);

    if (error instanceof GitHubRateLimitError) {
      return createApiErrorResponse(
        429,
        "RATE_LIMIT",
        "Rate limit exceeded. Please try again later."
      );
    }

    return createApiErrorResponse(500, "INTERNAL", "Failed to fetch user data");
  }
}
