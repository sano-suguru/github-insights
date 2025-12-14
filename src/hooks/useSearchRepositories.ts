import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "./useDebounce";
import { SearchRepositoryResult } from "@/lib/github";
import { Repository } from "@/lib/github";

// 人気リポジトリデータの型
interface PopularReposData {
  featured: string[];
  categories: Record<string, string[]>;
  all: string[];
}

// ローカルで人気リポジトリを検索
async function searchLocalRepos(query: string): Promise<string[]> {
  if (!query || query.length < 1) {
    return [];
  }

  try {
    const response = await fetch("/data/popular-repos.json");
    const data: PopularReposData = await response.json();
    const lowerQuery = query.toLowerCase();

    return data.all
      .filter((repo) => repo.toLowerCase().includes(lowerQuery))
      .slice(0, 10);
  } catch {
    return [];
  }
}

// GitHub Search API から検索
async function searchRemoteRepos(
  query: string
): Promise<SearchRepositoryResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const response = await fetch(
    `/api/github/search?q=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    if (response.status === 429) {
      console.warn("Rate limit exceeded for search API");
      return [];
    }
    throw new Error("Search failed");
  }

  const data = await response.json();
  return data.repositories || [];
}

// Featured リポジトリを取得
async function getFeaturedRepos(): Promise<string[]> {
  try {
    const response = await fetch("/data/popular-repos.json");
    const data: PopularReposData = await response.json();
    return data.featured;
  } catch {
    return [];
  }
}

export interface SearchResult {
  nameWithOwner: string;
  source: "user" | "history" | "popular" | "search";
  description?: string | null;
  stargazerCount?: number;
  primaryLanguage?: { name: string; color: string } | null;
}

interface UseSearchRepositoriesOptions {
  userRepositories?: Repository[];
  recentRepos?: string[];
  enabled?: boolean;
}

export function useSearchRepositories(
  query: string,
  options: UseSearchRepositoriesOptions = {}
) {
  const { userRepositories = [], recentRepos = [], enabled = true } = options;

  const debouncedQuery = useDebounce(query, 300);

  // Featured リポジトリを取得（初期表示用）
  const { data: featuredRepos = [] } = useQuery({
    queryKey: ["featuredRepos"],
    queryFn: getFeaturedRepos,
    staleTime: 1000 * 60 * 60, // 1時間
    enabled,
  });

  // ローカル検索（即座に実行、デバウンスなし）
  const { data: localResults = [] } = useQuery({
    queryKey: ["localSearch", query],
    queryFn: () => searchLocalRepos(query),
    staleTime: 1000 * 60 * 5, // 5分
    enabled: enabled && query.length >= 1,
  });

  // リモート検索（デバウンス後に実行）
  const {
    data: remoteResults = [],
    isLoading: isRemoteLoading,
    error: remoteError,
  } = useQuery({
    queryKey: ["remoteSearch", debouncedQuery],
    queryFn: () => searchRemoteRepos(debouncedQuery),
    staleTime: 1000 * 60 * 5, // 5分
    enabled: enabled && debouncedQuery.length >= 2,
    retry: false,
  });

  // 検索結果を統合
  const results: SearchResult[] = [];
  const addedRepos = new Set<string>();

  // ヘルパー関数
  const addResult = (result: SearchResult) => {
    if (!addedRepos.has(result.nameWithOwner)) {
      results.push(result);
      addedRepos.add(result.nameWithOwner);
    }
  };

  if (query) {
    // 入力がある場合

    // 1. ユーザーのリポジトリからマッチ
    const lowerQuery = query.toLowerCase();
    userRepositories
      .filter((repo) =>
        repo.nameWithOwner.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5)
      .forEach((repo) => {
        addResult({
          nameWithOwner: repo.nameWithOwner,
          source: "user",
          description: repo.description,
          stargazerCount: repo.stargazerCount,
          primaryLanguage: repo.primaryLanguage,
        });
      });

    // 2. 履歴からマッチ
    recentRepos
      .filter((repo) => repo.toLowerCase().includes(lowerQuery))
      .slice(0, 3)
      .forEach((repo) => {
        addResult({ nameWithOwner: repo, source: "history" });
      });

    // 3. ローカル検索結果（人気リポジトリJSON）
    localResults.slice(0, 5).forEach((repo) => {
      addResult({ nameWithOwner: repo, source: "popular" });
    });

    // 4. リモート検索結果
    remoteResults.slice(0, 10).forEach((repo) => {
      addResult({
        nameWithOwner: repo.nameWithOwner,
        source: "search",
        description: repo.description,
        stargazerCount: repo.stargazerCount,
        primaryLanguage: repo.primaryLanguage,
      });
    });
  } else {
    // 入力がない場合

    // 1. 履歴を表示
    recentRepos.slice(0, 5).forEach((repo) => {
      addResult({ nameWithOwner: repo, source: "history" });
    });

    // 2. Featured リポジトリを表示
    featuredRepos.slice(0, 5).forEach((repo) => {
      addResult({ nameWithOwner: repo, source: "popular" });
    });
  }

  return {
    results,
    isLoading: isRemoteLoading && debouncedQuery.length >= 2,
    isDebouncing: query !== debouncedQuery && query.length >= 2,
    error: remoteError,
  };
}
