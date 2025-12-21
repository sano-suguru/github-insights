"use client";

import {
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { ContributorStat } from "@/lib/github/types";
import { getContributorColor } from "@/lib/colors";

interface ContributorsChartProps {
  data: ContributorStat[];
}

// Note: このコンポーネントは dynamic import (ssr: false) で使用されるため、
// クライアントサイドでのみレンダリングされる
export default function ContributorsChart({ data }: ContributorsChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        コントリビューターデータがありません
      </div>
    );
  }

  const chartData = data.slice(0, 8).map((contributor, index) => ({
    name: contributor.name || contributor.login,
    commits: contributor.commits,
    color: getContributorColor(index),
  }));

  return (
    <div className="h-70 min-h-70 w-full">
      <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={0}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis type="number" stroke="#9ca3af" fontSize={12} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#9ca3af"
            fontSize={12}
            width={100}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(0, 0, 0, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
            }}
            itemStyle={{
              color: "#fff",
            }}
            labelStyle={{
              color: "#fff",
              fontWeight: "bold",
              marginBottom: "4px",
            }}
            formatter={(value) => [value ?? 0, "Commits"]}
          />
          <Bar dataKey="commits" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
