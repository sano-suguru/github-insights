import { graphql } from "@octokit/graphql";
import { SERVER_CACHE } from "./cache-config";

// カスタムエラークラス
export class GitHubRateLimitError extends Error {
  constructor(message = "GitHub API rate limit exceeded") {
    super(message);
    this.name = "GitHubRateLimitError";
  }
}

// レート制限エラーかどうかを判定するヘルパー関数
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

// GitHubアカウントタイプをバリデーション付きで取得
export type GitHubAccountType = "User" | "Organization";
export function parseAccountType(type: unknown): GitHubAccountType {
  if (type === "User" || type === "Organization") {
    return type;
  }
  // 未知のタイプはデフォルトで "User" として扱う
  return "User";
}

// レート制限情報
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
  used: number;
}

// グローバルレート制限状態（未認証用）
let publicRateLimitInfo: RateLimitInfo | null = null;

export function getPublicRateLimitInfo(): RateLimitInfo | null {
  return publicRateLimitInfo;
}

// GitHub GraphQL API クライアントを作成（認証済み）
export function createGitHubClient(accessToken: string) {
  return graphql.defaults({
    headers: {
      authorization: `token ${accessToken}`,
    },
  });
}

// GitHub GraphQL API クライアントを作成（未認証 - Publicリポジトリ用）
export function createPublicGitHubClient() {
  return graphql.defaults({});
}

// レート制限を取得・更新
async function updateRateLimit(client: typeof graphql, isUnauthenticated: boolean) {
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
    
    // 未認証の場合はグローバル状態を更新（後方互換性のため）
    if (isUnauthenticated) {
      publicRateLimitInfo = info;
    }
    
    return info;
  } catch {
    return null;
  }
}

// 特定のPublicリポジトリ情報を取得
export async function getPublicRepository(owner: string, repo: string) {
  const client = createPublicGitHubClient();
  
  const { repository } = await client<{
    repository: {
      id: string;
      name: string;
      nameWithOwner: string;
      description: string | null;
      url: string;
      isPrivate: boolean;
      primaryLanguage: { name: string; color: string } | null;
      updatedAt: string;
      stargazerCount: number;
      forkCount: number;
    } | null;
  }>(`
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        id
        name
        nameWithOwner
        description
        url
        isPrivate
        primaryLanguage {
          name
          color
        }
        updatedAt
        stargazerCount
        forkCount
      }
    }
  `, { owner, repo });
  
  // レート制限を更新
  await updateRateLimit(client, true);
  
  if (!repository) {
    throw new Error("Repository not found");
  }
  
  if (repository.isPrivate) {
    throw new Error("This is a private repository. Please login to access.");
  }
  
  return repository as Repository;
}

// 公開リポジトリを検索（未認証対応）
export interface SearchRepositoryResult {
  nameWithOwner: string;
  description: string | null;
  stargazerCount: number;
  primaryLanguage: { name: string; color: string } | null;
}

export interface SearchRepositoriesResult {
  repositories: SearchRepositoryResult[];
  rateLimit: RateLimitInfo | null;
}

export async function searchRepositories(
  accessToken: string | null,
  query: string,
  first: number = 10
): Promise<SearchRepositoriesResult> {
  if (!query || query.length < 2) {
    return { repositories: [], rateLimit: null };
  }

  const client = accessToken
    ? createGitHubClient(accessToken)
    : createPublicGitHubClient();
  const isUnauthenticated = !accessToken;

  try {
    const { search } = await client<{
      search: {
        repositoryCount: number;
        nodes: Array<{
          nameWithOwner: string;
          description: string | null;
          isPrivate: boolean;
          primaryLanguage: { name: string; color: string } | null;
          stargazerCount: number;
        }>;
      };
    }>(`
      query($query: String!, $first: Int!) {
        search(query: $query, type: REPOSITORY, first: $first) {
          repositoryCount
          nodes {
            ... on Repository {
              nameWithOwner
              description
              isPrivate
              primaryLanguage {
                name
                color
              }
              stargazerCount
            }
          }
        }
      }
    `, { query: `${query} in:name`, first });

    // レート制限を更新
    const rateLimit = await updateRateLimit(client, isUnauthenticated);

    // Publicリポジトリのみ返す（nullノードを除外）
    const repositories = search.nodes
      .filter((node): node is NonNullable<typeof node> => 
        node !== null && node.nameWithOwner !== undefined && !node.isPrivate
      )
      .map(({ nameWithOwner, description, stargazerCount, primaryLanguage }) => ({
        nameWithOwner,
        description,
        stargazerCount,
        primaryLanguage,
      }));

    return { repositories, rateLimit };
  } catch (error) {
    console.error("Search repositories error:", error);
    // GraphQL APIのレート制限エラーを変換
    if (isRateLimitError(error)) {
      throw new GitHubRateLimitError();
    }
    throw error;
  }
}

// ユーザー検索結果の型
export interface SearchUserResult {
  login: string;
  avatarUrl: string;
  name: string | null;
  followers: number;
  publicRepos: number;
  type: "User" | "Organization";
}

// ユーザープロファイルの詳細型
export interface UserProfile {
  login: string;
  avatarUrl: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  twitterUsername: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  publicGists: number;
  createdAt: string;
  type: "User" | "Organization";
}

// ユーザーの公開リポジトリ型
export interface UserRepository {
  name: string;
  nameWithOwner: string;
  description: string | null;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string; color: string } | null;
  updatedAt: string;
  isArchived: boolean;
  isFork: boolean;
}

// ユーザープロファイル統計型
export interface UserStats {
  totalStars: number;
  totalForks: number;
  totalRepos: number;
  languageBreakdown: { name: string; color: string; count: number; percentage: number }[];
  topRepositories: UserRepository[];
}

// ユーザープロファイルを取得（GitHub REST API使用）
export async function getUserProfile(
  username: string,
  accessToken?: string | null
): Promise<UserProfile | null> {
  try {
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GitHub-Insights",
    };
    
    // トークンがあれば認証ヘッダーを追加
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}`,
      {
        headers,
        next: { revalidate: SERVER_CACHE.USER_PROFILE_REVALIDATE },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      if (response.status === 403 || response.status === 429) {
        throw new GitHubRateLimitError();
      }
      throw new Error(`Get user profile failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      login: data.login,
      avatarUrl: data.avatar_url,
      name: data.name || null,
      bio: data.bio || null,
      company: data.company || null,
      location: data.location || null,
      blog: data.blog || null,
      twitterUsername: data.twitter_username || null,
      followers: data.followers || 0,
      following: data.following || 0,
      publicRepos: data.public_repos || 0,
      publicGists: data.public_gists || 0,
      createdAt: data.created_at,
      type: parseAccountType(data.type),
    };
  } catch (error) {
    console.error("Get user profile error:", error);
    throw error;
  }
}

// ユーザーの公開リポジトリを取得（GraphQL API使用）
export async function getUserRepositories(
  username: string,
  accessToken?: string | null
): Promise<UserRepository[]> {
  // トークンがあれば認証済み、なければ未認証クライアント
  const client = accessToken
    ? createGitHubClient(accessToken)
    : createPublicGitHubClient();

  try {
    const { user } = await client<{
      user: {
        repositories: {
          nodes: {
            name: string;
            nameWithOwner: string;
            description: string | null;
            stargazerCount: number;
            forkCount: number;
            primaryLanguage: { name: string; color: string } | null;
            updatedAt: string;
            isArchived: boolean;
            isFork: boolean;
          }[];
        };
      } | null;
    }>(`
      query($username: String!) {
        user(login: $username) {
          repositories(
            first: 100
            privacy: PUBLIC
            orderBy: { field: STARGAZERS, direction: DESC }
            ownerAffiliations: [OWNER]
          ) {
            nodes {
              name
              nameWithOwner
              description
              stargazerCount
              forkCount
              primaryLanguage {
                name
                color
              }
              updatedAt
              isArchived
              isFork
            }
          }
        }
      }
    `, { username });

    if (!user) {
      return [];
    }

    return user.repositories.nodes.map((repo) => ({
      name: repo.name,
      nameWithOwner: repo.nameWithOwner,
      description: repo.description,
      stargazerCount: repo.stargazerCount,
      forkCount: repo.forkCount,
      primaryLanguage: repo.primaryLanguage,
      updatedAt: repo.updatedAt,
      isArchived: repo.isArchived,
      isFork: repo.isFork,
    }));
  } catch (error) {
    console.error("Get user repositories error:", error);
    // GraphQL APIのレート制限エラーを変換
    if (isRateLimitError(error)) {
      throw new GitHubRateLimitError();
    }
    throw error;
  }
}

// ユーザー統計を計算
export function calculateUserStats(repositories: UserRepository[]): UserStats {
  const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazerCount, 0);
  const totalForks = repositories.reduce((sum, repo) => sum + repo.forkCount, 0);
  const totalRepos = repositories.length;

  // 言語の統計を計算
  const languageMap: Record<string, { color: string; count: number }> = {};
  repositories.forEach((repo) => {
    if (repo.primaryLanguage) {
      const { name, color } = repo.primaryLanguage;
      if (!languageMap[name]) {
        languageMap[name] = { color, count: 0 };
      }
      languageMap[name].count += 1;
    }
  });

  const languageBreakdown = Object.entries(languageMap)
    .map(([name, { color, count }]) => ({
      name,
      color,
      count,
      percentage: totalRepos > 0 ? Math.round((count / totalRepos) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // トップリポジトリ（スター数順上位10件）
  const topRepositories = repositories
    .filter((repo) => !repo.isFork && !repo.isArchived)
    .slice(0, 10);

  return {
    totalStars,
    totalForks,
    totalRepos,
    languageBreakdown,
    topRepositories,
  };
}

// ユーザーを検索（GitHub REST API使用）
// Note: レート制限を考慮し、Search APIの結果のみを使用（詳細はユーザーページで取得）
export interface SearchUsersResult {
  users: SearchUserResult[];
  rateLimit: RateLimitInfo | null;
}

export async function searchUsers(
  accessToken: string | null,
  query: string,
  perPage: number = 5
): Promise<SearchUsersResult> {
  if (!query || query.length < 1) {
    return { users: [], rateLimit: null };
  }

  try {
    // Search API でユーザーを検索（1リクエストのみ）
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GitHub-Insights",
    };
    
    if (accessToken) {
      headers.Authorization = `token ${accessToken}`;
    }

    const searchResponse = await fetch(
      `https://api.github.com/search/users?q=${encodeURIComponent(query)}&per_page=${perPage}`,
      {
        headers,
        next: { revalidate: SERVER_CACHE.USER_SEARCH_REVALIDATE },
      }
    );

    if (!searchResponse.ok) {
      if (searchResponse.status === 403 || searchResponse.status === 429) {
        throw new GitHubRateLimitError();
      }
      throw new Error(`Search users failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const users = searchData.items || [];

    // レート制限情報をヘッダーから取得
    const rateLimitInfo: RateLimitInfo | null = (() => {
      const limit = searchResponse.headers.get("x-ratelimit-limit");
      const remaining = searchResponse.headers.get("x-ratelimit-remaining");
      const reset = searchResponse.headers.get("x-ratelimit-reset");
      const used = searchResponse.headers.get("x-ratelimit-used");
      
      if (limit && remaining && reset) {
        return {
          limit: parseInt(limit, 10),
          remaining: parseInt(remaining, 10),
          resetAt: new Date(parseInt(reset, 10) * 1000),
          used: used ? parseInt(used, 10) : 0,
        };
      }
      return null;
    })();

    // Search APIの結果のみを使用（詳細取得による追加APIコールを省略）
    // followers/publicReposは検索結果には含まれないため0を設定
    // 詳細情報はユーザーページ(/user/[username])で表示される
    const userResults = users.map((user: { login: string; avatar_url: string; type: string }) => ({
      login: user.login,
      avatarUrl: user.avatar_url,
      name: null,
      followers: 0,
      publicRepos: 0,
      type: parseAccountType(user.type),
    }));

    return { users: userResults, rateLimit: rateLimitInfo };
  } catch (error) {
    console.error("Search users error:", error);
    throw error;
  }
}

// ユーザーイベント型（GitHub Events API）
export interface UserEvent {
  id: string;
  type: string;
  createdAt: string;
  repo: {
    name: string;
  };
}

// GitHub Events APIのレスポンス型
interface GitHubEventResponse {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
}

// ユーザーイベントを取得（GitHub REST API使用）
// 直近90日程度のイベントを取得（最大300件、GitHub APIの制限により最新100件×3ページ）
export async function getUserEvents(
  username: string,
  accessToken?: string | null
): Promise<UserEvent[]> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "GitHub-Insights",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const allEvents: UserEvent[] = [];
  
  try {
    // 最大3ページ（300件）まで取得
    for (let page = 1; page <= 3; page++) {
      const response = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=100&page=${page}`,
        {
          headers,
          next: { revalidate: SERVER_CACHE.USER_EVENTS_REVALIDATE },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        if (response.status === 403 || response.status === 429) {
          throw new GitHubRateLimitError();
        }
        throw new Error(`Get user events failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        break; // データがなければ終了
      }

      const events: UserEvent[] = data.map((event: GitHubEventResponse) => ({
        id: event.id,
        type: event.type,
        createdAt: event.created_at,
        repo: {
          name: event.repo.name,
        },
      }));

      allEvents.push(...events);

      // 取得したデータが100件未満ならこれ以上ページはない
      if (data.length < 100) {
        break;
      }
    }

    return allEvents;
  } catch (error) {
    console.error("Get user events error:", error);
    throw error;
  }
}

// リポジトリ一覧を取得
export async function getRepositories(accessToken: string) {
  const client = createGitHubClient(accessToken);

  const { viewer } = await client<{
    viewer: {
      repositories: {
        nodes: Repository[];
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    };
  }>(`
    query {
      viewer {
        repositories(first: 100, orderBy: { field: UPDATED_AT, direction: DESC }) {
          nodes {
            id
            name
            nameWithOwner
            description
            url
            isPrivate
            primaryLanguage {
              name
              color
            }
            updatedAt
            stargazerCount
            forkCount
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `);

  return viewer.repositories.nodes;
}

// リポジトリの言語統計を取得（認証/未認証両対応）
export async function getLanguageStats(
  accessToken: string | null,
  owner: string,
  repo: string
) {
  const client = accessToken ? createGitHubClient(accessToken) : createPublicGitHubClient();

  const { repository } = await client<{
    repository: {
      languages: {
        edges: Array<{
          size: number;
          node: { name: string; color: string };
        }>;
        totalSize: number;
      };
    };
  }>(`
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges {
            size
            node {
              name
              color
            }
          }
          totalSize
        }
      }
    }
  `, { owner, repo });

  const totalSize = repository.languages.totalSize;
  return repository.languages.edges.map((edge) => ({
    name: edge.node.name,
    color: edge.node.color,
    size: edge.size,
    percentage: Math.round((edge.size / totalSize) * 100 * 10) / 10,
  }));
}

// コミット履歴を取得（期間選択・ページネーション対応）（認証/未認証両対応）
export interface CommitHistoryOptions {
  days?: number | null;  // null = 全期間
  maxCommits?: number;   // 最大取得件数
}

// コミット履歴APIレスポンス型
interface CommitHistoryResponse {
  repository: {
    defaultBranchRef: {
      target: {
        history: {
          pageInfo: {
            hasNextPage: boolean;
            endCursor: string | null;
          };
          nodes: Array<{
            committedDate: string;
            author: { name: string; user: { login: string } | null };
            additions: number;
            deletions: number;
            message: string;
          }>;
        };
      };
    } | null;
  };
}

export async function getCommitHistory(
  accessToken: string | null,
  owner: string,
  repo: string,
  options: CommitHistoryOptions = {}
) {
  const { days = 30 } = options;
  const client = accessToken ? createGitHubClient(accessToken) : createPublicGitHubClient();
  
  // 期間に応じたmaxCommits調整（認証/未認証で分ける）
  const maxCommits = accessToken
    ? (days === null ? 3000 : days <= 7 ? 500 : days <= 30 ? 2000 : days <= 365 ? 3000 : 5000)
    : (days === null ? 300 : days <= 7 ? 200 : 300);  // 未認証は控えめに
  
  // 期間計算（nullの場合は全期間 = sinceなし）
  let since: string | null = null;
  if (days !== null) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    since = sinceDate.toISOString();
  }

  const allCommits: Array<{
    committedDate: string;
    author: { name: string; user: { login: string } | null };
    additions: number;
    deletions: number;
    message: string;
  }> = [];
  
  let cursor: string | null = null;
  let hasNextPage = true;

  const query = `
    query($owner: String!, $repo: String!, $first: Int!, $after: String, $since: GitTimestamp) {
      repository(owner: $owner, name: $repo) {
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: $first, after: $after, since: $since) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  committedDate
                  author {
                    name
                    user {
                      login
                    }
                  }
                  additions
                  deletions
                  message
                }
              }
            }
          }
        }
      }
    }
  `;

  // ページネーションループ
  let requestCount = 0;
  while (hasNextPage && allCommits.length < maxCommits) {
    const batchSize = Math.min(100, maxCommits - allCommits.length);

    // セカンダリレート制限を回避するため、2回目以降は少し待つ
    if (requestCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    let response: CommitHistoryResponse;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        response = await client(query, {
          owner,
          repo,
          first: batchSize,
          after: cursor,
          since,
        });
        break;
      } catch (error: unknown) {
        if (isRateLimitError(error) && retries < maxRetries - 1) {
          // 指数バックオフでリトライ（1秒、2秒、4秒）
          const delay = Math.pow(2, retries) * 1000;
          console.warn(`Rate limited, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
        } else {
          throw error;
        }
      }
    }

    const history = response!.repository.defaultBranchRef?.target?.history;
    if (!history) break;

    allCommits.push(...history.nodes);
    hasNextPage = history.pageInfo.hasNextPage;
    cursor = history.pageInfo.endCursor;
    requestCount++;
  }

  return allCommits;
}

// コントリビューター統計を取得（認証/未認証両対応）
export async function getContributorStats(
  accessToken: string | null,
  owner: string,
  repo: string
) {
  const client = accessToken ? createGitHubClient(accessToken) : createPublicGitHubClient();

  const { repository } = await client<{
    repository: {
      mentionableUsers: {
        nodes: Array<{
          login: string;
          avatarUrl: string;
          name: string | null;
        }>;
      };
      defaultBranchRef: {
        target: {
          history: {
            nodes: Array<{
              author: {
                user: { login: string } | null;
              };
            }>;
          };
        };
      } | null;
    };
  }>(`
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        mentionableUsers(first: 20) {
          nodes {
            login
            avatarUrl
            name
          }
        }
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 100) {
                nodes {
                  author {
                    user {
                      login
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `, { owner, repo });

  // コミット数でコントリビューターを集計
  const commits = repository.defaultBranchRef?.target?.history?.nodes || [];
  const commitCounts: Record<string, number> = {};

  commits.forEach((commit) => {
    const login = commit.author?.user?.login || "Unknown";
    commitCounts[login] = (commitCounts[login] || 0) + 1;
  });

  const users = repository.mentionableUsers.nodes;
  return Object.entries(commitCounts)
    .map(([login, commits]) => {
      const user = users.find((u) => u.login === login);
      return {
        login,
        name: user?.name || login,
        avatarUrl: user?.avatarUrl || "",
        commits,
      };
    })
    .sort((a, b) => b.commits - a.commits);
}

// リポジトリの基本統計を取得（認証/未認証両対応）
export async function getRepositoryStats(
  accessToken: string | null,
  owner: string,
  repo: string
) {
  const client = accessToken ? createGitHubClient(accessToken) : createPublicGitHubClient();

  const { repository } = await client<{
    repository: {
      name: string;
      description: string | null;
      stargazerCount: number;
      forkCount: number;
      watchers: { totalCount: number };
      issues: { totalCount: number };
      pullRequests: { totalCount: number };
      defaultBranchRef: {
        target: {
          history: { totalCount: number };
        };
      } | null;
    };
  }>(`
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        name
        description
        stargazerCount
        forkCount
        watchers {
          totalCount
        }
        issues {
          totalCount
        }
        pullRequests {
          totalCount
        }
        defaultBranchRef {
          target {
            ... on Commit {
              history {
                totalCount
              }
            }
          }
        }
      }
    }
  `, { owner, repo });

  return {
    name: repository.name,
    description: repository.description,
    stars: repository.stargazerCount,
    forks: repository.forkCount,
    watchers: repository.watchers.totalCount,
    issues: repository.issues.totalCount,
    pullRequests: repository.pullRequests.totalCount,
    commits: repository.defaultBranchRef?.target?.history?.totalCount || 0,
  };
}

// 型定義
export interface Repository {
  id: string;
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  isPrivate: boolean;
  primaryLanguage: {
    name: string;
    color: string;
  } | null;
  updatedAt: string;
  stargazerCount: number;
  forkCount: number;
}

export interface LanguageStat {
  name: string;
  color: string;
  size: number;
  percentage: number;
}

export interface CommitInfo {
  committedDate: string;
  author: { name: string; user: { login: string } | null };
  additions: number;
  deletions: number;
  message: string;
}

export interface ContributorStat {
  login: string;
  name: string;
  avatarUrl: string;
  commits: number;
}

// 詳細なコントリビューター統計（追加/削除行数、PR数含む）
export interface ContributorDetailStat {
  login: string;
  name: string;
  avatarUrl: string;
  commits: number;
  additions: number;
  deletions: number;
  pullRequests: number;
  reviews: number;
  score: number; // 総合スコア
  rank: number;  // 順位
}

export interface RepositoryStat {
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  watchers: number;
  issues: number;
  pullRequests: number;
  commits: number;
}

// 詳細なコントリビューター統計を取得（追加/削除行数、PR数含む）
export async function getContributorDetails(
  accessToken: string | null,
  owner: string,
  repo: string
): Promise<ContributorDetailStat[]> {
  const client = accessToken ? createGitHubClient(accessToken) : createPublicGitHubClient();

  // コミット履歴を取得（全期間、最大100件 - GitHub API制限）
  const { repository } = await client<{
    repository: {
      mentionableUsers: {
        nodes: Array<{
          login: string;
          avatarUrl: string;
          name: string | null;
        }>;
      };
      defaultBranchRef: {
        target: {
          history: {
            nodes: Array<{
              author: {
                user: { login: string } | null;
                name: string;
              };
              additions: number;
              deletions: number;
            }>;
          };
        };
      } | null;
      pullRequests: {
        nodes: Array<{
          author: { login: string } | null;
          merged: boolean;
          reviews: {
            nodes: Array<{
              author: { login: string } | null;
            }>;
          };
        }>;
      };
    };
  }>(`
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        mentionableUsers(first: 50) {
          nodes {
            login
            avatarUrl
            name
          }
        }
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 100) {
                nodes {
                  author {
                    user {
                      login
                    }
                    name
                  }
                  additions
                  deletions
                }
              }
            }
          }
        }
        pullRequests(first: 100, states: [MERGED, OPEN]) {
          nodes {
            author {
              login
            }
            merged
            reviews(first: 50) {
              nodes {
                author {
                  login
                }
              }
            }
          }
        }
      }
    }
  `, { owner, repo });

  // コミット統計を集計
  const commits = repository.defaultBranchRef?.target?.history?.nodes || [];
  const contributorMap: Record<string, {
    commits: number;
    additions: number;
    deletions: number;
    pullRequests: number;
    reviews: number;
  }> = {};

  commits.forEach((commit) => {
    const login = commit.author?.user?.login || commit.author?.name || "Unknown";
    if (!contributorMap[login]) {
      contributorMap[login] = { commits: 0, additions: 0, deletions: 0, pullRequests: 0, reviews: 0 };
    }
    contributorMap[login].commits += 1;
    contributorMap[login].additions += commit.additions;
    contributorMap[login].deletions += commit.deletions;
  });

  // PR統計を集計
  const pullRequests = repository.pullRequests?.nodes || [];
  pullRequests.forEach((pr) => {
    const authorLogin = pr.author?.login;
    if (authorLogin) {
      if (!contributorMap[authorLogin]) {
        contributorMap[authorLogin] = { commits: 0, additions: 0, deletions: 0, pullRequests: 0, reviews: 0 };
      }
      contributorMap[authorLogin].pullRequests += 1;
    }

    // レビュー統計
    pr.reviews?.nodes?.forEach((review) => {
      const reviewerLogin = review.author?.login;
      if (reviewerLogin && reviewerLogin !== authorLogin) {
        if (!contributorMap[reviewerLogin]) {
          contributorMap[reviewerLogin] = { commits: 0, additions: 0, deletions: 0, pullRequests: 0, reviews: 0 };
        }
        contributorMap[reviewerLogin].reviews += 1;
      }
    });
  });

  // ユーザー情報を取得
  const users = repository.mentionableUsers?.nodes || [];

  // スコア計算して配列に変換
  const contributors = Object.entries(contributorMap)
    .filter(([login]) => login !== "Unknown")
    .map(([login, stats]) => {
      const user = users.find((u) => u.login === login);
      // スコア: コミット数 * 10 + 追加行数/100 + 削除行数/200 + PR数 * 20 + レビュー数 * 5
      const score = Math.round(
        stats.commits * 10 +
        stats.additions / 100 +
        stats.deletions / 200 +
        stats.pullRequests * 20 +
        stats.reviews * 5
      );
      return {
        login,
        name: user?.name || login,
        avatarUrl: user?.avatarUrl || `https://avatars.githubusercontent.com/${login}`,
        ...stats,
        score,
        rank: 0,
      };
    })
    .sort((a, b) => b.score - a.score);

  // 順位を設定
  contributors.forEach((c, i) => {
    c.rank = i + 1;
  });

  return contributors;
}

// ユーザーの貢献統計（PR数、Issue数）
export interface UserContributionStats {
  totalPRs: number;
  totalIssues: number;
}

/**
 * ユーザーのPR数とIssue数を取得（GitHub Search API使用）
 * OGカードと同じロジックを共通化
 */
export async function getUserContributionStats(
  username: string,
  accessToken?: string | null
): Promise<UserContributionStats> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "GitHub-Insights",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    // PR数とIssue数を並列取得
    const [prsRes, issuesRes] = await Promise.all([
      fetch(
        `https://api.github.com/search/issues?q=author:${encodeURIComponent(username)}+type:pr&per_page=1`,
        { headers, next: { revalidate: SERVER_CACHE.USER_CONTRIBUTION_REVALIDATE } }
      ),
      fetch(
        `https://api.github.com/search/issues?q=author:${encodeURIComponent(username)}+type:issue&per_page=1`,
        { headers, next: { revalidate: SERVER_CACHE.USER_CONTRIBUTION_REVALIDATE } }
      ),
    ]);

    // レート制限チェック
    if (prsRes.status === 403 || prsRes.status === 429 ||
        issuesRes.status === 403 || issuesRes.status === 429) {
      throw new GitHubRateLimitError();
    }

    const [prsData, issuesData] = await Promise.all([
      prsRes.ok ? prsRes.json() : null,
      issuesRes.ok ? issuesRes.json() : null,
    ]);

    return {
      totalPRs: prsData?.total_count ?? 0,
      totalIssues: issuesData?.total_count ?? 0,
    };
  } catch (error) {
    if (error instanceof GitHubRateLimitError) {
      throw error;
    }
    console.error("Get user contribution stats error:", error);
    // エラー時は0を返す（スコア計算は続行できる）
    return { totalPRs: 0, totalIssues: 0 };
  }
}

// 年間統計の型
export interface YearlyStats {
  year: number;
  prs: number;
  issues: number;
  // 将来拡張用: commits, reviews, etc.
}

/**
 * 指定年のPR数とIssue数を取得（GitHub Search API使用）
 * GitHub Wrapped用
 */
export async function getYearlyContributionStats(
  username: string,
  year: number,
  accessToken?: string | null
): Promise<YearlyStats> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "GitHub-Insights",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  // 年の範囲を設定
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const dateRange = `created:${startDate}..${endDate}`;

  try {
    // PR数とIssue数を並列取得
    const [prsRes, issuesRes] = await Promise.all([
      fetch(
        `https://api.github.com/search/issues?q=author:${encodeURIComponent(username)}+type:pr+${dateRange}&per_page=1`,
        { headers, next: { revalidate: SERVER_CACHE.USER_CONTRIBUTION_REVALIDATE } }
      ),
      fetch(
        `https://api.github.com/search/issues?q=author:${encodeURIComponent(username)}+type:issue+${dateRange}&per_page=1`,
        { headers, next: { revalidate: SERVER_CACHE.USER_CONTRIBUTION_REVALIDATE } }
      ),
    ]);

    // レート制限チェック
    if (prsRes.status === 403 || prsRes.status === 429 ||
        issuesRes.status === 403 || issuesRes.status === 429) {
      throw new GitHubRateLimitError();
    }

    const [prsData, issuesData] = await Promise.all([
      prsRes.ok ? prsRes.json() : null,
      issuesRes.ok ? issuesRes.json() : null,
    ]);

    return {
      year,
      prs: prsData?.total_count ?? 0,
      issues: issuesData?.total_count ?? 0,
    };
  } catch (error) {
    if (error instanceof GitHubRateLimitError) {
      throw error;
    }
    console.error("Get yearly contribution stats error:", error);
    return { year, prs: 0, issues: 0 };
  }
}

