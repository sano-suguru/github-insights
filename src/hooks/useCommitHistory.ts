"use client";

import { useQuery } from "@tanstack/react-query";
import { getCommitHistory, CommitHistoryOptions } from "@/lib/github";

export type CommitInfo = Awaited<ReturnType<typeof getCommitHistory>>[number];

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
  return useQuery({
    queryKey: ["commitHistory", owner, repo, days],
    queryFn: () => getCommitHistory(accessToken, owner, repo, { days }),
    enabled: enabled && !!owner && !!repo,
    // 期間が長いほどキャッシュを長く保持
    staleTime: days && days > 30 ? 10 * 60 * 1000 : 5 * 60 * 1000,
    // 期間切り替え時に前のデータを表示し続ける
    placeholderData: (previousData) => previousData,
  });
}
