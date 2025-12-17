import { describe, it, expect } from "vitest";
import { getChartColor, getHeatmapColorClass } from "../colors";

describe("getChartColor", () => {
  it("インデックス0でviolet-400を返す", () => {
    expect(getChartColor(null, 0)).toBe("#a78bfa");
  });

  it("インデックス1でemerald-400を返す", () => {
    expect(getChartColor(null, 1)).toBe("#34d399");
  });

  it("GitHubの色を無視してテーマパレットを使用", () => {
    // GitHubの言語色が渡されてもテーマパレットを使用
    expect(getChartColor("#3178c6", 0)).toBe("#a78bfa");
    expect(getChartColor("#f7df1e", 1)).toBe("#34d399");
  });

  it("インデックスがパレットサイズを超えた場合はループ", () => {
    // パレットは10色なのでindex 10は0と同じ
    expect(getChartColor(null, 10)).toBe("#a78bfa");
    expect(getChartColor(null, 11)).toBe("#34d399");
  });

  it("全てのパレット色が取得できる", () => {
    const expectedColors = [
      "#a78bfa", // violet-400
      "#34d399", // emerald-400
      "#f472b6", // pink-400
      "#38bdf8", // sky-400
      "#fb923c", // orange-400
      "#a3e635", // lime-400
      "#f87171", // red-400
      "#22d3ee", // cyan-400
      "#fbbf24", // amber-400
      "#c084fc", // purple-400
    ];

    expectedColors.forEach((color, index) => {
      expect(getChartColor(null, index)).toBe(color);
    });
  });
});

describe("getHeatmapColorClass", () => {
  it("value が 0 の場合はグレーを返す", () => {
    expect(getHeatmapColorClass(0, 100)).toBe("bg-gray-100 dark:bg-gray-700");
  });

  it("maxValue が 0 の場合はグレーを返す（ゼロ除算防止）", () => {
    expect(getHeatmapColorClass(5, 0)).toBe("bg-gray-100 dark:bg-gray-700");
    expect(getHeatmapColorClass(0, 0)).toBe("bg-gray-100 dark:bg-gray-700");
  });

  it("強度に応じた色クラスを返す", () => {
    // intensity < 0.25
    expect(getHeatmapColorClass(10, 100)).toBe("bg-purple-200 dark:bg-purple-900");
    // intensity < 0.5
    expect(getHeatmapColorClass(30, 100)).toBe("bg-purple-400 dark:bg-purple-700");
    // intensity < 0.75
    expect(getHeatmapColorClass(60, 100)).toBe("bg-purple-500 dark:bg-purple-600");
    // intensity >= 0.75
    expect(getHeatmapColorClass(80, 100)).toBe("bg-purple-600 dark:bg-purple-500");
  });

  it("maxValue と同じ値の場合は最高強度を返す", () => {
    expect(getHeatmapColorClass(100, 100)).toBe("bg-purple-600 dark:bg-purple-500");
  });
});
