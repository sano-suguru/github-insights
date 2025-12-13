"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCommitHistory } from "@/lib/github";
import { useMemo, useCallback } from "react";

export type CommitInfo = Awaited<ReturnType<typeof getCommitHistory>>[number];

// キャッシュ戦略の閾値定数
const BASE_PERIOD_DAYS = 30;           // 短期間のベース（7日, 30日用）
const EXTENDED_PERIOD_DAYS = 365;      // 長期間のベース（90日, 365日用）
const EXTENDED_PERIOD_THRESHOLD = 90;  // この日数以上でEXTENDED_PERIOD_DAYSを使用

// 認証状態に応じたベース期間を決定
function getBaseDays(requestedDays: number | null, isAuthenticated: boolean): number | null {
  // 未認証は30日まで
  if (!isAuthenticated) {
    return BASE_PERIOD_DAYS;
  }
  // 認証済みで全期間リクエストならそのまま
  if (requestedDays === null) {
    return null;
  }
  // 認証済みでEXTENDED_PERIOD_DAYS以上リクエストなら全期間
  if (requestedDays > EXTENDED_PERIOD_DAYS) {
    return null;
  }
  // 認証済みでEXTENDED_PERIOD_THRESHOLD以上リクエストならEXTENDED_PERIOD_DAYS
  if (requestedDays > EXTENDED_PERIOD_THRESHOLD) {
    return EXTENDED_PERIOD_DAYS;
  }
  // それ以外はBASE_PERIOD_DAYSをベースに
  return BASE_PERIOD_DAYS;
}

// 日付でフィルタリング
function filterCommitsByDays(commits: CommitInfo[], days: number | null): CommitInfo[] {
  if (days === null) return commits;
  
  const msPerDay = 24 * 60 * 60 * 1000;
  const since = new Date(Date.now() - days * msPerDay);
  since.setHours(0, 0, 0, 0);
  
  return commits.filter(c => new Date(c.committedDate) >= since);
}

interface UseCommitHistoryParams {
  accessToken: string | null;
  owner: string;
  repo: string;
  days?: number | null;
  enabled?: boolean;
}

export function useCommitHistory({
  accessToken,
  owner,
  repo,
  days = 30,
  enabled = true,
}: UseCommitHistoryParams) {
  const isAuthenticated = !!accessToken;
  const baseDays = getBaseDays(days, isAuthenticated);
  
  // ベース期間でデータを取得
  const query = useQuery({
    queryKey: ["commitHistory", owner, repo, baseDays],
    queryFn: () => getCommitHistory(accessToken, owner, repo, { days: baseDays }),
    enabled: enabled && !!owner && !!repo,
    // ベース期間は長めにキャッシュ
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // 表示用にフィルタリング
  const filteredData = useMemo(() => {
    if (!query.data) return [];
    return filterCommitsByDays(query.data, days);
  }, [query.data, days]);

  return {
    ...query,
    data: filteredData,
  };
}

// プリフェッチ用フック
export function usePrefetchCommitHistory() {
  const queryClient = useQueryClient();
  
  const prefetch = useCallback(
    (
      accessToken: string | null,
      owner: string,
      repo: string,
      days: number | null
    ) => {
      const isAuthenticated = !!accessToken;
      const baseDays = getBaseDays(days, isAuthenticated);
      
      // 既にキャッシュにあればスキップ
      const cached = queryClient.getQueryData(["commitHistory", owner, repo, baseDays]);
      if (cached) return;
      
      queryClient.prefetchQuery({
        queryKey: ["commitHistory", owner, repo, baseDays],
        queryFn: () => getCommitHistory(accessToken, owner, repo, { days: baseDays }),
        staleTime: 10 * 60 * 1000,
      });
    },
    [queryClient]
  );
  
  return prefetch;
}
