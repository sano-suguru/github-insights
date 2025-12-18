/**
 * GitHub API エラー関連
 */

/**
 * GitHub API レート制限エラー
 */
export class GitHubRateLimitError extends Error {
  constructor(message = "GitHub API rate limit exceeded") {
    super(message);
    this.name = "GitHubRateLimitError";
  }
}

/**
 * レート制限エラーかどうかを判定
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof GitHubRateLimitError) {
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("rate limit") || message.includes("403");
  }
  return false;
}
