"use client";

import { Building2, User, Users } from "lucide-react";
import type { UserSearchResult } from "@/hooks/useSearchRepositories";

export interface UserResultSectionProps {
  results: UserSearchResult[];
  onSelect: (username: string) => void;
}

/**
 * ユーザー検索結果セクションコンポーネント
 */
export function UserResultSection({ results, onSelect }: UserResultSectionProps) {
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
