/**
 * ユーザー関連 API
 */

import type {
  UserProfile,
  UserRepository,
  UserStats,
  SearchUsersResult,
  UserEvent,
  UserContributionStats,
  YearlyStats,
  RateLimitInfo,
} from "./types";
import { GitHubRateLimitError, isRateLimitError } from "./errors";
import {
  createGitHubClient,
  createPublicGitHubClient,
  withRetry,
} from "./client";
import { parseAccountType, calculateUserStats as computeUserStats, calculateStreaks } from "./transforms";
import { SERVER_CACHE } from "../cache-config";
import { sequentialFetch } from "../api-server-utils";

function isGraphQLUserLoginNotResolvable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /Could not resolve to a User/i.test(error.message);
}

// GitHub Events API のレスポンス型
interface GitHubEventResponse {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
}

// ContributionCalendar GraphQL レスポンス型
interface ContributionCalendarResponse {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number;
        weeks: Array<{
          contributionDays: Array<{
            contributionCount: number;
            date: string;
          }>;
        }>;
      };
    };
  } | null;
}

/**
 * ユーザープロファイルを取得（GitHub REST API 使用）
 */
export async function getUserProfile(
  username: string,
  accessToken?: string | null
): Promise<UserProfile | null> {
  try {
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GitHub-Insights",
    };

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

/**
 * ユーザーの公開リポジトリを取得（GraphQL API 使用）
 */
export async function getUserRepositories(
  username: string,
  accessToken?: string | null
): Promise<UserRepository[]> {
  const client = accessToken
    ? createGitHubClient(accessToken)
    : createPublicGitHubClient();

  try {
    const { user } = await withRetry(() =>
      client<{
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
      }>(
        `
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
    `,
        { username }
      )
    );

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
    if (isRateLimitError(error)) {
      throw new GitHubRateLimitError();
    }
    // Botアカウント等で GraphQL の user(login:) が解決できない場合は
    // リポジトリが取得できないだけなので空配列として扱う。
    if (isGraphQLUserLoginNotResolvable(error)) {
      return [];
    }
    throw error;
  }
}

/**
 * ユーザー統計を計算
 * transforms.ts の calculateUserStats を re-export
 */
export function calculateUserStats(repositories: UserRepository[]): UserStats {
  return computeUserStats(repositories);
}

/**
 * ユーザーを検索（GitHub REST API 使用）
 */
export async function searchUsers(
  accessToken: string | null,
  query: string,
  perPage: number = 5
): Promise<SearchUsersResult> {
  if (!query || query.length < 1) {
    return { users: [], rateLimit: null };
  }

  try {
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

    const userResults = users.map(
      (user: { login: string; avatar_url: string; type: string }) => ({
        login: user.login,
        avatarUrl: user.avatar_url,
        name: null,
        followers: 0,
        publicRepos: 0,
        type: parseAccountType(user.type),
      })
    );

    return { users: userResults, rateLimit: rateLimitInfo };
  } catch (error) {
    console.error("Search users error:", error);
    throw error;
  }
}

/**
 * ユーザーイベントを取得（GitHub REST API 使用）
 * 直近90日程度のイベントを取得（最大300件）
 */
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
        break;
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

/**
 * ユーザーの PR 数と Issue 数を取得（GitHub Search API 使用）
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
    const [prsRes, issuesRes] = await sequentialFetch([
      () =>
        fetch(
          `https://api.github.com/search/issues?q=author:${encodeURIComponent(username)}+type:pr&per_page=1`,
          { headers, next: { revalidate: SERVER_CACHE.USER_CONTRIBUTION_REVALIDATE } }
        ),
      () =>
        fetch(
          `https://api.github.com/search/issues?q=author:${encodeURIComponent(username)}+type:issue&per_page=1`,
          { headers, next: { revalidate: SERVER_CACHE.USER_CONTRIBUTION_REVALIDATE } }
        ),
    ] as const);

    if (
      prsRes.status === 403 ||
      prsRes.status === 429 ||
      issuesRes.status === 403 ||
      issuesRes.status === 429
    ) {
      throw new GitHubRateLimitError();
    }

    const [prsData, issuesData] = await sequentialFetch([
      () => (prsRes.ok ? prsRes.json() : Promise.resolve(null)),
      () => (issuesRes.ok ? issuesRes.json() : Promise.resolve(null)),
    ] as const);

    return {
      totalPRs: prsData?.total_count ?? 0,
      totalIssues: issuesData?.total_count ?? 0,
    };
  } catch (error) {
    if (error instanceof GitHubRateLimitError) {
      throw error;
    }
    console.error("Get user contribution stats error:", error);
    return { totalPRs: 0, totalIssues: 0 };
  }
}

/**
 * 指定年の PR 数と Issue 数を取得（GitHub Search API 使用）
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

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const dateRange = `created:${startDate}..${endDate}`;

  try {
    const [prsRes, issuesRes] = await sequentialFetch([
      () =>
        fetch(
          `https://api.github.com/search/issues?q=author:${encodeURIComponent(username)}+type:pr+${dateRange}&per_page=1`,
          { headers, next: { revalidate: SERVER_CACHE.USER_CONTRIBUTION_REVALIDATE } }
        ),
      () =>
        fetch(
          `https://api.github.com/search/issues?q=author:${encodeURIComponent(username)}+type:issue+${dateRange}&per_page=1`,
          { headers, next: { revalidate: SERVER_CACHE.USER_CONTRIBUTION_REVALIDATE } }
        ),
    ] as const);

    if (
      prsRes.status === 403 ||
      prsRes.status === 429 ||
      issuesRes.status === 403 ||
      issuesRes.status === 429
    ) {
      throw new GitHubRateLimitError();
    }

    const [prsData, issuesData] = await sequentialFetch([
      () => (prsRes.ok ? prsRes.json() : Promise.resolve(null)),
      () => (issuesRes.ok ? issuesRes.json() : Promise.resolve(null)),
    ] as const);

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

/**
 * GitHub GraphQL API から指定年のコントリビューションカレンダーを取得
 */
export async function getContributionCalendar(
  username: string,
  year: number,
  accessToken?: string | null
): Promise<{
  totalContributions: number;
  longestStreak: number;
  currentStreak: number;
}> {
  try {
    const client = accessToken
      ? createGitHubClient(accessToken)
      : createPublicGitHubClient();

    const from = `${year}-01-01T00:00:00Z`;
    const to = `${year}-12-31T23:59:59Z`;

    const response = await withRetry(() =>
      client<ContributionCalendarResponse>(
        `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }
    `,
        { username, from, to }
      )
    );

    if (!response.user) {
      console.warn(`User ${username} not found for contribution calendar`);
      return { totalContributions: 0, longestStreak: 0, currentStreak: 0 };
    }

    const calendar = response.user.contributionsCollection.contributionCalendar;
    const allDays = calendar.weeks.flatMap((week) => week.contributionDays);
    const { longestStreak, currentStreak } = calculateStreaks(allDays, year);

    return {
      totalContributions: calendar.totalContributions,
      longestStreak,
      currentStreak,
    };
  } catch (error) {
    console.error("Get contribution calendar error:", error);
    return { totalContributions: 0, longestStreak: 0, currentStreak: 0 };
  }
}
