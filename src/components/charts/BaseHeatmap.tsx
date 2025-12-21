"use client";

import { getHeatmapColorClass } from "@/lib/colors";
import { useMemo } from "react";

/**
 * ヒートマップの定数
 */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_LABELS = HOURS.filter((h) => h % 3 === 0);
const HOUR_LABEL_MIN_WIDTH = `${100 / HOUR_LABELS.length}%`;

interface BaseHeatmapProps {
  /** 曜日×時間帯のマトリックス（7行×24列） */
  matrix: number[][];
  /** ツールチップに表示する単位（例: "commits", "アクティビティ"） */
  itemLabel: string;
  /** データが空の場合のメッセージ */
  emptyMessage?: string;
}

/**
 * 曜日×時間帯のヒートマップを描画する基底コンポーネント
 */
export default function BaseHeatmap({
  matrix,
  itemLabel,
  emptyMessage = "活動データがありません",
}: BaseHeatmapProps) {
  // 最大値を取得（色の濃さ計算用）
  const maxValue = useMemo(() => {
    return Math.max(...matrix.flat(), 1);
  }, [matrix]);

  // 値に応じた色を返す
  const getColor = (value: number) => getHeatmapColorClass(value, maxValue);

  // データが空かどうかを判定
  const isEmpty = matrix.flat().every((v) => v === 0);

  if (isEmpty) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-150">
        {/* 時間ラベル */}
        <div className="flex mb-1">
          <div className="w-8"></div>
          {HOUR_LABELS.map((hour) => (
            <div
              key={hour}
              className="flex-1 text-center text-xs text-gray-500 dark:text-gray-400"
              style={{ minWidth: HOUR_LABEL_MIN_WIDTH }}
            >
              {hour}:00
            </div>
          ))}
        </div>

        {/* ヒートマップグリッド */}
        {DAYS.map((day, dayIndex) => (
          <div key={day} className="flex items-center mb-1">
            <div className="w-8 text-xs text-gray-600 dark:text-gray-400">
              {day}
            </div>
            <div className="flex-1 flex gap-0.5">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className={`flex-1 h-6 rounded-sm ${getColor(
                    matrix[dayIndex][hour]
                  )} transition-colors cursor-default`}
                  title={`${day} ${hour}:00 - ${matrix[dayIndex][hour]} ${itemLabel}`}
                />
              ))}
            </div>
          </div>
        ))}

        {/* 凡例 */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <span className="text-xs text-gray-500 dark:text-gray-400">Less</span>
          <div className="flex gap-0.5">
            <div className="w-4 h-4 rounded-sm bg-gray-100 dark:bg-gray-700"></div>
            <div className="w-4 h-4 rounded-sm bg-purple-200 dark:bg-purple-900"></div>
            <div className="w-4 h-4 rounded-sm bg-purple-400 dark:bg-purple-700"></div>
            <div className="w-4 h-4 rounded-sm bg-purple-500 dark:bg-purple-600"></div>
            <div className="w-4 h-4 rounded-sm bg-purple-600 dark:bg-purple-500"></div>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">More</span>
        </div>
      </div>
    </div>
  );
}
