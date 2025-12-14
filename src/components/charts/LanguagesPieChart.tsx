"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { LanguageStat } from "@/lib/github";
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
              <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                {chartData.map((item) => (
                  <li key={item.name} className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {item.name} <span className="text-gray-400">({item.value}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* 中央に言語数を表示 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: "40px" }}>
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
