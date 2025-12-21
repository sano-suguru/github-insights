"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ContributorDetailStat } from "@/lib/github/types";
import { formatNumber } from "@/lib/utils";
import { getContributorColor, CHART_TOOLTIP_STYLES } from "@/lib/colors";

// 「その他」カテゴリ用の識別子
const OTHERS_LOGIN = "__others__";

export type MetricType = "commits" | "additions" | "deletions";

interface ContributorPieChartProps {
  data: ContributorDetailStat[];
  metric: MetricType;
}

const metricLabels: Record<MetricType, string> = {
  commits: "Commits",
  additions: "Additions",
  deletions: "Deletions",
};

export default function ContributorPieChart({ data, metric }: ContributorPieChartProps) {
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
      login: contributor.login,
      name: contributor.name || contributor.login,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100 * 10) / 10 : 0,
    };
  });

  // その他の合計
  if (others.length > 0) {
    const othersValue = others.reduce((sum, c) => sum + getMetricValue(c), 0);
    rawData.push({
      login: OTHERS_LOGIN,
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
      color: item.login === OTHERS_LOGIN ? "#6b7280" : getContributorColor(index),
    }));

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
          >
            {chartData.map((entry) => (
              <Cell key={entry.login} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${(value ?? 0).toLocaleString()} (${chartData.find(d => d.name === name)?.percentage ?? 0}%)`,
              metricLabels[metric],
            ]}
            {...CHART_TOOLTIP_STYLES}
          />
          <Legend
            content={() => (
              <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                {chartData.map((item) => (
                  <li key={item.login} className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {item.name} <span className="text-gray-400">({item.percentage}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* 中央に合計値を表示 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: "70px" }}>
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
