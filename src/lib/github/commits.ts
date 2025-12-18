/**
 * コミット関連 API
 */

import type { CommitInfo, CommitHistoryOptions } from "./types";
import { isRateLimitError } from "./errors";
import { createGitHubClient, createPublicGitHubClient } from "./client";

// コミット履歴 API レスポンス型
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

/**
 * コミット履歴を取得（期間選択・ページネーション対応）（認証/未認証両対応）
 */
export async function getCommitHistory(
  accessToken: string | null,
  owner: string,
  repo: string,
  options: CommitHistoryOptions = {}
): Promise<CommitInfo[]> {
  const { days = 30 } = options;
  const client = accessToken
    ? createGitHubClient(accessToken)
    : createPublicGitHubClient();

  // 期間に応じた maxCommits 調整（認証/未認証で分ける）
  const maxCommits = accessToken
    ? days === null
      ? 3000
      : days <= 7
        ? 500
        : days <= 30
          ? 2000
          : days <= 365
            ? 3000
            : 5000
    : days === null
      ? 300
      : days <= 7
        ? 200
        : 300; // 未認証は控えめに

  // 期間計算（null の場合は全期間 = since なし）
  let since: string | null = null;
  if (days !== null) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    since = sinceDate.toISOString();
  }

  const allCommits: CommitInfo[] = [];

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
      await new Promise((resolve) => setTimeout(resolve, 100));
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
          await new Promise((resolve) => setTimeout(resolve, delay));
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
