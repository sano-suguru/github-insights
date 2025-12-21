import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { auth } from "@/lib/auth";
import { getCommitHistory } from "@/lib/github/commits";
import { SERVER_CACHE, SWR_CACHE } from "@/lib/cache-config";
import { createApiErrorResponse, createCachedFetch } from "@/lib/api-server-utils";
import { GitHubRateLimitError } from "@/lib/github/errors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const daysParam = searchParams.get("days");

    // バリデーション
    if (!owner || !repo) {
      return createApiErrorResponse(400, "BAD_REQUEST", "owner and repo are required");
    }

    // daysをパース（"null"または未指定は全期間）
    const days = daysParam === "null" || daysParam === null 
      ? null 
      : parseInt(daysParam, 10);

    if (daysParam !== null && daysParam !== "null" && isNaN(days as number)) {
      return createApiErrorResponse(400, "BAD_REQUEST", "days must be a number or null");
    }

    // セッションからアクセストークンを取得
    const session = await auth();
    const accessToken = session?.accessToken ?? null;
    const isAuthenticated = !!accessToken;

    // キャッシュ付きでデータ取得
    const commits = await createCachedFetch({
      fetcher: () => getCommitHistory(accessToken, owner, repo, { days }),
      cacheKeyPrefix: "commits",
      owner,
      repo,
      isAuthenticated,
      revalidate: SERVER_CACHE.COMMITS_REVALIDATE,
      additionalKeyParts: [days],
      debugLabel: `commits (days=${days})`,
    });

    // レスポンスヘッダーにキャッシュ情報を追加
    return NextResponse.json(commits, {
      headers: {
        "Cache-Control": `public, s-maxage=${SERVER_CACHE.COMMITS_REVALIDATE}, stale-while-revalidate=${SWR_CACHE.COMMITS}`,
      },
    });
  } catch (error) {
    logger.error("Error fetching commits:", error);

    if (error instanceof GitHubRateLimitError) {
      return createApiErrorResponse(
        429,
        "RATE_LIMIT",
        "Rate limit exceeded. Please try again later."
      );
    }

    return createApiErrorResponse(500, "INTERNAL", "Failed to fetch commits");
  }
}
