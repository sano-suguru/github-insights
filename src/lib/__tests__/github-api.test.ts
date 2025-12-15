import { describe, it, expect, vi, beforeEach } from "vitest";
import { graphql } from "@octokit/graphql";

// @octokit/graphql のモック
const mockGraphqlClient = vi.fn();
vi.mock("@octokit/graphql", () => ({
  graphql: {
    defaults: vi.fn(() => mockGraphqlClient),
  },
}));

// テスト対象を動的にインポート（モック適用後）
const {
  getLanguageStats,
  getContributorStats,
  getRepositoryStats,
} = await import("@/lib/github");

describe("GitHub API関数", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLanguageStats", () => {
    it("言語統計を正しくパースして返す", async () => {
      mockGraphqlClient.mockResolvedValue({
        repository: {
          languages: {
            edges: [
              { size: 50000, node: { name: "TypeScript", color: "#3178c6" } },
              { size: 30000, node: { name: "JavaScript", color: "#f7df1e" } },
              { size: 20000, node: { name: "CSS", color: "#563d7c" } },
            ],
            totalSize: 100000,
          },
        },
      });

      const result = await getLanguageStats(null, "owner", "repo");

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: "TypeScript",
        color: "#3178c6",
        size: 50000,
        percentage: 50,
      });
      expect(result[1].percentage).toBe(30);
      expect(result[2].percentage).toBe(20);
    });

    it("認証トークンがある場合は認証クライアントを使用", async () => {
      mockGraphqlClient.mockResolvedValue({
        repository: {
          languages: { edges: [], totalSize: 0 },
        },
      });

      await getLanguageStats("test-token", "owner", "repo");

      // graphql.defaults が呼ばれたことを確認
      expect(graphql.defaults).toHaveBeenCalled();
    });

    it("空の言語データを処理できる", async () => {
      mockGraphqlClient.mockResolvedValue({
        repository: {
          languages: { edges: [], totalSize: 0 },
        },
      });

      const result = await getLanguageStats(null, "owner", "repo");

      expect(result).toEqual([]);
    });
  });

  describe("getContributorStats", () => {
    it("コントリビューター統計を集計して返す", async () => {
      mockGraphqlClient.mockResolvedValue({
        repository: {
          mentionableUsers: {
            nodes: [
              { login: "user1", avatarUrl: "https://avatar1.png", name: "User One" },
              { login: "user2", avatarUrl: "https://avatar2.png", name: "User Two" },
            ],
          },
          defaultBranchRef: {
            target: {
              history: {
                nodes: [
                  { author: { user: { login: "user1" } } },
                  { author: { user: { login: "user1" } } },
                  { author: { user: { login: "user1" } } },
                  { author: { user: { login: "user2" } } },
                ],
              },
            },
          },
        },
      });

      const result = await getContributorStats(null, "owner", "repo");

      expect(result).toHaveLength(2);
      // コミット数順にソートされる
      expect(result[0].login).toBe("user1");
      expect(result[0].commits).toBe(3);
      expect(result[1].login).toBe("user2");
      expect(result[1].commits).toBe(1);
    });

    it("defaultBranchRefがnullの場合も処理できる", async () => {
      mockGraphqlClient.mockResolvedValue({
        repository: {
          mentionableUsers: { nodes: [] },
          defaultBranchRef: null,
        },
      });

      const result = await getContributorStats(null, "owner", "repo");

      expect(result).toEqual([]);
    });
  });

  describe("getRepositoryStats", () => {
    it("リポジトリ統計を正しく返す", async () => {
      mockGraphqlClient.mockResolvedValue({
        repository: {
          name: "test-repo",
          description: "A test repository",
          stargazerCount: 100,
          forkCount: 25,
          watchers: { totalCount: 50 },
          issues: { totalCount: 30 },
          pullRequests: { totalCount: 15 },
          defaultBranchRef: {
            target: {
              history: { totalCount: 500 },
            },
          },
        },
      });

      const result = await getRepositoryStats(null, "owner", "repo");

      expect(result).toEqual({
        name: "test-repo",
        description: "A test repository",
        stars: 100,
        forks: 25,
        watchers: 50,
        issues: 30,
        pullRequests: 15,
        commits: 500,
      });
    });

    it("defaultBranchRefがnullの場合、commits は 0", async () => {
      mockGraphqlClient.mockResolvedValue({
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

      const result = await getRepositoryStats(null, "owner", "repo");

      expect(result.commits).toBe(0);
      expect(result.description).toBeNull();
    });
  });
});

describe("認証/未認証の分岐", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accessToken=null で未認証クライアントが作成される", async () => {
    mockGraphqlClient.mockResolvedValue({
      repository: { languages: { edges: [], totalSize: 0 } },
    });

    await getLanguageStats(null, "owner", "repo");

    // defaults が空オブジェクトで呼ばれる（未認証）
    const calls = (graphql.defaults as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toEqual({});
  });

  it("accessToken が文字列の場合、認証ヘッダー付きクライアントが作成される", async () => {
    mockGraphqlClient.mockResolvedValue({
      repository: { languages: { edges: [], totalSize: 0 } },
    });

    await getLanguageStats("ghp_test_token", "owner", "repo");

    const calls = (graphql.defaults as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toEqual({
      headers: {
        authorization: "token ghp_test_token",
      },
    });
  });
});
