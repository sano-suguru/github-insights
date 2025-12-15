"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Clock, ChevronDown, X, Globe, Star, Loader2, User, Users, Building2 } from "lucide-react";
import { Repository } from "@/lib/github";
import { useSearchRepositories, SearchResult, UserSearchResult, MIN_USER_SEARCH_QUERY_LENGTH, MIN_REPO_SEARCH_QUERY_LENGTH } from "@/hooks/useSearchRepositories";

export type RepoSearchVariant = "default" | "compact" | "hero";

interface RepoSearchComboboxProps {
  repositories?: Repository[];
  selectedRepo?: string;
  onSelectRepo: (repo: string) => void;
  variant?: RepoSearchVariant;
  placeholder?: string;
}

const RECENT_REPOS_KEY = "github-insights-recent-repos";
const MAX_RECENT_REPOS = 5;

// ローカルストレージから最近のリポジトリを取得
function getRecentRepos(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_REPOS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// ローカルストレージに最近のリポジトリを保存
function saveRecentRepo(repo: string) {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentRepos().filter((r) => r !== repo);
    recent.unshift(repo);
    localStorage.setItem(
      RECENT_REPOS_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT_REPOS))
    );
  } catch {
    // ignore storage errors
  }
}

// ローカルストレージから特定のリポジトリを削除
function removeRecentRepo(repo: string) {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentRepos().filter(
      (r) => r.toLowerCase() !== repo.toLowerCase()
    );
    localStorage.setItem(RECENT_REPOS_KEY, JSON.stringify(recent));
  } catch {
    // ignore storage errors
  }
}

export default function RepoSearchCombobox({
  repositories = [],
  selectedRepo = "",
  onSelectRepo,
  variant = "default",
  placeholder = "リポジトリ名で検索、または @username でユーザー検索...",
}: RepoSearchComboboxProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [recentRepos, setRecentRepos] = useState<string[]>(() => getRecentRepos());
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // useSearchRepositories フックを使用
  const { results, userResults, isUserSearch, isLoading, isDebouncing } = useSearchRepositories(inputValue, {
    userRepositories: repositories,
    recentRepos,
    enabled: isOpen,
  });

  // 外側クリックでドロップダウンを閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // リポジトリの存在確認
  const validateRepository = useCallback(async (repo: string): Promise<boolean> => {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "GitHub-Insights",
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // リポジトリを選択（検索結果やpopularからの選択 - 既に存在確認済み）
  const handleSelectRepo = useCallback(
    (repo: string) => {
      onSelectRepo(repo);
      saveRecentRepo(repo);
      setRecentRepos(getRecentRepos());
      setInputValue("");
      setIsOpen(false);
      setError("");
    },
    [onSelectRepo]
  );

  // ユーザーを選択してプロファイルページに遷移
  const handleSelectUser = useCallback(
    (username: string) => {
      setInputValue("");
      setIsOpen(false);
      setError("");
      router.push(`/user/${username}`);
    },
    [router]
  );

  // 履歴からのリポジトリ選択（存在確認が必要）
  const handleSelectFromHistory = useCallback(
    async (repo: string) => {
      setIsValidating(true);
      setError("");
      
      const exists = await validateRepository(repo);
      setIsValidating(false);
      
      if (!exists) {
        // 存在しないリポジトリは履歴から削除
        removeRecentRepo(repo);
        setRecentRepos(getRecentRepos());
        setError(`「${repo}」は存在しないため履歴から削除しました`);
        return;
      }
      
      handleSelectRepo(repo);
    },
    [validateRepository, handleSelectRepo]
  );

  // 入力値で検索/選択（手動入力 - 存在確認が必要）
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setError("");

      const trimmed = inputValue.trim();
      if (!trimmed) return;

      // owner/repo形式かチェック
      const match = trimmed.match(/^([^/]+)\/([^/]+)$/);
      if (!match) {
        setError("「owner/repo」の形式で入力してください");
        return;
      }

      // ユーザーのリポジトリまたは検索結果に含まれていれば存在確認不要
      const isKnownRepo = results.some(
        (r) => r.nameWithOwner.toLowerCase() === trimmed.toLowerCase()
      );

      if (!isKnownRepo) {
        // 外部リポジトリの場合は存在確認
        setIsValidating(true);
        const exists = await validateRepository(trimmed);
        setIsValidating(false);

        if (!exists) {
          setError("リポジトリが見つかりません");
          return;
        }
      }

      handleSelectRepo(trimmed);
    },
    [inputValue, handleSelectRepo, results, validateRepository]
  );

  // 入力値が既存リポジトリにマッチしない外部リポジトリか判定
  const isExternalRepoInput =
    !isUserSearch &&
    inputValue.trim() &&
    /^[^/]+\/[^/]+$/.test(inputValue.trim()) &&
    !repositories.some(
      (r) => r.nameWithOwner.toLowerCase() === inputValue.trim().toLowerCase()
    );

  // 結果をソースごとにグループ化（リポジトリ検索用）
  const myRepoResults = results.filter((r) => r.source === "user");
  const historyResults = results.filter((r) => r.source === "history");
  const popularResults = results.filter((r) => r.source === "popular");
  const searchResults = results.filter((r) => r.source === "search");

  // ユーザー検索関連の表示条件
  // Note: inputValueは@を含むため、ユーザー検索時は +1 する
  const minInputLengthForUserSearch = MIN_USER_SEARCH_QUERY_LENGTH + 1; // @の分
  const shouldShowNoUserResults =
    isUserSearch && userResults.length === 0 && !isLoading && !isDebouncing && inputValue.length >= minInputLengthForUserSearch;
  const shouldShowUserSearchHint =
    isUserSearch && inputValue.length < minInputLengthForUserSearch && !isLoading && !isDebouncing;

  // variant に応じたスタイル
  const inputSizeClass = variant === "hero" 
    ? "py-4 text-lg" 
    : variant === "compact" 
    ? "py-2 text-sm" 
    : "py-3";

  return (
    <div ref={containerRef} className="relative">
      {/* 検索入力 */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError("");
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={`w-full pl-10 pr-20 ${inputSizeClass} rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {inputValue && (
              <button
                type="button"
                onClick={() => {
                  setInputValue("");
                  setError("");
                  inputRef.current?.focus();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ChevronDown
                className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{error}</p>}
      </form>

      {/* ドロップダウン */}
      {isOpen && (
        <div className="absolute z-100 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
          {/* 外部リポジトリ分析オプション */}
          {isExternalRepoInput && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isValidating}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/30 text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  {isValidating ? (
                    <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {inputValue.trim()}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    {isValidating ? "リポジトリを確認中..." : "外部リポジトリを分析"}
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* ローディング表示 */}
          {(isLoading || isDebouncing) && inputValue.length >= (isUserSearch ? minInputLengthForUserSearch : MIN_REPO_SEARCH_QUERY_LENGTH) && (
            <div className="p-3 flex items-center gap-2 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{isUserSearch ? "ユーザーを検索中..." : "検索中..."}</span>
            </div>
          )}

          {/* ユーザー検索結果 */}
          {isUserSearch && userResults.length > 0 && (
            <UserResultSection
              results={userResults}
              onSelect={handleSelectUser}
            />
          )}

          {/* ユーザー検索結果なし */}
          {shouldShowNoUserResults && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <p>一致するユーザーがありません</p>
              <p className="text-sm mt-1">
                ユーザー名で検索してください（例: @vercel）
              </p>
            </div>
          )}

          {/* ユーザー検索モードのヒント */}
          {shouldShowUserSearchHint && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-5 h-5" />
                <p className="font-medium">ユーザー検索モード</p>
              </div>
              <p className="text-sm">
                ユーザー名を入力して GitHub ユーザーを検索
              </p>
            </div>
          )}

          {/* 自分のリポジトリ */}
          {!isUserSearch && myRepoResults.length > 0 && (
            <ResultSection
              title="自分のリポジトリ"
              icon={<Globe className="w-3 h-3 inline mr-1" />}
              results={myRepoResults}
              selectedRepo={selectedRepo}
              onSelect={handleSelectRepo}
              showDetails
            />
          )}

          {/* 最近分析したリポジトリ */}
          {!isUserSearch && historyResults.length > 0 && (
            <ResultSection
              title="最近の分析"
              icon={<Clock className="w-3 h-3 inline mr-1" />}
              results={historyResults}
              selectedRepo={selectedRepo}
              onSelect={handleSelectFromHistory}
              isValidating={isValidating}
            />
          )}

          {/* 人気リポジトリ */}
          {!isUserSearch && popularResults.length > 0 && (
            <ResultSection
              title={inputValue ? "人気のリポジトリ" : "おすすめ"}
              icon={<Star className="w-3 h-3 inline mr-1" />}
              results={popularResults}
              selectedRepo={selectedRepo}
              onSelect={handleSelectRepo}
            />
          )}

          {/* 検索結果 */}
          {!isUserSearch && searchResults.length > 0 && (
            <ResultSection
              title="検索結果"
              icon={<Search className="w-3 h-3 inline mr-1" />}
              results={searchResults}
              selectedRepo={selectedRepo}
              onSelect={handleSelectRepo}
              showDetails
            />
          )}

          {/* 検索結果なし */}
          {!isUserSearch && results.length === 0 && !isExternalRepoInput && !isLoading && !isDebouncing && (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                {inputValue ? (
                  <>
                    <p>一致するリポジトリがありません</p>
                    <p className="text-sm mt-1">
                      外部リポジトリを分析するには「owner/repo」形式で入力してください
                    </p>
                    <p className="text-sm">
                      ユーザーを検索するには「@username」と入力してください
                    </p>
                  </>
                ) : (
                  <p>リポジトリがありません</p>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

// 結果セクションコンポーネント
interface ResultSectionProps {
  title: string;
  icon: React.ReactNode;
  results: SearchResult[];
  selectedRepo: string;
  onSelect: (repo: string) => void;
  showDetails?: boolean;
  isValidating?: boolean;
}

function ResultSection({
  title,
  icon,
  results,
  selectedRepo,
  onSelect,
  showDetails = false,
  isValidating = false,
}: ResultSectionProps) {
  return (
    <div className="p-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <p className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {icon}
        {title}
      </p>
      {results.map((result) => (
        <button
          key={result.nameWithOwner}
          type="button"
          onClick={() => onSelect(result.nameWithOwner)}
          disabled={isValidating}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedRepo === result.nameWithOwner
              ? "bg-purple-50 dark:bg-purple-900/30"
              : "hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          <div
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              selectedRepo === result.nameWithOwner
                ? "bg-purple-100 dark:bg-purple-900"
                : "bg-gray-100 dark:bg-gray-700"
            }`}
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
            ) : result.source === "history" ? (
              <Clock className="w-4 h-4 text-gray-500" />
            ) : result.source === "popular" ? (
              <Star className="w-4 h-4 text-yellow-500" />
            ) : result.source === "user" ? (
              <Globe className="w-4 h-4 text-gray-500" />
            ) : (
              <Search className="w-4 h-4 text-gray-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`font-medium truncate ${
                selectedRepo === result.nameWithOwner
                  ? "text-purple-700 dark:text-purple-300"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              {result.nameWithOwner}
            </p>
            {showDetails && result.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {result.description}
              </p>
            )}
            {showDetails && result.stargazerCount !== undefined && result.stargazerCount > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <Star className="w-3 h-3" />
                {result.stargazerCount.toLocaleString()}
                {result.primaryLanguage && (
                  <span className="ml-2 flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: result.primaryLanguage.color }}
                    />
                    {result.primaryLanguage.name}
                  </span>
                )}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ユーザー結果セクションコンポーネント
interface UserResultSectionProps {
  results: UserSearchResult[];
  onSelect: (username: string) => void;
}

function UserResultSection({ results, onSelect }: UserResultSectionProps) {
  return (
    <div className="p-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <p className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <Users className="w-3 h-3 inline mr-1" />
        ユーザー・組織
      </p>
      {results.map((user) => (
        <button
          key={user.login}
          type="button"
          onClick={() => onSelect(user.login)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.avatarUrl}
            alt={user.login}
            className="shrink-0 w-8 h-8 rounded-full"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {user.login}
              </p>
              {user.type === "Organization" ? (
                <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
              ) : (
                <User className="w-3 h-3 text-gray-400 shrink-0" />
              )}
            </div>
            {user.name && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.name}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
