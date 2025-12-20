/**
 * リポジトリ関連 API
 */

import type { Repository, SearchRepositoriesResult } from "./types";
import { GitHubRateLimitError, isRateLimitError } from "./errors";
import {
  createGitHubClient,
  createPublicGitHubClient,
  withRetry,
  updateRateLimit,
} from "./client";
import { logger } from "@/lib/logger";

/**
 * リポジトリ情報を取得（認証/未認証両対応）
 */
export async function getRepository(
  accessToken: string | null,
  owner: string,
  repo: string
): Promise<Repository> {
  const client = accessToken
    ? createGitHubClient(accessToken)
    : createPublicGitHubClient();
  const isPublic = !accessToken;

  const { repository } = await withRetry(() =>
    client<{
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
    }>(
      `
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
  `,
      { owner, repo }
    )
  );

  // レート制限を更新（未認証の場合のみ追跡）
  if (isPublic) {
    await updateRateLimit(client, true);
  }

  if (!repository) {
    throw new Error("Repository not found");
  }

  // 未認証でプライベートリポジトリにアクセスしようとした場合
  if (repository.isPrivate && isPublic) {
    throw new Error("This is a private repository. Please login to access.");
  }

  return repository as Repository;
}

/**
 * 特定の Public リポジトリ情報を取得
 */
export async function getPublicRepository(owner: string, repo: string) {
  return getRepository(null, owner, repo);
}

/**
 * リポジトリを検索（認証/未認証両対応）
 */
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
    const { search } = await withRetry(() =>
      client<{
        search: {
          repositoryCount: number;
          nodes: Array<{
            nameWithOwner: string;
            name: string;
            description: string | null;
            isPrivate: boolean;
            primaryLanguage: { name: string; color: string } | null;
            stargazerCount: number;
            forkCount: number;
            updatedAt: string;
          }>;
        };
      }>(
        `
      query($searchQuery: String!, $first: Int!) {
        search(query: $searchQuery, type: REPOSITORY, first: $first) {
          repositoryCount
          nodes {
            ... on Repository {
              name
              nameWithOwner
              description
              isPrivate
              primaryLanguage {
                name
                color
              }
              stargazerCount
              forkCount
              updatedAt
            }
          }
        }
      }
    `,
        { searchQuery: `${query} in:name`, first }
      )
    );

    // レート制限を更新
    const rateLimit = await updateRateLimit(client, isUnauthenticated);

    // Public リポジトリのみ返す（null ノードを除外）
    const repositories = search.nodes
      .filter(
        (node): node is NonNullable<typeof node> =>
          node !== null && node.nameWithOwner !== undefined && !node.isPrivate
      )
      .map(({ name, nameWithOwner, description, stargazerCount, forkCount, primaryLanguage, updatedAt }) => ({
        name,
        nameWithOwner,
        description,
        stargazerCount,
        forkCount,
        primaryLanguage,
        updatedAt,
      }));

    return { repositories, rateLimit };
  } catch (error) {
    logger.error("Search repositories error:", error);
    if (isRateLimitError(error)) {
      throw new GitHubRateLimitError();
    }
    throw error;
  }
}

/**
 * 認証済みユーザーのリポジトリ一覧を取得
 */
export async function getRepositories(accessToken: string): Promise<Repository[]> {
  const client = createGitHubClient(accessToken);

  const { viewer } = await withRetry(() =>
    client<{
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
  `)
  );

  return viewer.repositories.nodes;
}
