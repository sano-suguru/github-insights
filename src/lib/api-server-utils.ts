import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import type { ApiErrorCode } from "@/lib/api-error";

/**
 * API関連のユーティリティ関数（サーバー専用）
 */

/**
 * セカンダリレート制限対策: リクエスト間に遅延を入れて順次実行
 * Promise.allの代わりに使用することで、短時間での大量リクエストを回避
 */
export async function sequentialFetch<T extends readonly (() => Promise<unknown>)[]>(
  tasks: T,
  delayMs = 100
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const results: unknown[] = [];

  for (let i = 0; i < tasks.length; i++) {
    if (i > 0 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    results.push(await tasks[i]());
  }

  return results as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
}

/**
 * キャッシュ付きデータ取得のための共通ヘルパー
 *
 * 各Route Handlerで重複していたキャッシュロジックを統一
 */
export interface CachedFetchOptions<T> {
  fetcher: () => Promise<T>;
  cacheKeyPrefix: string;
  owner: string;
  repo: string;
  isAuthenticated: boolean;
  revalidate: number;
  additionalKeyParts?: (string | number | null)[];
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
      ? additionalKeyParts
          .map((part) => (part === null ? "null" : String(part)))
          .join(":")
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
      tags: [`${cacheKeyPrefix}:${owner}:${repo}`],
    }
  );

  return cachedFetcher();
}

export function createApiErrorResponse(
  status: number,
  code: ApiErrorCode,
  message: string
) {
  return NextResponse.json({ error: { code, message } }, { status });
}
