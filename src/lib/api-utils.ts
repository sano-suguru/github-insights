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
