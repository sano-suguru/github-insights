import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLanguageStats } from "@/lib/github/stats";
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

    const languages = await createCachedFetch({
      fetcher: () => getLanguageStats(accessToken, owner, repo),
      cacheKeyPrefix: "languages",
      owner,
      repo,
      isAuthenticated,
      revalidate: SERVER_CACHE.LANGUAGES_REVALIDATE,
    });

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
