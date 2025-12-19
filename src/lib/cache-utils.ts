/**
 * Publicレスポンス向けの Cache-Control を生成する。
 *
 * s-maxage / stale-while-revalidate の値は呼び出し側で明示指定する。
 */
export function buildPublicCacheControl(
  sMaxageSeconds: number,
  staleWhileRevalidateSeconds: number
): string {
  return `public, s-maxage=${sMaxageSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`;
}
