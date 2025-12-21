"use client";

import type { CommitInfo } from "@/lib/github/types";
import BaseHeatmap from "./BaseHeatmap";
import { useMemo } from "react";

interface ActivityHeatmapProps {
  data: CommitInfo[];
}

/**
 * コミット履歴から曜日×時間帯のヒートマップを表示
 */
export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // CommitInfo[] → number[][] に変換
  const matrix = useMemo(() => {
    const result: number[][] = Array.from({ length: 7 }, () =>
      Array(24).fill(0)
    );

    data.forEach((commit) => {
      const date = new Date(commit.committedDate);
      const day = date.getDay();
      const hour = date.getHours();
      result[day][hour]++;
    });

    return result;
  }, [data]);

  return (
    <BaseHeatmap
      matrix={matrix}
      itemLabel="commits"
      emptyMessage="活動データがありません"
    />
  );
}

