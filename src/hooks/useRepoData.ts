"use client";

import { useQuery, useQueries } from "@tanstack/react-query";
import type {
  LanguageStat,
  ContributorStat,
  ContributorDetailStat,
  RepositoryStat,
} from "@/lib/github";
import { CLIENT_CACHE } from "@/lib/cache-config";
import { getErrorMessage } from "@/lib/api-utils";

interface UseRepoDataParams {
  owner: string;
  repo: string;
  enabled?: boolean;
}

// API経由で言語統計を取得
async function fetchLanguagesFromAPI(owner: string, repo: string): Promise<LanguageStat[]> {
  const url = `/api/github/languages?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to fetch languages"));
  }
  return res.json();
}

// API経由でコントリビューター統計を取得
async function fetchContributorStatsFromAPI(owner: string, repo: string): Promise<ContributorStat[]> {
  const url = `/api/github/contributors?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&type=stats`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to fetch contributor stats"));
  }
  return res.json();
}

// API経由でコントリビューター詳細を取得
async function fetchContributorDetailsFromAPI(owner: string, repo: string): Promise<ContributorDetailStat[]> {
  const url = `/api/github/contributors?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&type=details`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to fetch contributor details"));
  }
  return res.json();
}

// API経由でリポジトリ統計を取得
async function fetchStatsFromAPI(owner: string, repo: string): Promise<RepositoryStat> {
  const url = `/api/github/stats?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to fetch repository stats"));
  }
  return res.json();
}

// 言語統計フック
export function useLanguageStats({ owner, repo, enabled = true }: UseRepoDataParams) {
  return useQuery({
    queryKey: ["languageStats", owner, repo],
    queryFn: () => fetchLanguagesFromAPI(owner, repo),
    enabled: enabled && !!owner && !!repo,
    staleTime: CLIENT_CACHE.LANGUAGES_STALE_TIME,
  });
}

// コントリビューター統計フック
export function useContributorStats({ owner, repo, enabled = true }: UseRepoDataParams) {
  return useQuery({
    queryKey: ["contributorStats", owner, repo],
    queryFn: () => fetchContributorStatsFromAPI(owner, repo),
    enabled: enabled && !!owner && !!repo,
    staleTime: CLIENT_CACHE.CONTRIBUTORS_STALE_TIME,
  });
}

// コントリビューター詳細統計フック
export function useContributorDetails({ owner, repo, enabled = true }: UseRepoDataParams) {
  return useQuery({
    queryKey: ["contributorDetails", owner, repo],
    queryFn: () => fetchContributorDetailsFromAPI(owner, repo),
    enabled: enabled && !!owner && !!repo,
    staleTime: CLIENT_CACHE.CONTRIBUTORS_STALE_TIME,
  });
}

// リポジトリ統計フック
export function useRepositoryStats({ owner, repo, enabled = true }: UseRepoDataParams) {
  return useQuery({
    queryKey: ["repositoryStats", owner, repo],
    queryFn: () => fetchStatsFromAPI(owner, repo),
    enabled: enabled && !!owner && !!repo,
    staleTime: CLIENT_CACHE.STATS_STALE_TIME,
  });
}

// 全データを一括取得するフック
export function useRepoAllData({ owner, repo, enabled = true }: UseRepoDataParams) {
  const results = useQueries({
    queries: [
      {
        queryKey: ["languageStats", owner, repo],
        queryFn: () => fetchLanguagesFromAPI(owner, repo),
        enabled: enabled && !!owner && !!repo,
        staleTime: CLIENT_CACHE.LANGUAGES_STALE_TIME,
      },
      {
        queryKey: ["contributorStats", owner, repo],
        queryFn: () => fetchContributorStatsFromAPI(owner, repo),
        enabled: enabled && !!owner && !!repo,
        staleTime: CLIENT_CACHE.CONTRIBUTORS_STALE_TIME,
      },
      {
        queryKey: ["contributorDetails", owner, repo],
        queryFn: () => fetchContributorDetailsFromAPI(owner, repo),
        enabled: enabled && !!owner && !!repo,
        staleTime: CLIENT_CACHE.CONTRIBUTORS_STALE_TIME,
      },
      {
        queryKey: ["repositoryStats", owner, repo],
        queryFn: () => fetchStatsFromAPI(owner, repo),
        enabled: enabled && !!owner && !!repo,
        staleTime: CLIENT_CACHE.STATS_STALE_TIME,
      },
    ],
  });

  const [languageStats, contributorStats, contributorDetails, repositoryStats] = results;

  return {
    languageStats,
    contributorStats,
    contributorDetails,
    repositoryStats,
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
  };
}
