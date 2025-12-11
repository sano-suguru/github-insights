import { graphql } from "@octokit/graphql";

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
async function updateRateLimit(client: typeof graphql, isPublic: boolean) {
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
    
    if (isPublic) {
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
  const { days = 30, maxCommits = 500 } = options;
  const client = accessToken ? createGitHubClient(accessToken) : createPublicGitHubClient();
  
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
  while (hasNextPage && allCommits.length < maxCommits) {
    const batchSize = Math.min(100, maxCommits - allCommits.length);

    const response: CommitHistoryResponse = await client(query, {
      owner,
      repo,
      first: batchSize,
      after: cursor,
      since,
    });

    const history = response.repository.defaultBranchRef?.target?.history;
    if (!history) break;

    allCommits.push(...history.nodes);
    hasNextPage = history.pageInfo.hasNextPage;
    cursor = history.pageInfo.endCursor;
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
