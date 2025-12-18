/**
 * stats.ts のテスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLanguageStats,
  getContributorStats,
  getRepositoryStats,
  getContributorDetails,
} from "../stats";

// client.ts をモック
vi.mock("../client", () => ({
  createGitHubClient: vi.fn(),
  createPublicGitHubClient: vi.fn(),
  withRetry: vi.fn((fn) => fn()),
}));

import { createGitHubClient, createPublicGitHubClient } from "../client";

describe("getLanguageStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("言語統計を取得できる", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        languages: {
          edges: [
            { size: 5000, node: { name: "TypeScript", color: "#3178c6" } },
            { size: 3000, node: { name: "JavaScript", color: "#f1e05a" } },
            { size: 2000, node: { name: "CSS", color: "#563d7c" } },
          ],
          totalSize: 10000,
        },
      },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const result = await getLanguageStats(null, "owner", "repo");

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("TypeScript");
    expect(result[0].percentage).toBe(50);
    expect(result[1].name).toBe("JavaScript");
    expect(result[1].percentage).toBe(30);
  });

  it("認証済みでも取得できる", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        languages: {
          edges: [{ size: 1000, node: { name: "Python", color: "#3572A5" } }],
          totalSize: 1000,
        },
      },
    });
    vi.mocked(createGitHubClient).mockReturnValue(mockClient as never);

    const result = await getLanguageStats("token", "owner", "repo");

    expect(createGitHubClient).toHaveBeenCalledWith("token");
    expect(result[0].percentage).toBe(100);
  });
});

describe("getContributorStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("コントリビューター統計を取得できる", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        mentionableUsers: {
          nodes: [
            { login: "alice", avatarUrl: "https://example.com/alice.png", name: "Alice" },
            { login: "bob", avatarUrl: "https://example.com/bob.png", name: null },
          ],
        },
        defaultBranchRef: {
          target: {
            history: {
              nodes: [
                { author: { user: { login: "alice" } } },
                { author: { user: { login: "alice" } } },
                { author: { user: { login: "bob" } } },
              ],
            },
          },
        },
      },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const result = await getContributorStats(null, "owner", "repo");

    expect(result).toHaveLength(2);
    expect(result[0].login).toBe("alice");
    expect(result[0].commits).toBe(2);
    expect(result[0].name).toBe("Alice");
    expect(result[1].login).toBe("bob");
    expect(result[1].commits).toBe(1);
  });

  it("defaultBranchRef が null の場合は空配列を返す", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        mentionableUsers: { nodes: [] },
        defaultBranchRef: null,
      },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const result = await getContributorStats(null, "owner", "repo");

    expect(result).toEqual([]);
  });

  it("ユーザー情報がない場合はログインをnameに使用", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        mentionableUsers: { nodes: [] },
        defaultBranchRef: {
          target: {
            history: {
              nodes: [{ author: { user: { login: "unknown_user" } } }],
            },
          },
        },
      },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const result = await getContributorStats(null, "owner", "repo");

    expect(result[0].name).toBe("unknown_user");
    expect(result[0].avatarUrl).toBe("");
  });
});

describe("getRepositoryStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("リポジトリ統計を取得できる", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        name: "test-repo",
        description: "A test repository",
        stargazerCount: 1000,
        forkCount: 100,
        watchers: { totalCount: 50 },
        issues: { totalCount: 25 },
        pullRequests: { totalCount: 75 },
        defaultBranchRef: {
          target: {
            history: { totalCount: 500 },
          },
        },
      },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const result = await getRepositoryStats(null, "owner", "repo");

    expect(result.name).toBe("test-repo");
    expect(result.stars).toBe(1000);
    expect(result.forks).toBe(100);
    expect(result.watchers).toBe(50);
    expect(result.issues).toBe(25);
    expect(result.pullRequests).toBe(75);
    expect(result.commits).toBe(500);
  });

  it("defaultBranchRef が null の場合はcommitsが0", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        name: "empty-repo",
        description: null,
        stargazerCount: 0,
        forkCount: 0,
        watchers: { totalCount: 0 },
        issues: { totalCount: 0 },
        pullRequests: { totalCount: 0 },
        defaultBranchRef: null,
      },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const result = await getRepositoryStats(null, "owner", "repo");

    expect(result.commits).toBe(0);
  });
});

describe("getContributorDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("詳細なコントリビューター統計を取得できる", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        mentionableUsers: {
          nodes: [
            { login: "alice", avatarUrl: "https://example.com/alice.png", name: "Alice" },
          ],
        },
        defaultBranchRef: {
          target: {
            history: {
              nodes: [
                {
                  author: { user: { login: "alice" }, name: "Alice" },
                  additions: 100,
                  deletions: 50,
                },
                {
                  author: { user: { login: "alice" }, name: "Alice" },
                  additions: 200,
                  deletions: 30,
                },
              ],
            },
          },
        },
        pullRequests: {
          nodes: [
            {
              author: { login: "alice" },
              merged: true,
              reviews: { nodes: [] },
            },
          ],
        },
      },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const result = await getContributorDetails(null, "owner", "repo");

    expect(result).toHaveLength(1);
    expect(result[0].login).toBe("alice");
    expect(result[0].commits).toBe(2);
    expect(result[0].additions).toBe(300);
    expect(result[0].deletions).toBe(80);
    expect(result[0].pullRequests).toBe(1);
    expect(result[0].rank).toBe(1);
  });

  it("レビュー統計も集計される", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        mentionableUsers: {
          nodes: [
            { login: "alice", avatarUrl: "https://example.com/alice.png", name: "Alice" },
            { login: "bob", avatarUrl: "https://example.com/bob.png", name: "Bob" },
          ],
        },
        defaultBranchRef: {
          target: {
            history: {
              nodes: [
                {
                  author: { user: { login: "alice" }, name: "Alice" },
                  additions: 100,
                  deletions: 50,
                },
              ],
            },
          },
        },
        pullRequests: {
          nodes: [
            {
              author: { login: "alice" },
              merged: true,
              reviews: {
                nodes: [{ author: { login: "bob" } }],
              },
            },
          ],
        },
      },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const result = await getContributorDetails(null, "owner", "repo");

    const bob = result.find((c) => c.login === "bob");
    expect(bob).toBeDefined();
    expect(bob!.reviews).toBe(1);
  });

  it("Unknownコントリビューターは除外される", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        mentionableUsers: { nodes: [] },
        defaultBranchRef: {
          target: {
            history: {
              nodes: [
                {
                  author: { user: null, name: "Unknown" },
                  additions: 10,
                  deletions: 5,
                },
              ],
            },
          },
        },
        pullRequests: { nodes: [] },
      },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const result = await getContributorDetails(null, "owner", "repo");

    expect(result.every((c) => c.login !== "Unknown")).toBe(true);
  });
});
