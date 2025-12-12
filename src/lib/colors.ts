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
