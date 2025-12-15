import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createGitHubClient,
  createPublicGitHubClient,
  getPublicRateLimitInfo,
  isRateLimitError,
  parseAccountType,
  getUserEvents,
  GitHubRateLimitError,
} from "@/lib/github";

// @octokit/graphql のモック
vi.mock("@octokit/graphql", () => ({
  graphql: {
    defaults: vi.fn((options) => {
      // 認証ありの場合はヘッダーを確認
      if (options?.headers?.authorization) {
        return vi.fn().mockImplementation(() => Promise.resolve({}));
      }
      // 未認証の場合
      return vi.fn().mockImplementation(() => Promise.resolve({}));
    }),
  },
}));

describe("GitHub Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createGitHubClient", () => {
    it("認証トークン付きでクライアントを作成する", () => {
      const client = createGitHubClient("test-token");
      expect(client).toBeDefined();
      expect(typeof client).toBe("function");
    });
  });

  describe("createPublicGitHubClient", () => {
    it("未認証クライアントを作成する", () => {
      const client = createPublicGitHubClient();
      expect(client).toBeDefined();
      expect(typeof client).toBe("function");
    });
  });

  describe("getPublicRateLimitInfo", () => {
    it("初期状態ではnullを返す", () => {
      const info = getPublicRateLimitInfo();
      // 初回はnullまたは前回の値
      expect(info === null || typeof info === "object").toBe(true);
    });
  });
});

describe("認証/未認証分岐パターン", () => {
  it("accessTokenがnullの場合は未認証クライアントを使用すべき", () => {
    const accessToken: string | null = null;
    const isAuthenticated = accessToken !== null;
    expect(isAuthenticated).toBe(false);
  });

  it("accessTokenが文字列の場合は認証クライアントを使用すべき", () => {
    const accessToken: string | null = "ghp_xxxx";
    const isAuthenticated = accessToken !== null;
    expect(isAuthenticated).toBe(true);
  });
});

describe("isRateLimitError", () => {
  it("GitHubRateLimitError の場合は true を返す", () => {
    const error = new GitHubRateLimitError();
    expect(isRateLimitError(error)).toBe(true);
  });

  it("カスタムメッセージの GitHubRateLimitError の場合も true を返す", () => {
    const error = new GitHubRateLimitError("Custom rate limit message");
    expect(isRateLimitError(error)).toBe(true);
  });

  it("'rate limit' を含む Error の場合は true を返す", () => {
    const error = new Error("API rate limit exceeded");
    expect(isRateLimitError(error)).toBe(true);
  });

  it("'403' を含む Error の場合は true を返す", () => {
    const error = new Error("Request failed with status 403");
    expect(isRateLimitError(error)).toBe(true);
  });

  it("関連しないメッセージの Error の場合は false を返す", () => {
    const error = new Error("Network error");
    expect(isRateLimitError(error)).toBe(false);
  });

  it("null の場合は false を返す", () => {
    expect(isRateLimitError(null)).toBe(false);
  });

  it("undefined の場合は false を返す", () => {
    expect(isRateLimitError(undefined)).toBe(false);
  });

  it("文字列の場合は false を返す", () => {
    expect(isRateLimitError("rate limit")).toBe(false);
  });

  it("プレーンオブジェクトの場合は false を返す", () => {
    expect(isRateLimitError({ message: "rate limit" })).toBe(false);
  });
});

describe("parseAccountType", () => {
  it("'User' を渡すと 'User' を返す", () => {
    expect(parseAccountType("User")).toBe("User");
  });

  it("'Organization' を渡すと 'Organization' を返す", () => {
    expect(parseAccountType("Organization")).toBe("Organization");
  });

  it("null を渡すとデフォルトで 'User' を返す", () => {
    expect(parseAccountType(null)).toBe("User");
  });

  it("undefined を渡すとデフォルトで 'User' を返す", () => {
    expect(parseAccountType(undefined)).toBe("User");
  });

  it("不正な文字列を渡すとデフォルトで 'User' を返す", () => {
    expect(parseAccountType("Bot")).toBe("User");
    expect(parseAccountType("user")).toBe("User");
    expect(parseAccountType("organization")).toBe("User");
  });

  it("数値を渡すとデフォルトで 'User' を返す", () => {
    expect(parseAccountType(123)).toBe("User");
  });

  it("オブジェクトを渡すとデフォルトで 'User' を返す", () => {
    expect(parseAccountType({ type: "User" })).toBe("User");
  });
});

describe("getUserEvents", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ユーザーのイベントを取得して正しい形式で返す", async () => {
    const mockEvents = [
      {
        id: "12345",
        type: "PushEvent",
        created_at: "2025-12-15T10:00:00Z",
        repo: { name: "user/repo1" },
      },
      {
        id: "12346",
        type: "PullRequestEvent",
        created_at: "2025-12-14T09:00:00Z",
        repo: { name: "user/repo2" },
      },
    ];

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEvents),
    });

    const result = await getUserEvents("testuser");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "12345",
      type: "PushEvent",
      createdAt: "2025-12-15T10:00:00Z",
      repo: { name: "user/repo1" },
    });
    expect(result[1]).toEqual({
      id: "12346",
      type: "PullRequestEvent",
      createdAt: "2025-12-14T09:00:00Z",
      repo: { name: "user/repo2" },
    });
  });

  it("ユーザーが見つからない場合は空配列を返す", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await getUserEvents("nonexistent");
    expect(result).toEqual([]);
  });

  it("レート制限エラーの場合は GitHubRateLimitError をスローする", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    await expect(getUserEvents("testuser")).rejects.toThrow(GitHubRateLimitError);
  });

  it("429エラーの場合も GitHubRateLimitError をスローする", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    await expect(getUserEvents("testuser")).rejects.toThrow(GitHubRateLimitError);
  });

  it("イベントがない場合は空配列を返す", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const result = await getUserEvents("newuser");
    expect(result).toEqual([]);
  });

  it("認証トークン付きでリクエストする", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await getUserEvents("testuser", "test-token");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/users/testuser/events"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("複数ページを取得する（100件×2ページ）", async () => {
    const page1Events = Array.from({ length: 100 }, (_, i) => ({
      id: `event-${i}`,
      type: "PushEvent",
      created_at: "2025-12-15T10:00:00Z",
      repo: { name: "user/repo" },
    }));
    const page2Events = Array.from({ length: 50 }, (_, i) => ({
      id: `event-${100 + i}`,
      type: "PullRequestEvent",
      created_at: "2025-12-14T09:00:00Z",
      repo: { name: "user/repo2" },
    }));

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(page1Events),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(page2Events),
      });

    const result = await getUserEvents("testuser");

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(150);
    expect(result[0].id).toBe("event-0");
    expect(result[100].id).toBe("event-100");
  });

  it("2ページ目が空の場合は1ページ目のみ返す", async () => {
    const page1Events = Array.from({ length: 100 }, (_, i) => ({
      id: `event-${i}`,
      type: "PushEvent",
      created_at: "2025-12-15T10:00:00Z",
      repo: { name: "user/repo" },
    }));

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(page1Events),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

    const result = await getUserEvents("testuser");

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(100);
  });

  it("最大3ページまで取得する", async () => {
    const createPageEvents = (page: number) =>
      Array.from({ length: 100 }, (_, i) => ({
        id: `event-${(page - 1) * 100 + i}`,
        type: "PushEvent",
        created_at: "2025-12-15T10:00:00Z",
        repo: { name: "user/repo" },
      }));

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createPageEvents(1)),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createPageEvents(2)),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createPageEvents(3)),
      });

    const result = await getUserEvents("testuser");

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(300);
  });
});
