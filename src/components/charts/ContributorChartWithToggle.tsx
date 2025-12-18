"use client";

import { useState } from "react";
import { BarChart3, PieChart as PieChartIcon, GitCommit, Plus, Minus } from "lucide-react";
import type { ContributorStat, ContributorDetailStat } from "@/lib/github/types";
import ContributorsChart from "./ContributorsChart";
import ContributorPieChart, { MetricType } from "./ContributorPieChart";

type ChartType = "bar" | "pie";

interface Props {
  contributors: ContributorStat[];
  contributorDetails: ContributorDetailStat[];
}

export default function ContributorChartWithToggle({ contributors, contributorDetails }: Props) {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [metric, setMetric] = useState<MetricType>("commits");

  const hasDetailData = contributorDetails.length > 0;

  return (
    <div className="min-h-[340px]">
      {/* ヘッダー with トグル */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-pink-500 rounded-full"></span>
          Contributors
        </h2>

        <div className="flex items-center gap-2">
          {/* グラフタイプ切り替え */}
          <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setChartType("bar")}
              className={`p-1.5 rounded-md transition-all ${
                chartType === "bar"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              title="棒グラフ"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType("pie")}
              disabled={!hasDetailData}
              className={`p-1.5 rounded-md transition-all ${
                chartType === "pie"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              } ${!hasDetailData ? "opacity-40 cursor-not-allowed" : ""}`}
              title={hasDetailData ? "円グラフ" : "詳細データが必要です"}
            >
              <PieChartIcon className="w-4 h-4" />
            </button>
          </div>

          {/* 指標切り替え（円グラフのみ） */}
          {chartType === "pie" && hasDetailData && (
            <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setMetric("commits")}
                className={`flex items-center gap-1 px-2 py-1 text-sm rounded-md transition-all ${
                  metric === "commits"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                title="Commits"
              >
                <GitCommit className={`w-3.5 h-3.5 ${metric !== "commits" ? "text-purple-500" : ""}`} />
                <span className="hidden sm:inline">Commits</span>
              </button>
              <button
                onClick={() => setMetric("additions")}
                className={`flex items-center gap-1 px-2 py-1 text-sm rounded-md transition-all ${
                  metric === "additions"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                title="Additions"
              >
                <Plus className={`w-3.5 h-3.5 ${metric !== "additions" ? "text-green-500" : ""}`} />
                <span className="hidden sm:inline">Additions</span>
              </button>
              <button
                onClick={() => setMetric("deletions")}
                className={`flex items-center gap-1 px-2 py-1 text-sm rounded-md transition-all ${
                  metric === "deletions"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                title="Deletions"
              >
                <Minus className={`w-3.5 h-3.5 ${metric !== "deletions" ? "text-red-500" : ""}`} />
                <span className="hidden sm:inline">Deletions</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* グラフ本体 */}
      {chartType === "bar" ? (
        <ContributorsChart data={contributors} />
      ) : (
        <ContributorPieChart data={contributorDetails} metric={metric} />
      )}
    </div>
  );
}
