import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getContributorStats, getContributorDetails } from "@/lib/github/stats";
import { SERVER_CACHE, SWR_CACHE } from "@/lib/cache-config";
import { createApiErrorResponse, createCachedFetch } from "@/lib/api-server-utils";
import { GitHubRateLimitError } from "@/lib/github/errors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const type = searchParams.get("type");

    if (!owner || !repo) {
      return createApiErrorResponse(400, "BAD_REQUEST", "owner and repo are required");
    }

    if (!type || (type !== "stats" && type !== "details")) {
      return createApiErrorResponse(
        400,
        "BAD_REQUEST",
        "type is required and must be 'stats' or 'details'"
      );
    }

    const session = await auth();
    const accessToken = session?.accessToken ?? null;

    const isAuthenticated = !!accessToken;
    
    const data = type === "details"
      ? await createCachedFetch({
          fetcher: () => getContributorDetails(accessToken, owner, repo),
          cacheKeyPrefix: "contributor-details",
          owner,
          repo,
          isAuthenticated,
          revalidate: SERVER_CACHE.CONTRIBUTORS_REVALIDATE,
          debugLabel: "contributor details",
        })
      : await createCachedFetch({
          fetcher: () => getContributorStats(accessToken, owner, repo),
          cacheKeyPrefix: "contributors",
          owner,
          repo,
          isAuthenticated,
          revalidate: SERVER_CACHE.CONTRIBUTORS_REVALIDATE,
        });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, s-maxage=${SERVER_CACHE.CONTRIBUTORS_REVALIDATE}, stale-while-revalidate=${SWR_CACHE.CONTRIBUTORS}`,
      },
    });
  } catch (error) {
    console.error("Error fetching contributors:", error);

    if (error instanceof GitHubRateLimitError) {
      return createApiErrorResponse(
        429,
        "RATE_LIMIT",
        "Rate limit exceeded. Please try again later."
      );
    }

    return createApiErrorResponse(500, "INTERNAL", "Failed to fetch contributors");
  }
}
