/**
 * 統計関連 API
 */

import type {
  LanguageStat,
  ContributorStat,
  ContributorDetailStat,
  RepositoryStat,
} from "./types";

import {
  createGitHubClient,
  createPublicGitHubClient,
  withRetry,
} from "./client";

/**
 * リポジトリの言語統計を取得（認証/未認証両対応）
 */
export async function getLanguageStats(
  accessToken: string | null,
  owner: string,
  repo: string
): Promise<LanguageStat[]> {
  const client = accessToken
    ? createGitHubClient(accessToken)
    : createPublicGitHubClient();

  const { repository } = await withRetry(() =>
    client<{
      repository: {
        languages: {
          edges: Array<{
            size: number;
            node: { name: string; color: string };
          }>;
          totalSize: number;
        };
      };
    }>(
      `
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
  `,
      { owner, repo }
    )
  );

  const totalSize = repository.languages.totalSize;
  return repository.languages.edges.map((edge) => ({
    name: edge.node.name,
    color: edge.node.color,
    size: edge.size,
    percentage: Math.round((edge.size / totalSize) * 100 * 10) / 10,
  }));
}

/**
 * コントリビューター統計を取得（認証/未認証両対応）
 */
export async function getContributorStats(
  accessToken: string | null,
  owner: string,
  repo: string
): Promise<ContributorStat[]> {
  const client = accessToken
    ? createGitHubClient(accessToken)
    : createPublicGitHubClient();

  const { repository } = await withRetry(() =>
    client<{
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
    }>(
      `
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
  `,
      { owner, repo }
    )
  );

  // コミット数でコントリビューターを集計
  const commits = repository.defaultBranchRef?.target?.history?.nodes || [];
  const commitCounts: Record<string, number> = {};

  commits.forEach((commit) => {
    const login = commit.author?.user?.login || "Unknown";
    commitCounts[login] = (commitCounts[login] || 0) + 1;
  });

  const users = repository.mentionableUsers.nodes;
  return Object.entries(commitCounts)
    .map(([login, commitCount]) => {
      const user = users.find((u) => u.login === login);
      return {
        login,
        name: user?.name || login,
        avatarUrl: user?.avatarUrl || "",
        commits: commitCount,
      };
    })
    .sort((a, b) => b.commits - a.commits);
}

/**
 * リポジトリの基本統計を取得（認証/未認証両対応）
 */
export async function getRepositoryStats(
  accessToken: string | null,
  owner: string,
  repo: string
): Promise<RepositoryStat> {
  const client = accessToken
    ? createGitHubClient(accessToken)
    : createPublicGitHubClient();

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
  }>(
    `
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
  `,
    { owner, repo }
  );

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

/**
 * 詳細なコントリビューター統計を取得（追加/削除行数、PR数含む）
 */
export async function getContributorDetails(
  accessToken: string | null,
  owner: string,
  repo: string
): Promise<ContributorDetailStat[]> {
  const client = accessToken
    ? createGitHubClient(accessToken)
    : createPublicGitHubClient();

  const { repository } = await withRetry(() =>
    client<{
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
    }>(
      `
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
  `,
      { owner, repo }
    )
  );

  // コミット統計を集計
  const commits = repository.defaultBranchRef?.target?.history?.nodes || [];
  const contributorMap: Record<
    string,
    {
      commits: number;
      additions: number;
      deletions: number;
      pullRequests: number;
      reviews: number;
    }
  > = {};

  commits.forEach((commit) => {
    const login =
      commit.author?.user?.login || commit.author?.name || "Unknown";
    if (!contributorMap[login]) {
      contributorMap[login] = {
        commits: 0,
        additions: 0,
        deletions: 0,
        pullRequests: 0,
        reviews: 0,
      };
    }
    contributorMap[login].commits += 1;
    contributorMap[login].additions += commit.additions;
    contributorMap[login].deletions += commit.deletions;
  });

  // PR 統計を集計
  const pullRequests = repository.pullRequests?.nodes || [];
  pullRequests.forEach((pr) => {
    const authorLogin = pr.author?.login;
    if (authorLogin) {
      if (!contributorMap[authorLogin]) {
        contributorMap[authorLogin] = {
          commits: 0,
          additions: 0,
          deletions: 0,
          pullRequests: 0,
          reviews: 0,
        };
      }
      contributorMap[authorLogin].pullRequests += 1;
    }

    // レビュー統計
    pr.reviews?.nodes?.forEach((review) => {
      const reviewerLogin = review.author?.login;
      if (reviewerLogin && reviewerLogin !== authorLogin) {
        if (!contributorMap[reviewerLogin]) {
          contributorMap[reviewerLogin] = {
            commits: 0,
            additions: 0,
            deletions: 0,
            pullRequests: 0,
            reviews: 0,
          };
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
        avatarUrl:
          user?.avatarUrl || `https://avatars.githubusercontent.com/${login}`,
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
