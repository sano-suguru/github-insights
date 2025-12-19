import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRepositoryStats } from "@/lib/github/stats";
import { SERVER_CACHE, SWR_CACHE } from "@/lib/cache-config";
import { createApiErrorResponse, createCachedFetch } from "@/lib/api-server-utils";
import { GitHubRateLimitError } from "@/lib/github/errors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");

    if (!owner || !repo) {
      return createApiErrorResponse(400, "BAD_REQUEST", "owner and repo are required");
    }

    const session = await auth();
    const accessToken = session?.accessToken ?? null;
    const isAuthenticated = !!accessToken;

    const stats = await createCachedFetch({
      fetcher: () => getRepositoryStats(accessToken, owner, repo),
      cacheKeyPrefix: "stats",
      owner,
      repo,
      isAuthenticated,
      revalidate: SERVER_CACHE.STATS_REVALIDATE,
    });

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": `public, s-maxage=${SERVER_CACHE.STATS_REVALIDATE}, stale-while-revalidate=${SWR_CACHE.STATS}`,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);

    if (error instanceof GitHubRateLimitError) {
      return createApiErrorResponse(
        429,
        "RATE_LIMIT",
        "Rate limit exceeded. Please try again later."
      );
    }

    return createApiErrorResponse(500, "INTERNAL", "Failed to fetch repository stats");
  }
}
