"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { LanguageStat } from "@/lib/github/types";
import { getChartColor } from "@/lib/colors";

interface Props {
  data: LanguageStat[];
}

export default function LanguagesPieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        言語データがありません
      </div>
    );
  }

  // パーセンテージの高い順にソートしてから色を割り当て
  const chartData = [...data]
    .sort((a, b) => b.percentage - a.percentage)
    .map((lang, index) => ({
      name: lang.name,
      value: lang.percentage,
      color: getChartColor(lang.color, index),
    }));

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
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${value}%`, "割合"]}
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
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 mt-2 px-2">
                {chartData.slice(0, 6).map((item) => (
                  <li key={item.name} className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">
                      {item.name} <span className="text-gray-400">({item.value}%)</span>
                    </span>
                  </li>
                ))}
                {chartData.length > 6 && (
                  <li className="flex items-center gap-1.5 text-xs text-gray-400">
                    +{chartData.length - 6} more
                  </li>
                )}
              </ul>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* 中央に言語数を表示 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-10">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Languages
          </p>
        </div>
      </div>
    </div>
  );
}
