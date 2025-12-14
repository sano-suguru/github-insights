"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Clock, ChevronDown, X, Lock, Globe, Star, Loader2 } from "lucide-react";
import { Repository } from "@/lib/github";
import { useSearchRepositories, SearchResult } from "@/hooks/useSearchRepositories";

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

export default function RepoSearchCombobox({
  repositories = [],
  selectedRepo = "",
  onSelectRepo,
  variant = "default",
  placeholder = "リポジトリ名で検索、または owner/repo を入力...",
}: RepoSearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [recentRepos, setRecentRepos] = useState<string[]>(() => getRecentRepos());
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // useSearchRepositories フックを使用
  const { results, isLoading, isDebouncing } = useSearchRepositories(inputValue, {
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

  // リポジトリを選択
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

  // 入力値で検索/選択
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
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

      handleSelectRepo(trimmed);
    },
    [inputValue, handleSelectRepo]
  );

  // 入力値が既存リポジトリにマッチしない外部リポジトリか判定
  const isExternalRepoInput =
    inputValue.trim() &&
    /^[^/]+\/[^/]+$/.test(inputValue.trim()) &&
    !repositories.some(
      (r) => r.nameWithOwner.toLowerCase() === inputValue.trim().toLowerCase()
    );

  // 結果をソースごとにグループ化
  const userResults = results.filter((r) => r.source === "user");
  const historyResults = results.filter((r) => r.source === "history");
  const popularResults = results.filter((r) => r.source === "popular");
  const searchResults = results.filter((r) => r.source === "search");

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
                onClick={() => handleSelectRepo(inputValue.trim())}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/30 text-left"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Search className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {inputValue.trim()}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    外部リポジトリを分析
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* ローディング表示 */}
          {(isLoading || isDebouncing) && inputValue.length >= 2 && (
            <div className="p-3 flex items-center gap-2 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">検索中...</span>
            </div>
          )}

          {/* 自分のリポジトリ */}
          {userResults.length > 0 && (
            <ResultSection
              title="自分のリポジトリ"
              icon={<Globe className="w-3 h-3 inline mr-1" />}
              results={userResults}
              selectedRepo={selectedRepo}
              onSelect={handleSelectRepo}
              showDetails
            />
          )}

          {/* 最近分析したリポジトリ */}
          {historyResults.length > 0 && (
            <ResultSection
              title="最近の分析"
              icon={<Clock className="w-3 h-3 inline mr-1" />}
              results={historyResults}
              selectedRepo={selectedRepo}
              onSelect={handleSelectRepo}
            />
          )}

          {/* 人気リポジトリ */}
          {popularResults.length > 0 && (
            <ResultSection
              title={inputValue ? "人気のリポジトリ" : "おすすめ"}
              icon={<Star className="w-3 h-3 inline mr-1" />}
              results={popularResults}
              selectedRepo={selectedRepo}
              onSelect={handleSelectRepo}
            />
          )}

          {/* 検索結果 */}
          {searchResults.length > 0 && (
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
          {results.length === 0 && !isExternalRepoInput && !isLoading && !isDebouncing && (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                {inputValue ? (
                  <>
                    <p>一致するリポジトリがありません</p>
                    <p className="text-sm mt-1">
                      外部リポジトリを分析するには「owner/repo」形式で入力してください
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
}

function ResultSection({
  title,
  icon,
  results,
  selectedRepo,
  onSelect,
  showDetails = false,
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
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
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
            {result.source === "history" ? (
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
