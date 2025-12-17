import { unstable_cache } from "next/cache";

/**
 * API関連のユーティリティ関数
 */

/**
 * エラーレスポンスから安全にエラーメッセージを取得
 * 
 * Content-TypeがJSONの場合はパースしてerrorフィールドを取得、
 * それ以外の場合はステータスコードとテキストを使用
 */
export async function getErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const error = await res.json();
      return error.error || fallback;
    }
    // JSON以外の場合はステータステキストを使用
    return `${fallback} (${res.status} ${res.statusText})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

/**
 * キャッシュ付きデータ取得のための共通ヘルパー
 * 
 * 各Route Handlerで重複していたキャッシュロジックを統一
 */
export interface CachedFetchOptions<T> {
  /** データを取得する関数 */
  fetcher: () => Promise<T>;
  /** キャッシュキーのプレフィックス（例: "contributors", "languages"） */
  cacheKeyPrefix: string;
  /** リポジトリオーナー */
  owner: string;
  /** リポジトリ名 */
  repo: string;
  /** 認証済みかどうか */
  isAuthenticated: boolean;
  /** キャッシュ再検証時間（秒） */
  revalidate: number;
  /** 追加のキャッシュキー要素（オプション） */
  additionalKeyParts?: (string | number | null)[];
  /** デバッグ用のログメッセージ */
  debugLabel?: string;
}

export async function createCachedFetch<T>({
  fetcher,
  cacheKeyPrefix,
  owner,
  repo,
  isAuthenticated,
  revalidate,
  additionalKeyParts = [],
  debugLabel,
}: CachedFetchOptions<T>): Promise<T> {
  const additionalKey = additionalKeyParts
    .map((part) => (part === null ? "null" : String(part)))
    .join(":");
  
  const cacheKey = [
    cacheKeyPrefix,
    owner,
    repo,
    ...(additionalKey ? [additionalKey] : []),
    isAuthenticated ? "auth" : "public",
  ].join(":");

  const cachedFetch = unstable_cache(
    async () => {
      if (process.env.NODE_ENV === "development") {
        const label = debugLabel || cacheKeyPrefix;
        console.log(`[Cache MISS] Fetching ${label}: ${owner}/${repo}`);
      }
      return await fetcher();
    },
    [cacheKey],
    {
      revalidate,
      tags: [`${cacheKeyPrefix}:${owner}:${repo}`],
    }
  );

  return cachedFetch();
}
