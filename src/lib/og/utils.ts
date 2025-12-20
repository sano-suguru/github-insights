/**
 * OG画像生成用のユーティリティ関数
 */

/**
 * 数値を人間が読みやすい形式にフォーマット
 * 
 * @example
 * formatNumber(1234) // "1.2k"
 * formatNumber(1234567) // "1.2M"
 * formatNumber(123) // "123"
 */
export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

/**
 * 数値を人間が読みやすい形式にフォーマット（大文字K版）
 * Wrapped カード用
 */
export function formatNumberUppercase(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
