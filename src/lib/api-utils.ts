import { unstable_cache } from "next/cache";

/**
 * API関連のユーティリティ関数
 */

/**
 * セカンダリレート制限対策: リクエスト間に遅延を入れて順次実行
 * Promise.allの代わりに使用することで、短時間での大量リクエストを回避
 * 
 * @param tasks - 実行する非同期関数の配列
 * @param delayMs - 各リクエスト間の遅延（ミリ秒）、デフォルト100ms
 * @returns 各タスクの結果の配列（Promise.allと同じ順序）
 */
export async function sequentialFetch<T extends readonly (() => Promise<unknown>)[]>(
  tasks: T,
  delayMs = 100
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const results: unknown[] = [];
  
  for (let i = 0; i < tasks.length; i++) {
    // 2番目以降のリクエストの前に遅延を入れる
    if (i > 0 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    results.push(await tasks[i]());
  }
  
  return results as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
}

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
  const additionalKey =
    additionalKeyParts.length > 0
      ? additionalKeyParts.map((part) => (part === null ? "null" : String(part))).join(":")
      : "";
  
  const cacheKey = [
    cacheKeyPrefix,
    owner,
    repo,
    ...(additionalKey ? [additionalKey] : []),
    isAuthenticated ? "auth" : "public",
  ].join(":");

  const cachedFetcher = unstable_cache(
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
      // タグはリポジトリ単位で設定（additionalKeyPartsは含めない）
      // これにより revalidateTag() でそのリポジトリの該当データ種別を一括無効化できる
      // 例: revalidateTag("commits:owner:repo") で全期間（7日/30日/90日）のコミットキャッシュを無効化
      tags: [`${cacheKeyPrefix}:${owner}:${repo}`],
    }
  );

  return cachedFetcher();
}
