"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Clock, ChevronDown, X, Lock, Globe } from "lucide-react";
import { Repository } from "@/lib/github";

interface RepoSearchComboboxProps {
  repositories: Repository[];
  selectedRepo: string;
  onSelectRepo: (repo: string) => void;
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
  repositories,
  selectedRepo,
  onSelectRepo,
}: RepoSearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [recentRepos, setRecentRepos] = useState<string[]>(() => getRecentRepos());
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // フィルタリングされたリポジトリ
  const filteredRepos = repositories.filter((repo) =>
    repo.nameWithOwner.toLowerCase().includes(inputValue.toLowerCase())
  );

  // フィルタリングされた最近のリポジトリ（自分のリポジトリと重複しないもの）
  const filteredRecent = recentRepos.filter(
    (repo) =>
      !repositories.some((r) => r.nameWithOwner === repo) &&
      repo.toLowerCase().includes(inputValue.toLowerCase())
  );

  // 入力値が既存リポジトリにマッチしない外部リポジトリか判定
  const isExternalRepoInput =
    inputValue.trim() &&
    /^[^/]+\/[^/]+$/.test(inputValue.trim()) &&
    !repositories.some(
      (r) => r.nameWithOwner.toLowerCase() === inputValue.trim().toLowerCase()
    );

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
            placeholder="リポジトリ名で検索、または owner/repo を入力..."
            className="w-full pl-10 pr-20 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
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

          {/* 最近分析したリポジトリ */}
          {filteredRecent.length > 0 && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <p className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <Clock className="w-3 h-3 inline mr-1" />
                最近の分析
              </p>
              {filteredRecent.map((repo) => (
                <button
                  key={repo}
                  type="button"
                  onClick={() => handleSelectRepo(repo)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                >
                  <div className="shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">{repo}</span>
                </button>
              ))}
            </div>
          )}

          {/* 自分のリポジトリ */}
          {filteredRepos.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                自分のリポジトリ
              </p>
              {filteredRepos.map((repo) => (
                <button
                  key={repo.id}
                  type="button"
                  onClick={() => handleSelectRepo(repo.nameWithOwner)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                    selectedRepo === repo.nameWithOwner
                      ? "bg-purple-50 dark:bg-purple-900/30"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      selectedRepo === repo.nameWithOwner
                        ? "bg-purple-100 dark:bg-purple-900"
                        : "bg-gray-100 dark:bg-gray-700"
                    }`}
                  >
                    {repo.isPrivate ? (
                      <Lock className="w-4 h-4 text-purple-500" />
                    ) : (
                      <Globe className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-medium truncate ${
                        selectedRepo === repo.nameWithOwner
                          ? "text-purple-700 dark:text-purple-300"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {repo.nameWithOwner}
                    </p>
                    {repo.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {repo.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 検索結果なし */}
          {filteredRepos.length === 0 &&
            filteredRecent.length === 0 &&
            !isExternalRepoInput && (
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
