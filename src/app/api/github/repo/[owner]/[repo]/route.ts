import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type {
  Repository,
  LanguageStat,
  ContributorStat,
  ContributorDetailStat,
  RepositoryStat,
} from "@/lib/github/types";
import { getRepository } from "@/lib/github/repository";
import {
  getLanguageStats,
  getContributorStats,
  getContributorDetails,
  getRepositoryStats,
} from "@/lib/github/stats";
import { SERVER_CACHE, SWR_CACHE } from "@/lib/cache-config";
import {
  createApiErrorResponse,
  createCachedFetch,
  sequentialFetch,
} from "@/lib/api-server-utils";
import { GitHubRateLimitError } from "@/lib/github/errors";

// リポジトリデータの統合レスポンス型
import type { RepoRouteParams } from "@/types/route-params";

export interface RepoAllDataResponse {
  repository: Repository;
  languages: LanguageStat[];
  contributorStats: ContributorStat[];
  contributorDetails: ContributorDetailStat[];
  repositoryStats: RepositoryStat;
}

export async function GET(request: NextRequest, { params }: RepoRouteParams) {
  try {
    const { owner, repo } = await params;

    if (!owner || !repo) {
      return createApiErrorResponse(400, "BAD_REQUEST", "owner and repo are required");
    }

    const session = await auth();
    const accessToken = session?.accessToken ?? null;
    const isAuthenticated = !!accessToken;

    // 順次データ取得（セカンダリレート制限対策）
    // 各データはサーバーサイドでキャッシュされる
    const [
      repository,
      languages,
      contributorStats,
      contributorDetails,
      repositoryStats,
    ] = await sequentialFetch([
      () =>
        createCachedFetch({
          fetcher: () => getRepository(accessToken, owner, repo),
          cacheKeyPrefix: "repository",
          owner,
          repo,
          isAuthenticated,
          revalidate: SERVER_CACHE.STATS_REVALIDATE,
        }),
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
      repository,
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

    if (error instanceof GitHubRateLimitError) {
      return createApiErrorResponse(
        429,
        "RATE_LIMIT",
        "Rate limit exceeded. Please try again later."
      );
    }

    if (error instanceof Error) {
      if (error.message === "Repository not found") {
        return createApiErrorResponse(404, "NOT_FOUND", "Repository not found");
      }
      if (error.message === "This is a private repository. Please login to access.") {
        return createApiErrorResponse(
          403,
          "FORBIDDEN",
          "This is a private repository. Please login to access."
        );
      }
    }

    return createApiErrorResponse(500, "INTERNAL", "Failed to fetch repository data");
  }
}
