/**
 * user.ts のテスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUserProfile,
  getUserRepositories,
  calculateUserStats,
  searchUsers,
  getUserEvents,
  getUserContributionStats,
  getContributionCalendar,
} from "../user";

// client.ts をモック
vi.mock("../client", () => ({
  createGitHubClient: vi.fn(),
  createPublicGitHubClient: vi.fn(),
  withRetry: vi.fn((fn) => fn()),
}));

// errors.ts をモック
vi.mock("../errors", () => ({
  GitHubRateLimitError: class extends Error {
    constructor() {
      super("GitHub API rate limit exceeded");
      this.name = "GitHubRateLimitError";
    }
  },
  isRateLimitError: vi.fn((error) => {
    return error instanceof Error && error.message.includes("rate limit");
  }),
}));

// api-utils をモック
vi.mock("../../api-utils", () => ({
  sequentialFetch: vi.fn((fns) => Promise.all(fns.map((fn: () => unknown) => fn()))),
}));

import { createGitHubClient, createPublicGitHubClient } from "../client";

// グローバル fetch をモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("getUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ユーザープロファイルを取得できる", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          login: "testuser",
          avatar_url: "https://example.com/avatar.png",
          name: "Test User",
          bio: "Developer",
          company: "TestCo",
          location: "Tokyo",
          blog: "https://example.com",
          twitter_username: "testuser",
          followers: 100,
          following: 50,
          public_repos: 30,
          public_gists: 5,
          created_at: "2020-01-01T00:00:00Z",
          type: "User",
        }),
    });

    const result = await getUserProfile("testuser");

    expect(result).not.toBeNull();
    expect(result!.login).toBe("testuser");
    expect(result!.name).toBe("Test User");
    expect(result!.followers).toBe(100);
    expect(result!.type).toBe("User");
  });

  it("認証トークン付きでリクエストできる", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          login: "testuser",
          type: "User",
        }),
    });

    await getUserProfile("testuser", "token123");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token123",
        }),
      })
    );
  });

  it("404の場合はnullを返す", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await getUserProfile("notfound");

    expect(result).toBeNull();
  });

  it("403の場合はレート制限エラーをスロー", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
    });

    await expect(getUserProfile("testuser")).rejects.toThrow(
      "GitHub API rate limit exceeded"
    );
  });

  it("429の場合もレート制限エラーをスロー", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
    });

    await expect(getUserProfile("testuser")).rejects.toThrow(
      "GitHub API rate limit exceeded"
    );
  });

  it("その他のエラーはそのままスロー", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(getUserProfile("testuser")).rejects.toThrow(
      "Get user profile failed: 500"
    );
  });
});

describe("getUserRepositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ユーザーのリポジトリを取得できる", async () => {
    const mockRepos = [
      {
        name: "repo1",
        nameWithOwner: "user/repo1",
        description: "First repo",
        stargazerCount: 10,
        forkCount: 2,
        primaryLanguage: { name: "TypeScript", color: "#3178c6" },
        updatedAt: "2024-01-01T00:00:00Z",
        isArchived: false,
        isFork: false,
      },
    ];

    const mockClient = vi.fn().mockResolvedValue({
      user: {
        repositories: { nodes: mockRepos },
      },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const result = await getUserRepositories("testuser");

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("repo1");
  });

  it("ユーザーが見つからない場合は空配列を返す", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      user: null,
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const result = await getUserRepositories("notfound");

    expect(result).toEqual([]);
  });

  it("レート制限エラーをスロー", async () => {
    const mockClient = vi.fn().mockRejectedValue(new Error("rate limit"));
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    await expect(getUserRepositories("testuser")).rejects.toThrow(
      "GitHub API rate limit exceeded"
    );
  });
});

describe("calculateUserStats", () => {
  it("リポジトリから統計を計算する", () => {
    const repos = [
      {
        name: "repo1",
        nameWithOwner: "user/repo1",
        description: null,
        stargazerCount: 100,
        forkCount: 10,
        primaryLanguage: { name: "TypeScript", color: "#3178c6" },
        updatedAt: "2024-01-01T00:00:00Z",
        isArchived: false,
        isFork: false,
      },
      {
        name: "repo2",
        nameWithOwner: "user/repo2",
        description: null,
        stargazerCount: 50,
        forkCount: 5,
        primaryLanguage: { name: "JavaScript", color: "#f1e05a" },
        updatedAt: "2024-01-02T00:00:00Z",
        isArchived: false,
        isFork: true,
      },
    ];

    const stats = calculateUserStats(repos);

    expect(stats.totalStars).toBe(150);
    expect(stats.totalForks).toBe(15);
    expect(stats.totalRepos).toBe(2);
    expect(stats.languageBreakdown).toBeDefined();
    expect(stats.topRepositories).toBeDefined();
  });
});

describe("searchUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("空のクエリは空の結果を返す", async () => {
    const result = await searchUsers(null, "");
    expect(result.users).toEqual([]);
    expect(result.rateLimit).toBeNull();
  });

  it("ユーザーを検索できる", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            { login: "user1", avatar_url: "https://example.com/1.png", type: "User" },
            { login: "user2", avatar_url: "https://example.com/2.png", type: "Organization" },
          ],
        }),
      headers: new Map([
        ["x-ratelimit-limit", "30"],
        ["x-ratelimit-remaining", "29"],
        ["x-ratelimit-reset", "1700000000"],
        ["x-ratelimit-used", "1"],
      ]),
    });

    const result = await searchUsers(null, "test");

    expect(result.users).toHaveLength(2);
    expect(result.users[0].login).toBe("user1");
    expect(result.users[1].type).toBe("Organization");
  });

  it("レート制限エラーをスロー", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
    });

    await expect(searchUsers(null, "test")).rejects.toThrow(
      "GitHub API rate limit exceeded"
    );
  });
});

describe("getUserEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ユーザーイベントを取得できる", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: "1",
            type: "PushEvent",
            created_at: "2024-01-01T00:00:00Z",
            repo: { name: "user/repo" },
          },
        ]),
    });

    const result = await getUserEvents("testuser");

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("PushEvent");
  });

  it("404の場合は空配列を返す", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await getUserEvents("notfound");

    expect(result).toEqual([]);
  });

  it("レート制限エラーをスロー", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
    });

    await expect(getUserEvents("testuser")).rejects.toThrow(
      "GitHub API rate limit exceeded"
    );
  });
});

describe("getUserContributionStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PR数とIssue数を取得できる", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ total_count: 42 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ total_count: 15 }),
      });

    const result = await getUserContributionStats("testuser");

    expect(result.totalPRs).toBe(42);
    expect(result.totalIssues).toBe(15);
  });

  it("レート制限エラーをスロー", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
    });

    await expect(getUserContributionStats("testuser")).rejects.toThrow(
      "GitHub API rate limit exceeded"
    );
  });
});

describe("getContributionCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("コントリビューションカレンダーを取得できる", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      user: {
        contributionsCollection: {
          contributionCalendar: {
            totalContributions: 365,
            weeks: [
              {
                contributionDays: [
                  { contributionCount: 5, date: "2024-01-01" },
                  { contributionCount: 3, date: "2024-01-02" },
                ],
              },
            ],
          },
        },
      },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const result = await getContributionCalendar("testuser", 2024);

    expect(result.totalContributions).toBe(365);
  });

  it("ユーザーが見つからない場合はデフォルト値を返す", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      user: null,
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const result = await getContributionCalendar("notfound", 2024);

    expect(result.totalContributions).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.currentStreak).toBe(0);
  });

  it("認証トークン付きでリクエストできる", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      user: {
        contributionsCollection: {
          contributionCalendar: {
            totalContributions: 100,
            weeks: [],
          },
        },
      },
    });
    vi.mocked(createGitHubClient).mockReturnValue(mockClient as never);

    await getContributionCalendar("testuser", 2024, "token123");

    expect(createGitHubClient).toHaveBeenCalledWith("token123");
  });
});
