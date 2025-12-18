import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { GET } from "../stats/route";
import type { RepositoryStat } from "@/lib/github/types";

// モック設定
const mockAuth = vi.fn<() => Promise<Session | null>>();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockGetRepositoryStats = vi.fn<() => Promise<RepositoryStat>>();
vi.mock("@/lib/github/stats", () => ({
  getRepositoryStats: () => mockGetRepositoryStats(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => fn),
}));

// テスト用のリクエスト生成ヘルパー
function createRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/github/stats");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

describe("GET /api/github/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockAuth.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("owner が未指定の場合は 400 エラーを返す", async () => {
    const request = createRequest({ repo: "test-repo" });
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("owner and repo are required");
  });

  it("repo が未指定の場合は 400 エラーを返す", async () => {
    const request = createRequest({ owner: "test-owner" });
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("owner and repo are required");
  });

  it("正常なリクエストでリポジトリ統計を返す", async () => {
    const mockStats: RepositoryStat = {
      name: "test-repo",
      description: "A test repository",
      stars: 100,
      forks: 25,
      watchers: 50,
      issues: 10,
      pullRequests: 5,
      commits: 500,
    };
    mockGetRepositoryStats.mockResolvedValue(mockStats);

    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockStats);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=600");
  });

  it("認証済みの場合はアクセストークンを使用", async () => {
    mockAuth.mockResolvedValue({
      accessToken: "test-token",
      user: { id: "1", name: "Test", email: "test@example.com" },
      expires: "2099-01-01",
    });
    mockGetRepositoryStats.mockResolvedValue({
      name: "test-repo",
      description: "A test repository",
      stars: 100,
      forks: 25,
      watchers: 50,
      issues: 10,
      pullRequests: 5,
      commits: 500,
    });

    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
    });
    await GET(request);

    expect(mockGetRepositoryStats).toHaveBeenCalled();
  });

  it("レート制限エラーの場合は 429 を返す", async () => {
    mockGetRepositoryStats.mockRejectedValue(
      new Error("API rate limit exceeded")
    );

    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
    });
    const response = await GET(request);

    expect(response.status).toBe(429);
  });

  it("その他のエラーの場合は 500 を返す", async () => {
    mockGetRepositoryStats.mockRejectedValue(
      new Error("Unknown error")
    );

    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
    });
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});
