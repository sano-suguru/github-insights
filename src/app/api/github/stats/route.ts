import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRepositoryStats } from "@/lib/github";
import { SERVER_CACHE, SWR_CACHE } from "@/lib/cache-config";
import { createCachedFetch } from "@/lib/api-utils";

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
    
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("rate limit") ? 429 : 500;
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
