import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../search-users/route";

// モック設定
const mockSearchUsers = vi.fn();
const mockGetPublicRateLimitInfo = vi.fn();
vi.mock("@/lib/github", () => ({
  searchUsers: () => mockSearchUsers(),
  getPublicRateLimitInfo: () => mockGetPublicRateLimitInfo(),
  GitHubRateLimitError: class extends Error {
    constructor(message = "GitHub API rate limit exceeded") {
      super(message);
      this.name = "GitHubRateLimitError";
    }
  },
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => fn),
}));

// テスト用のリクエスト生成ヘルパー
function createRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/github/search-users");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

// モックユーザーデータ
const mockUsers = [
  {
    login: "testuser",
    avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
    name: "Test User",
    followers: 100,
    publicRepos: 20,
    type: "User" as const,
  },
  {
    login: "testorg",
    avatarUrl: "https://avatars.githubusercontent.com/u/2?v=4",
    name: "Test Organization",
    followers: 500,
    publicRepos: 50,
    type: "Organization" as const,
  },
];

describe("GET /api/github/search-users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetPublicRateLimitInfo.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("クエリが空の場合は空配列を返す", async () => {
    const request = createRequest({});
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.users).toEqual([]);
  });

  it("クエリが短すぎる場合は空配列を返す", async () => {
    const request = createRequest({ q: "" });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.users).toEqual([]);
  });

  it("正常なリクエストでユーザー検索結果を返す", async () => {
    mockSearchUsers.mockResolvedValue(mockUsers);

    const request = createRequest({ q: "test" });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.users).toEqual(mockUsers);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=60");
  });

  it("レート制限情報を含めて返す", async () => {
    const resetDate = new Date("2024-01-01T00:00:00Z");
    const rateLimitInfo = {
      limit: 60,
      remaining: 55,
      resetAt: resetDate,
      used: 5,
    };
    mockSearchUsers.mockResolvedValue(mockUsers);
    mockGetPublicRateLimitInfo.mockReturnValue(rateLimitInfo);

    const request = createRequest({ q: "test" });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    // JSONシリアライズでDateは文字列に変換される
    expect(data.rateLimit.limit).toBe(60);
    expect(data.rateLimit.remaining).toBe(55);
    expect(data.rateLimit.used).toBe(5);
  });

  it("レート制限エラーの場合は 429 を返す", async () => {
    const { GitHubRateLimitError } = await import("@/lib/github");
    mockSearchUsers.mockRejectedValue(new GitHubRateLimitError());

    const request = createRequest({ q: "test" });
    const response = await GET(request);

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error).toBe("Rate limit exceeded");
  });

  it("その他のエラーの場合は 500 を返す", async () => {
    mockSearchUsers.mockRejectedValue(new Error("Unknown error"));

    const request = createRequest({ q: "test" });
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Search failed");
  });
});
