"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { UserEvent } from "@/lib/github/types";
import { useMemo } from "react";

interface Props {
  events: UserEvent[];
}

// イベントタイプの日本語ラベルと色
const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  PushEvent: { label: "コミット", color: "#22c55e" },           // green-500
  PullRequestEvent: { label: "プルリクエスト", color: "#3b82f6" }, // blue-500
  IssuesEvent: { label: "Issue", color: "#f97316" },            // orange-500
  IssueCommentEvent: { label: "Issueコメント", color: "#eab308" }, // yellow-500
  PullRequestReviewEvent: { label: "PRレビュー", color: "#8b5cf6" }, // violet-500
  PullRequestReviewCommentEvent: { label: "PRコメント", color: "#a855f7" }, // purple-500
  CreateEvent: { label: "作成", color: "#06b6d4" },             // cyan-500
  DeleteEvent: { label: "削除", color: "#ef4444" },             // red-500
  ForkEvent: { label: "フォーク", color: "#14b8a6" },           // teal-500
  WatchEvent: { label: "スター", color: "#f59e0b" },            // amber-500
  ReleaseEvent: { label: "リリース", color: "#ec4899" },        // pink-500
  CommitCommentEvent: { label: "コミットコメント", color: "#84cc16" }, // lime-500
};

/**
 * ユーザーイベントタイプの分布を円グラフで表示
 */
export default function ContributionTypePie({ events }: Props) {
  const chartData = useMemo(() => {
    const typeCount: Record<string, number> = {};

    events.forEach((event) => {
      typeCount[event.type] = (typeCount[event.type] || 0) + 1;
    });

    const total = events.length;
    
    return Object.entries(typeCount)
      .map(([type, count]) => {
        const config = EVENT_TYPE_CONFIG[type] || { label: type, color: "#6b7280" };
        return {
          name: config.label,
          value: count,
          percentage: Math.round((count / total) * 100),
          color: config.color,
          type,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        活動データがありません
      </div>
    );
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={0}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
          >
            {chartData.map((entry) => (
              <Cell key={entry.type} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${value}件`, "アクティビティ"]}
            contentStyle={{
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              border: "none",
              borderRadius: "8px",
            }}
            itemStyle={{
              color: "#fff",
            }}
            labelStyle={{
              color: "#fff",
              fontWeight: "bold",
            }}
          />
          <Legend
            content={() => (
              <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                {chartData.slice(0, 6).map((item) => (
                  <li key={item.type} className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {item.name} <span className="text-gray-400">({item.percentage}%)</span>
                    </span>
                  </li>
                ))}
                {chartData.length > 6 && (
                  <li className="text-sm text-gray-400">+{chartData.length - 6}種類</li>
                )}
              </ul>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* 中央に総アクティビティ数を表示 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-10">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {events.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            アクティビティ
          </p>
        </div>
      </div>
    </div>
  );
}
