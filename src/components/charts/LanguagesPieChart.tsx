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

  const chartData = data.map((lang, index) => ({
    name: lang.name,
    value: lang.percentage,
    color: getChartColor(lang.color, index),
  }));

  return (
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
          label={({ name, value }) => value >= 1 ? `${name} ${value}%` : ""}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${value}%`, "割合"]}
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
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
