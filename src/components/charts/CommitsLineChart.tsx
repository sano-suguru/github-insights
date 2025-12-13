"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { CommitInfo } from "@/lib/github";
import { useMemo } from "react";

interface Props {
  data: CommitInfo[];
  days?: number | null; // null = 全期間
}

export default function CommitsLineChart({ data, days = 30 }: Props) {
  // 日付ごとにコミット数を集計
  const chartData = useMemo(() => {
    // データが空の場合は空配列を返す
    if (data.length === 0) {
      return [];
    }

    // コミットの日付範囲を取得
    const commitDates = data.map((c) => new Date(c.committedDate).getTime());
    const minDate = Math.min(...commitDates);
    const maxDate = Math.max(...commitDates);
    
    // 期間を決定（最新コミット日を基準に）
    const latestCommitDate = new Date(maxDate);
    latestCommitDate.setHours(23, 59, 59, 999);
    
    let startDate: Date;
    if (days === null) {
      // 全期間: コミットの最古日付から
      startDate = new Date(minDate);
    } else {
      startDate = new Date(latestCommitDate);
      startDate.setDate(startDate.getDate() - days + 1);
    }
    startDate.setHours(0, 0, 0, 0);

    // 期間の日数を計算
    const totalDays = Math.ceil((latestCommitDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // 長期間の場合は週単位でグループ化
    const useWeekly = totalDays > 90;
    
    if (useWeekly) {
      // 週単位で集計
      const countsByWeek: Record<string, { count: number; startDate: Date }> = {};
      
      // 週の範囲を生成
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // 週の初め（日曜）
      
      while (weekStart <= latestCommitDate) {
        const weekKey = weekStart.toISOString().split("T")[0];
        countsByWeek[weekKey] = { count: 0, startDate: new Date(weekStart) };
        weekStart.setDate(weekStart.getDate() + 7);
      }
      
      // コミットを週ごとに集計
      data.forEach((commit) => {
        const commitDate = new Date(commit.committedDate);
        const weekStartOfCommit = new Date(commitDate);
        weekStartOfCommit.setDate(weekStartOfCommit.getDate() - weekStartOfCommit.getDay());
        weekStartOfCommit.setHours(0, 0, 0, 0);
        const weekKey = weekStartOfCommit.toISOString().split("T")[0];
        
        if (countsByWeek[weekKey]) {
          countsByWeek[weekKey].count++;
        }
      });
      
      return Object.entries(countsByWeek)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, { count, startDate }]) => ({
          date: startDate.toLocaleDateString("ja-JP", {
            month: "numeric",
            day: "numeric",
          }),
          commits: count,
        }));
    } else {
      // 日単位で集計
      const countsByDate: Record<string, number> = {};
      
      for (let i = 0; i < totalDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        countsByDate[dateStr] = 0;
      }
      
      // コミットを日付ごとに集計
      data.forEach((commit) => {
        const dateStr = new Date(commit.committedDate).toISOString().split("T")[0];
        if (countsByDate[dateStr] !== undefined) {
          countsByDate[dateStr]++;
        }
      });
      
      return Object.entries(countsByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({
          date: new Date(date).toLocaleDateString("ja-JP", {
            month: "numeric",
            day: "numeric",
          }),
          commits: count,
        }));
    }
  }, [data, days]);

  // データが空の場合は早期リターン
  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                No commit data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {/* メインのエリアグラデーション（シャープで控えめ） */}
          <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
          {/* ライン用のグラデーション */}
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          {/* 控えめなグロー効果 */}
          <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="#374151" 
          opacity={0.2}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={35}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(168, 85, 247, 0.2)",
            borderRadius: "8px",
          }}
          itemStyle={{ color: "#fff" }}
          labelStyle={{ color: "#c4b5fd", fontSize: "12px", fontWeight: 500 }}
          formatter={(value: number) => [value, "Commits"]}
          cursor={{ stroke: "rgba(168, 85, 247, 0.3)", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="commits"
          stroke="url(#lineGradient)"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorCommits)"
          dot={false}
          filter="url(#softGlow)"
          activeDot={{
            r: 4,
            fill: "#a855f7",
            stroke: "#fff",
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
