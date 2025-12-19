"use client";

import { useState, useCallback } from "react";
import { RECENT_REPOS_KEY, MAX_RECENT_REPOS } from "./constants";

/**
 * ローカルストレージから最近のリポジトリを取得
 */
function getRecentRepos(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_REPOS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * ローカルストレージに最近のリポジトリを保存
 */
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

/**
 * ローカルストレージから特定のリポジトリを削除
 */
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

/**
 * 最近のリポジトリを管理するカスタムフック
 */
export function useRecentRepos() {
  const [recentRepos, setRecentRepos] = useState<string[]>(() => getRecentRepos());

  const addRecentRepo = useCallback((repo: string) => {
    saveRecentRepo(repo);
    setRecentRepos(getRecentRepos());
  }, []);

  const removeRepo = useCallback((repo: string) => {
    removeRecentRepo(repo);
    setRecentRepos(getRecentRepos());
  }, []);

  const refresh = useCallback(() => {
    setRecentRepos(getRecentRepos());
  }, []);

  return {
    recentRepos,
    addRecentRepo,
    removeRepo,
    refresh,
  };
}
