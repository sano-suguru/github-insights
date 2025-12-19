/**
 * OG画像生成用のEdge Runtime対応ユーティリティ
 * 
 * Edge RuntimeではNode.jsのAPIが使えないため、
 * api-server-utils.tsとは別に実装する必要がある
 */

/**
 * セカンダリレート制限対策: 順次実行ヘルパー（Edge Runtime用）
 * 
 * Promise.allの代わりに使用することで、短時間での大量リクエストを回避
 */
export async function sequentialFetchEdge<T>(
  tasks: (() => Promise<T>)[],
  delayMs = 100
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, delayMs));
    results.push(await tasks[i]());
  }
  return results;
}

/**
 * GitHub API用の共通HTTPヘッダー
 */
export const GITHUB_HEADERS: HeadersInit = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "GitHub-Insights",
};

/**
 * GitHub REST APIへのフェッチヘルパー
 */
export function createGitHubFetch(revalidate: number) {
  return async function gitHubFetch<T>(url: string): Promise<T | null> {
    const response = await fetch(url, {
      headers: GITHUB_HEADERS,
      next: { revalidate },
    });
    
    if (!response.ok) {
      return null;
    }
    
    return response.json();
  };
}
