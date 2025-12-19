/**
 * Route Handler 用の共通パラメータ型定義
 */

/**
 * ユーザー名を含むルートパラメータ
 * 使用: /api/github/user/[username]
 */
export interface UserRouteParams {
  params: Promise<{
    username: string;
  }>;
}

/**
 * ユーザー名と年を含むルートパラメータ
 * 使用: /api/github/user/[username]/wrapped/[year]
 */
export interface UserYearRouteParams {
  params: Promise<{
    username: string;
    year: string;
  }>;
}

/**
 * オーナーとリポジトリ名を含むルートパラメータ
 * 使用: /api/github/repo/[owner]/[repo]
 */
export interface RepoRouteParams {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}
