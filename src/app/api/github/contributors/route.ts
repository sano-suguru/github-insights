import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getContributorStats, getContributorDetails } from "@/lib/github";
import { SERVER_CACHE, SWR_CACHE } from "@/lib/cache-config";
import { createCachedFetch } from "@/lib/api-utils";

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
    
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("rate limit") ? 429 : 500;
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
