import { isApiErrorResponseBody } from "@/lib/api-error";

/**
 * API関連のユーティリティ関数（クライアント共有）
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
      if (isApiErrorResponseBody(error)) {
        return error.error.message || fallback;
      }
      return (error as { error?: unknown }).error && typeof (error as { error?: unknown }).error === "string"
        ? ((error as { error: string }).error)
        : fallback;
    }
    // JSON以外の場合はステータステキストを使用
    return `${fallback} (${res.status} ${res.statusText})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

export function isRateLimitText(errorText: string): boolean {
  return /rate limit/i.test(errorText);
}

export function isRateLimitResponse(status: number, errorText: string): boolean {
  return status === 429 || isRateLimitText(errorText);
}
