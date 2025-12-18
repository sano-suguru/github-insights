import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { searchRepositories } from "@/lib/github/repository";
import { GitHubRateLimitError } from "@/lib/github/errors";

// 検索結果をキャッシュ（60秒）
const createCachedSearch = (accessToken: string | null, query: string) => {
  const isAuthenticated = !!accessToken;
  return unstable_cache(
    async () => searchRepositories(accessToken, query, 10),
    [`search:${query}:${isAuthenticated ? "auth" : "public"}`],
    { revalidate: 60, tags: ["search"] }
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
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Search API error:", error);

    if (error instanceof GitHubRateLimitError) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          rateLimit: null,
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
