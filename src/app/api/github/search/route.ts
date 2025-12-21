import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { logger } from "@/lib/logger";
import { auth } from "@/lib/auth";
import { searchRepositories } from "@/lib/github/repository";
import { GitHubRateLimitError } from "@/lib/github/errors";
import { createApiErrorResponse } from "@/lib/api-server-utils";
import { SERVER_CACHE } from "@/lib/cache-config";

// 検索結果をキャッシュ
const createCachedSearch = (accessToken: string | null, query: string) => {
  const isAuthenticated = !!accessToken;
  return unstable_cache(
    async () => searchRepositories(accessToken, query, 10),
    [`search:${query}:${isAuthenticated ? "auth" : "public"}`],
    { revalidate: SERVER_CACHE.USER_SEARCH_REVALIDATE, tags: ["search"] }
  );
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  // クエリが短すぎる場合は空配列を返す
  if (!query || query.length < 2) {
    return NextResponse.json({ repositories: [] });
  }

  try {
    const session = await auth();
    const accessToken = session?.accessToken ?? null;

    const searchFn = createCachedSearch(accessToken, query);
    const result = await searchFn();
    const { repositories, rateLimit } = result;

    return NextResponse.json(
      { repositories, rateLimit },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${SERVER_CACHE.USER_SEARCH_REVALIDATE}, stale-while-revalidate=${SERVER_CACHE.USER_SEARCH_REVALIDATE * 2}`,
        },
      }
    );
  } catch (error) {
    logger.error("Search API error:", error);

    if (error instanceof GitHubRateLimitError) {
      return createApiErrorResponse(
        429,
        "RATE_LIMIT",
        "Rate limit exceeded. Please try again later."
      );
    }

    return createApiErrorResponse(500, "INTERNAL", "検索に失敗しました");
  }
}
