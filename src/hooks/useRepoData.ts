"use client";

import { useQuery, useQueries } from "@tanstack/react-query";
import {
  getLanguageStats,
  getContributorStats,
  getRepositoryStats,
  getContributorDetails,
} from "@/lib/github";

interface UseRepoDataParams {
  accessToken: string | null;
  owner: string;
  repo: string;
  enabled?: boolean;
}

// 言語統計フック
export function useLanguageStats({ accessToken, owner, repo, enabled = true }: UseRepoDataParams) {
  return useQuery({
    queryKey: ["languageStats", owner, repo],
    queryFn: () => getLanguageStats(accessToken, owner, repo),
    enabled: enabled && !!owner && !!repo,
    staleTime: 10 * 60 * 1000,
  });
}

// コントリビューター統計フック
export function useContributorStats({ accessToken, owner, repo, enabled = true }: UseRepoDataParams) {
  return useQuery({
    queryKey: ["contributorStats", owner, repo],
    queryFn: () => getContributorStats(accessToken, owner, repo),
    enabled: enabled && !!owner && !!repo,
    staleTime: 5 * 60 * 1000,
  });
}

// コントリビューター詳細統計フック
export function useContributorDetails({ accessToken, owner, repo, enabled = true }: UseRepoDataParams) {
  return useQuery({
    queryKey: ["contributorDetails", owner, repo],
    queryFn: () => getContributorDetails(accessToken, owner, repo),
    enabled: enabled && !!owner && !!repo,
    staleTime: 5 * 60 * 1000,
  });
}

// リポジトリ統計フック
export function useRepositoryStats({ accessToken, owner, repo, enabled = true }: UseRepoDataParams) {
  return useQuery({
    queryKey: ["repositoryStats", owner, repo],
    queryFn: () => getRepositoryStats(accessToken, owner, repo),
    enabled: enabled && !!owner && !!repo,
    staleTime: 10 * 60 * 1000,
  });
}

// 全データを一括取得するフック
export function useRepoAllData({ accessToken, owner, repo, enabled = true }: UseRepoDataParams) {
  const results = useQueries({
    queries: [
      {
        queryKey: ["languageStats", owner, repo],
        queryFn: () => getLanguageStats(accessToken, owner, repo),
        enabled: enabled && !!owner && !!repo,
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: ["contributorStats", owner, repo],
        queryFn: () => getContributorStats(accessToken, owner, repo),
        enabled: enabled && !!owner && !!repo,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ["contributorDetails", owner, repo],
        queryFn: () => getContributorDetails(accessToken, owner, repo),
        enabled: enabled && !!owner && !!repo,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ["repositoryStats", owner, repo],
        queryFn: () => getRepositoryStats(accessToken, owner, repo),
        enabled: enabled && !!owner && !!repo,
        staleTime: 10 * 60 * 1000,
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
