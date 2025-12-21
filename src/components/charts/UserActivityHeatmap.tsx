"use client";

import type { EventsChartProps } from "@/types/chart";
import BaseHeatmap from "./BaseHeatmap";
import { useMemo } from "react";

/**
 * ユーザーイベントから曜日×時間帯のヒートマップを表示
 */
export default function UserActivityHeatmap({ events }: EventsChartProps) {
  // EventsChartProps → number[][] に変換
  const matrix = useMemo(() => {
    const result: number[][] = Array.from({ length: 7 }, () =>
      Array(24).fill(0)
    );

    events.forEach((event) => {
      const date = new Date(event.createdAt);
      const day = date.getDay();
      const hour = date.getHours();
      result[day][hour]++;
    });

    return result;
  }, [events]);

  return (
    <BaseHeatmap
      matrix={matrix}
      itemLabel="アクティビティ"
      emptyMessage="活動データがありません"
    />
  );
}
