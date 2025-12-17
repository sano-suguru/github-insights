/**
 * 色調整ユーティリティ
 * GitHub言語色をアプリのダークテーマに合わせて調整
 * 
 * サイトテーマ: 紫〜ピンクのグラデーション
 * コントラストを確保しつつテーマに調和
 */

/**
 * サイトテーマに調和しつつ区別しやすいカラーパレット
 * 色相を均等に分散させ、視認性を確保
 */
const THEME_PALETTE = [
  "#a78bfa", // violet-400 (メイン)
  "#34d399", // emerald-400 (補色系)
  "#f472b6", // pink-400
  "#38bdf8", // sky-400
  "#fb923c", // orange-400
  "#a3e635", // lime-400
  "#f87171", // red-400
  "#22d3ee", // cyan-400
  "#fbbf24", // amber-400
  "#c084fc", // purple-400
];

/**
 * 言語チャート用の色を取得
 * テーマパレットから順番に割り当て
 */
export function getChartColor(_githubColor: string | null, index: number): string {
  return THEME_PALETTE[index % THEME_PALETTE.length];
}

/**
 * ヒートマップの強度に応じた色クラスを返す
 * ActivityHeatmap と UserActivityHeatmap で共通使用
 * 
 * @param value - セルの値
 * @param maxValue - 最大値（正規化用）
 * @returns Tailwind CSSクラス文字列
 */
export function getHeatmapColorClass(value: number, maxValue: number): string {
  if (value === 0 || maxValue === 0) return "bg-gray-100 dark:bg-gray-700";
  const intensity = value / maxValue;
  if (intensity < 0.25) return "bg-purple-200 dark:bg-purple-900";
  if (intensity < 0.5) return "bg-purple-400 dark:bg-purple-700";
  if (intensity < 0.75) return "bg-purple-500 dark:bg-purple-600";
  return "bg-purple-600 dark:bg-purple-500";
}
