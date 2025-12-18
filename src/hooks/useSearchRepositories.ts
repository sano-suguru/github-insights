import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "./useDebounce";
import type { SearchRepositoryResult, SearchUserResult, Repository } from "@/lib/github/types";

// 検索最小文字数の定数
export const MIN_USER_SEARCH_QUERY_LENGTH = 1;
export const MIN_REPO_SEARCH_QUERY_LENGTH = 2;

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

// 共通のリモート検索関数
async function fetchFromApi<T>(
  endpoint: string,
  query: string,
  minLength: number,
  resultKey: string
): Promise<T[]> {
  if (!query || query.length < minLength) {
    return [];
  }

  const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    if (response.status === 429) {
      console.warn(`Rate limit exceeded: ${endpoint}`);
      return [];
    }
    throw new Error(`API request failed: ${endpoint}`);
  }

  const data = await response.json();
  return data[resultKey] || [];
}

// GitHub Search API から検索
const searchRemoteRepos = (query: string) =>
  fetchFromApi<SearchRepositoryResult>("/api/github/search", query, MIN_REPO_SEARCH_QUERY_LENGTH, "repositories");

// GitHub Users Search API からユーザー検索
const searchRemoteUsers = (query: string) =>
  fetchFromApi<SearchUserResult>("/api/github/search-users", query, MIN_USER_SEARCH_QUERY_LENGTH, "users");

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

// リポジトリ検索結果の型
export interface SearchResult {
  nameWithOwner: string;
  source: "user" | "history" | "popular" | "search";
  description?: string | null;
  stargazerCount?: number;
  primaryLanguage?: { name: string; color: string } | null;
}

// ユーザー検索結果の型（UI用）
export interface UserSearchResult {
  login: string;
  avatarUrl: string;
  name: string | null;
  followers: number;
  publicRepos: number;
  type: "User" | "Organization";
}

interface UseSearchRepositoriesOptions {
  userRepositories?: Repository[];
  recentRepos?: string[];
  enabled?: boolean;
}

// ユーザー検索モードかどうか判定
function isUserSearchQuery(query: string): boolean {
  return query.startsWith("@");
}

// @を除いたクエリを取得
function getUserSearchQuery(query: string): string {
  return query.slice(1);
}

export function useSearchRepositories(
  query: string,
  options: UseSearchRepositoriesOptions = {}
) {
  const { userRepositories = [], recentRepos = [], enabled = true } = options;

  const debouncedQuery = useDebounce(query, 300);
  
  // ユーザー検索モード判定
  const isUserSearch = isUserSearchQuery(query);
  const userQuery = isUserSearch ? getUserSearchQuery(query) : "";
  const debouncedUserQuery = isUserSearchQuery(debouncedQuery) 
    ? getUserSearchQuery(debouncedQuery) 
    : "";

  // Featured リポジトリを取得（初期表示用）
  const { data: featuredRepos = [] } = useQuery({
    queryKey: ["featuredRepos"],
    queryFn: getFeaturedRepos,
    staleTime: 1000 * 60 * 60, // 1時間
    enabled: enabled && !isUserSearch,
  });

  // ユーザー検索（デバウンス後に実行）
  const {
    data: userResults = [],
    isLoading: isUserLoading,
    error: userError,
  } = useQuery({
    queryKey: ["userSearch", debouncedUserQuery],
    queryFn: () => searchRemoteUsers(debouncedUserQuery),
    staleTime: 1000 * 60 * 5, // 5分
    enabled: enabled && isUserSearch && debouncedUserQuery.length >= MIN_USER_SEARCH_QUERY_LENGTH,
    retry: false,
  });

  // ローカル検索（即座に実行、デバウンスなし）- リポジトリ検索時のみ
  const { data: localResults = [] } = useQuery({
    queryKey: ["localSearch", query],
    queryFn: () => searchLocalRepos(query),
    staleTime: 1000 * 60 * 5, // 5分
    enabled: enabled && !isUserSearch && query.length >= MIN_USER_SEARCH_QUERY_LENGTH,
  });

  // リモート検索（デバウンス後に実行）- リポジトリ検索時のみ
  const {
    data: remoteResults = [],
    isLoading: isRemoteLoading,
    error: remoteError,
  } = useQuery({
    queryKey: ["remoteSearch", debouncedQuery],
    queryFn: () => searchRemoteRepos(debouncedQuery),
    staleTime: 1000 * 60 * 5, // 5分
    enabled: enabled && !isUserSearch && debouncedQuery.length >= MIN_REPO_SEARCH_QUERY_LENGTH,
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

  // リポジトリ検索モードの場合
  if (!isUserSearch) {
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
  }

  // 検索モードとローディング状態を判定
  const minQueryLength = isUserSearch ? MIN_USER_SEARCH_QUERY_LENGTH : MIN_REPO_SEARCH_QUERY_LENGTH;
  const currentQuery = isUserSearch ? userQuery : query;
  const currentDebouncedQuery = isUserSearch ? debouncedUserQuery : debouncedQuery;
  const currentIsLoading = isUserSearch ? isUserLoading : isRemoteLoading;

  const hasMinLength = currentQuery.length >= minQueryLength;
  const hasDebouncedMinLength = currentDebouncedQuery.length >= minQueryLength;

  const isLoading = currentIsLoading && hasDebouncedMinLength;
  const isDebouncing = currentQuery !== currentDebouncedQuery && hasMinLength;

  return {
    results,
    userResults: isUserSearch ? userResults : [],
    isUserSearch,
    isLoading,
    isDebouncing,
    error: isUserSearch ? userError : remoteError,
  };
}
