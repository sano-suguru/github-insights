/**
 * ソーシャルメディアシェア用のユーティリティ
 */

/**
 * X (Twitter) シェアURLを生成
 */
export function generateTwitterShareUrl(params: {
  text: string;
  url: string;
  hashtags?: string[];
}): string {
  const searchParams = new URLSearchParams({
    text: params.text,
    url: params.url,
  });

  if (params.hashtags && params.hashtags.length > 0) {
    searchParams.set("hashtags", params.hashtags.join(","));
  }

  return `https://twitter.com/intent/tweet?${searchParams.toString()}`;
}

/**
 * クリップボードにコピー
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Copy failed:", error);
    return false;
  }
}

/**
 * リポジトリ貢献カード用のシェアテキスト生成
 */
export function generateRepoContributionShareText(params: {
  owner: string;
  repo: string;
  username: string;
  commits: number;
  rank: number;
}): string {
  return `${params.owner}/${params.repo} で ${params.commits} コミット、${params.rank}位になりました！ #GitHubInsights`;
}

/**
 * ユーザープロファイル用のシェアテキスト生成
 */
export function generateUserProfileShareText(params: {
  username: string;
}): string {
  return `@${params.username} の GitHub プロフィールカード #GitHubInsights`;
}

/**
 * Wrapped用のシェアテキスト生成
 */
export function generateWrappedShareText(params: {
  username: string;
  year: number;
  commits: number;
  stars: number;
}): string {
  return `${params.year}年の GitHub 活動：${params.commits} コミット、獲得スター ${params.stars} 🌟 #GitHubWrapped #GitHubInsights`;
}
