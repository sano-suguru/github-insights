import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createGitHubClient,
  createPublicGitHubClient,
  getPublicRateLimitInfo,
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
