import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/github/repository";
import { SERVER_CACHE, SWR_CACHE } from "@/lib/cache-config";
import { createApiErrorResponse, createCachedFetch } from "@/lib/api-server-utils";
import { isRateLimitError } from "@/lib/github/errors";

function parseRepoParams(searchParams: URLSearchParams): { owner: string; repo: string } | null {
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repoName") ?? searchParams.get("repo");

  if (owner && repo) {
    return { owner, repo };
  }

  const full = searchParams.get("full") ?? searchParams.get("nameWithOwner") ?? searchParams.get("repo");
  if (!full) return null;

  const [parsedOwner, parsedRepo] = full.split("/");
  if (!parsedOwner || !parsedRepo) return null;

  return { owner: parsedOwner, repo: parsedRepo };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = parseRepoParams(searchParams);

  if (!parsed) {
    return createApiErrorResponse(400, "BAD_REQUEST", "owner/repo is required");
  }

  try {
    const session = await auth();
    const accessToken = session?.accessToken ?? null;
    const isAuthenticated = !!accessToken;

    await createCachedFetch({
      fetcher: () => getRepository(accessToken, parsed.owner, parsed.repo),
      cacheKeyPrefix: "repo-exists",
      owner: parsed.owner,
      repo: parsed.repo,
      isAuthenticated,
      revalidate: SERVER_CACHE.STATS_REVALIDATE,
      debugLabel: "repo-exists",
    });

    return NextResponse.json(
      { exists: true },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${SERVER_CACHE.STATS_REVALIDATE}, stale-while-revalidate=${SWR_CACHE.STATS}`,
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (isRateLimitError(error)) {
      return createApiErrorResponse(
        429,
        "RATE_LIMIT",
        "Rate limit exceeded. Please try again later."
      );
    }

    // 存在しない/未認証で private などは exists: false として扱う
    if (
      /not found/i.test(message) ||
      /private repository/i.test(message)
    ) {
      return NextResponse.json(
        { exists: false },
        {
          headers: {
            "Cache-Control": `public, s-maxage=${SERVER_CACHE.STATS_REVALIDATE}, stale-while-revalidate=${SWR_CACHE.STATS}`,
          },
        }
      );
    }

    logger.error("Error validating repository:", error);
    return createApiErrorResponse(500, "INTERNAL", "Failed to validate repository");
  }
}
