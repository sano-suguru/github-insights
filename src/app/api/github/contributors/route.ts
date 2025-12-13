import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { getContributorStats, getContributorDetails } from "@/lib/github";
import { SERVER_CACHE, SWR_CACHE } from "@/lib/cache-config";

// キャッシュ付きでコントリビューター統計を取得
async function getCachedContributorStats(
  accessToken: string | null,
  owner: string,
  repo: string
) {
  const isAuthenticated = !!accessToken;
  const cacheKey = `contributors:${owner}:${repo}:${isAuthenticated ? "auth" : "public"}`;
  
  const cachedFetch = unstable_cache(
    async () => {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Cache MISS] Fetching contributors: ${owner}/${repo}`);
      }
      return await getContributorStats(accessToken, owner, repo);
    },
    [cacheKey],
    {
      revalidate: SERVER_CACHE.CONTRIBUTORS_REVALIDATE,
      tags: [`contributors:${owner}:${repo}`],
    }
  );

  return cachedFetch();
}

// キャッシュ付きでコントリビューター詳細を取得
async function getCachedContributorDetails(
  accessToken: string | null,
  owner: string,
  repo: string
) {
  const isAuthenticated = !!accessToken;
  const cacheKey = `contributor-details:${owner}:${repo}:${isAuthenticated ? "auth" : "public"}`;
  
  const cachedFetch = unstable_cache(
    async () => {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Cache MISS] Fetching contributor details: ${owner}/${repo}`);
      }
      return await getContributorDetails(accessToken, owner, repo);
    },
    [cacheKey],
    {
      revalidate: SERVER_CACHE.CONTRIBUTORS_REVALIDATE,
      tags: [`contributors:${owner}:${repo}`],
    }
  );

  return cachedFetch();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const type = searchParams.get("type");

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "owner and repo are required" },
        { status: 400 }
      );
    }

    if (!type || (type !== "stats" && type !== "details")) {
      return NextResponse.json(
        { error: "type is required and must be 'stats' or 'details'" },
        { status: 400 }
      );
    }

    const session = await auth();
    const accessToken = session?.accessToken ?? null;

    const data = type === "details"
      ? await getCachedContributorDetails(accessToken, owner, repo)
      : await getCachedContributorStats(accessToken, owner, repo);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, s-maxage=${SERVER_CACHE.CONTRIBUTORS_REVALIDATE}, stale-while-revalidate=${SWR_CACHE.CONTRIBUTORS}`,
      },
    });
  } catch (error) {
    console.error("Error fetching contributors:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("rate limit") ? 429 : 500;
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
