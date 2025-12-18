import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCommitHistory } from "@/lib/github/commits";
import { SERVER_CACHE, SWR_CACHE } from "@/lib/cache-config";
import { createCachedFetch } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const daysParam = searchParams.get("days");

    // バリデーション
    if (!owner || !repo) {
      return NextResponse.json(
        { error: "owner and repo are required" },
        { status: 400 }
      );
    }

    // daysをパース（"null"または未指定は全期間）
    const days = daysParam === "null" || daysParam === null 
      ? null 
      : parseInt(daysParam, 10);

    if (daysParam !== null && daysParam !== "null" && isNaN(days as number)) {
      return NextResponse.json(
        { error: "days must be a number or null" },
        { status: 400 }
      );
    }

    // セッションからアクセストークンを取得
    const session = await auth();
    const accessToken = session?.accessToken ?? null;
    const isAuthenticated = !!accessToken;

    // キャッシュ付きでデータ取得
    const commits = await createCachedFetch({
      fetcher: () => getCommitHistory(accessToken, owner, repo, { days }),
      cacheKeyPrefix: "commits",
      owner,
      repo,
      isAuthenticated,
      revalidate: SERVER_CACHE.COMMITS_REVALIDATE,
      additionalKeyParts: [days],
      debugLabel: `commits (days=${days})`,
    });

    // レスポンスヘッダーにキャッシュ情報を追加
    return NextResponse.json(commits, {
      headers: {
        "Cache-Control": `public, s-maxage=${SERVER_CACHE.COMMITS_REVALIDATE}, stale-while-revalidate=${SWR_CACHE.COMMITS}`,
      },
    });
  } catch (error) {
    console.error("Error fetching commits:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("rate limit") ? 429 : 500;
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
