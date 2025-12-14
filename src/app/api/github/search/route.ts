import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { searchPublicRepositories, getPublicRateLimitInfo } from "@/lib/github";

// 検索結果をキャッシュ（60秒）
const cachedSearch = (query: string) =>
  unstable_cache(
    async () => searchPublicRepositories(query, 10),
    [`search:${query}`],
    { revalidate: 60, tags: ["search"] }
  );

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  // クエリが短すぎる場合は空配列を返す
  if (!query || query.length < 2) {
    return NextResponse.json({ repositories: [] });
  }

  try {
    const searchFn = cachedSearch(query);
    const repositories = await searchFn();
    const rateLimit = getPublicRateLimitInfo();

    return NextResponse.json(
      { repositories, rateLimit },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Search API error:", error);

    // レート制限エラーの判定
    const isRateLimited =
      error instanceof Error &&
      (error.message.includes("rate limit") ||
        error.message.includes("API rate limit"));

    if (isRateLimited) {
      const rateLimit = getPublicRateLimitInfo();
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          rateLimit,
          message: "GitHub APIのレート制限に達しました。しばらくお待ちください。",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Search failed", message: "検索に失敗しました" },
      { status: 500 }
    );
  }
}
