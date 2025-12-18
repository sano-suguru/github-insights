/**
 * GitHub API クライアント
 */

import { graphql } from "@octokit/graphql";
import type { RateLimitInfo } from "./types";
import { isRateLimitError } from "./errors";

// グローバルレート制限状態（未認証用）
let publicRateLimitInfo: RateLimitInfo | null = null;

/**
 * 未認証時のレート制限情報を取得
 */
export function getPublicRateLimitInfo(): RateLimitInfo | null {
  return publicRateLimitInfo;
}

/**
 * GitHub GraphQL API クライアントを作成（認証済み）
 */
export function createGitHubClient(accessToken: string) {
  return graphql.defaults({
    headers: {
      authorization: `token ${accessToken}`,
    },
  });
}

/**
 * GitHub GraphQL API クライアントを作成（未認証 - Public リポジトリ用）
 */
export function createPublicGitHubClient() {
  return graphql.defaults({});
}

/**
 * セカンダリレート制限対策: 指数バックオフ付きリトライラッパー
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // セカンダリレート制限エラーを検出
      const isSecondaryLimit =
        error instanceof Error &&
        (error.message.includes("secondary rate limit") ||
          error.message.includes("abuse detection") ||
          (error.message.includes("403") &&
            error.message.toLowerCase().includes("limit")));

      // 通常のレート制限またはセカンダリレート制限の場合はリトライ
      if ((isRateLimitError(error) || isSecondaryLimit) && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * baseDelay;
        console.warn(
          `Rate limited (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * レート制限を取得・更新
 */
export async function updateRateLimit(
  client: typeof graphql,
  isUnauthenticated: boolean
): Promise<RateLimitInfo | null> {
  try {
    const { rateLimit } = await client<{
      rateLimit: {
        limit: number;
        remaining: number;
        resetAt: string;
        used: number;
      };
    }>(`
      query {
        rateLimit {
          limit
          remaining
          resetAt
          used
        }
      }
    `);

    const info: RateLimitInfo = {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      resetAt: new Date(rateLimit.resetAt),
      used: rateLimit.used,
    };

    // 未認証の場合はグローバル状態を更新
    if (isUnauthenticated) {
      publicRateLimitInfo = info;
    }

    return info;
  } catch {
    return null;
  }
}
