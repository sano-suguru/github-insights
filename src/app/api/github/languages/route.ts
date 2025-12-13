import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { getLanguageStats } from "@/lib/github";
import { SERVER_CACHE, SWR_CACHE } from "@/lib/cache-config";

// キャッシュ付きで言語統計を取得
async function getCachedLanguageStats(
  accessToken: string | null,
  owner: string,
  repo: string
) {
  const isAuthenticated = !!accessToken;
  const cacheKey = `languages:${owner}:${repo}:${isAuthenticated ? "auth" : "public"}`;
  
  const cachedFetch = unstable_cache(
    async () => {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Cache MISS] Fetching languages: ${owner}/${repo}`);
      }
      return await getLanguageStats(accessToken, owner, repo);
    },
    [cacheKey],
    {
      revalidate: SERVER_CACHE.LANGUAGES_REVALIDATE,
      tags: [`languages:${owner}:${repo}`],
    }
  );

  return cachedFetch();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "owner and repo are required" },
        { status: 400 }
      );
    }

    const session = await auth();
    const accessToken = session?.accessToken ?? null;

    const languages = await getCachedLanguageStats(accessToken, owner, repo);

    return NextResponse.json(languages, {
      headers: {
        "Cache-Control": `public, s-maxage=${SERVER_CACHE.LANGUAGES_REVALIDATE}, stale-while-revalidate=${SWR_CACHE.LANGUAGES}`,
      },
    });
  } catch (error) {
    console.error("Error fetching languages:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("rate limit") ? 429 : 500;
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
