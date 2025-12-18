import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getLanguageStats,
  getContributorStats,
  getContributorDetails,
  getRepositoryStats,
  LanguageStat,
  ContributorStat,
  ContributorDetailStat,
  RepositoryStat,
} from "@/lib/github";
import { SERVER_CACHE, SWR_CACHE } from "@/lib/cache-config";
import { createCachedFetch, sequentialFetch } from "@/lib/api-utils";

// リポジトリデータの統合レスポンス型
export interface RepoAllDataResponse {
  languages: LanguageStat[];
  contributorStats: ContributorStat[];
  contributorDetails: ContributorDetailStat[];
  repositoryStats: RepositoryStat;
}

interface Params {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { owner, repo } = await params;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "owner and repo are required" },
        { status: 400 }
      );
    }

    const session = await auth();
    const accessToken = session?.accessToken ?? null;
    const isAuthenticated = !!accessToken;

    // 順次データ取得（セカンダリレート制限対策）
    // 各データはサーバーサイドでキャッシュされる
    const [languages, contributorStats, contributorDetails, repositoryStats] =
      await sequentialFetch([
        () =>
          createCachedFetch({
            fetcher: () => getLanguageStats(accessToken, owner, repo),
            cacheKeyPrefix: "languages",
            owner,
            repo,
            isAuthenticated,
            revalidate: SERVER_CACHE.LANGUAGES_REVALIDATE,
          }),
        () =>
          createCachedFetch({
            fetcher: () => getContributorStats(accessToken, owner, repo),
            cacheKeyPrefix: "contributors",
            owner,
            repo,
            isAuthenticated,
            revalidate: SERVER_CACHE.CONTRIBUTORS_REVALIDATE,
          }),
        () =>
          createCachedFetch({
            fetcher: () => getContributorDetails(accessToken, owner, repo),
            cacheKeyPrefix: "contributor-details",
            owner,
            repo,
            isAuthenticated,
            revalidate: SERVER_CACHE.CONTRIBUTORS_REVALIDATE,
          }),
        () =>
          createCachedFetch({
            fetcher: () => getRepositoryStats(accessToken, owner, repo),
            cacheKeyPrefix: "stats",
            owner,
            repo,
            isAuthenticated,
            revalidate: SERVER_CACHE.STATS_REVALIDATE,
          }),
      ] as const);

    const response: RepoAllDataResponse = {
      languages,
      contributorStats,
      contributorDetails,
      repositoryStats,
    };

    return NextResponse.json(response, {
      headers: {
        // 最も短いキャッシュ時間を使用
        "Cache-Control": `public, s-maxage=${SERVER_CACHE.STATS_REVALIDATE}, stale-while-revalidate=${SWR_CACHE.STATS}`,
      },
    });
  } catch (error) {
    console.error("Error fetching repo data:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("rate limit") ? 429 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
