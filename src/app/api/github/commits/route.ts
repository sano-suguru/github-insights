import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { getCommitHistory } from "@/lib/github";

// キャッシュキーを生成
function getCacheKey(owner: string, repo: string, days: number | null, isAuthenticated: boolean) {
  return `commits:${owner}:${repo}:${days ?? "all"}:${isAuthenticated ? "auth" : "public"}`;
}

// キャッシュ付きでコミット履歴を取得
async function getCachedCommitHistory(
  accessToken: string | null,
  owner: string,
  repo: string,
  days: number | null
) {
  // 認証状態でキャッシュを分ける（認証済みはより多くのデータを取得可能）
  const isAuthenticated = !!accessToken;
  const cacheKey = getCacheKey(owner, repo, days, isAuthenticated);
  
  // キャッシュ時間: 5分（300秒）
  // revalidate: ISR的に5分後に再検証
  const cachedFetch = unstable_cache(
    async () => {
      console.log(`[Cache MISS] Fetching commits: ${owner}/${repo}, days=${days}`);
      return await getCommitHistory(accessToken, owner, repo, { days });
    },
    [cacheKey],
    {
      revalidate: 300, // 5分
      tags: [`commits:${owner}:${repo}`],
    }
  );

  return cachedFetch();
}

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

    // キャッシュ付きでデータ取得
    const commits = await getCachedCommitHistory(accessToken, owner, repo, days);

    // レスポンスヘッダーにキャッシュ情報を追加
    return NextResponse.json(commits, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
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
