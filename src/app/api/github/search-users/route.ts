import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { searchUsers, getPublicRateLimitInfo, GitHubRateLimitError } from "@/lib/github";

// 検索結果をキャッシュ（60秒）
const createCachedSearchUsers = (query: string) =>
  unstable_cache(
    async () => searchUsers(query, 5),
    [`search-users:${query}`],
    { revalidate: 60, tags: ["search-users"] }
  );

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  // クエリが短すぎる場合は空配列を返す
  if (!query || query.length < 1) {
    return NextResponse.json({ users: [] });
  }

  try {
    const searchFn = createCachedSearchUsers(query);
    const users = await searchFn();
    const rateLimit = getPublicRateLimitInfo();

    return NextResponse.json(
      { users, rateLimit },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Search Users API error:", error);

    if (error instanceof GitHubRateLimitError) {
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
      { error: "Search failed", message: "ユーザー検索に失敗しました" },
      { status: 500 }
    );
  }
}
