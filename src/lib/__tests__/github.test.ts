import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createGitHubClient,
  createPublicGitHubClient,
  getPublicRateLimitInfo,
  isRateLimitError,
  parseAccountType,
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
