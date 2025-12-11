"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ContributorDetailStat } from "@/lib/github";

const COLORS = [
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#84cc16", // lime
];

export type MetricType = "commits" | "additions" | "deletions";

interface Props {
  data: ContributorDetailStat[];
  metric: MetricType;
}

const metricLabels: Record<MetricType, string> = {
  commits: "Commits",
  additions: "Additions",
  deletions: "Deletions",
};

// 大きな数値のフォーマット
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toLocaleString();
}

export default function ContributorPieChart({ data, metric }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        コントリビューターデータがありません
      </div>
    );
  }

  // 上位7名 + その他でグループ化
  const top7 = data.slice(0, 7);
  const others = data.slice(7);

  const getMetricValue = (contributor: ContributorDetailStat): number => {
    switch (metric) {
      case "commits":
        return contributor.commits;
      case "additions":
        return contributor.additions;
      case "deletions":
        return contributor.deletions;
    }
  };

  const total = data.reduce((sum, c) => sum + getMetricValue(c), 0);

  // まずデータを作成（色なし）
  const rawData = top7.map((contributor) => {
    const value = getMetricValue(contributor);
    return {
      name: contributor.name || contributor.login,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100 * 10) / 10 : 0,
    };
  });

  // その他の合計
  if (others.length > 0) {
    const othersValue = others.reduce((sum, c) => sum + getMetricValue(c), 0);
    rawData.push({
      name: `その他 (${others.length}名)`,
      value: othersValue,
      percentage: total > 0 ? Math.round((othersValue / total) * 100 * 10) / 10 : 0,
    });
  }

  // パーセンテージの高い順にソートしてから色を割り当て
  const chartData = rawData
    .sort((a, b) => b.percentage - a.percentage)
    .map((item, index) => ({
      ...item,
      color: item.name.startsWith("その他") ? "#6b7280" : COLORS[index % COLORS.length],
    }));

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
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
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value.toLocaleString()} (${chartData.find(d => d.name === name)?.percentage}%)`,
              metricLabels[metric],
            ]}
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
            }}
          />
          <Legend
            formatter={(value) => {
              const item = chartData.find(d => d.name === value);
              return (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {value} <span className="text-gray-400">({item?.percentage}%)</span>
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* 中央に合計値を表示 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: "40px" }}>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(total)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {metricLabels[metric]}
          </p>
        </div>
      </div>
    </div>
  );
}
