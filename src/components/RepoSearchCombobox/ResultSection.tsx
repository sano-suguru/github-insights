"use client";

import { Clock, Globe, Loader2, Search, Star } from "lucide-react";
import type { SearchResult } from "@/hooks/useSearchRepositories";

export interface ResultSectionProps {
  title: string;
  icon: React.ReactNode;
  results: SearchResult[];
  selectedRepo: string;
  onSelect: (repo: string) => void;
  showDetails?: boolean;
  isValidating?: boolean;
}

/**
 * 検索結果セクションコンポーネント
 */
export function ResultSection({
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
