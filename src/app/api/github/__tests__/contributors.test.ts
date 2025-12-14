import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { GET } from "../contributors/route";
import type { ContributorStat, ContributorDetailStat } from "@/lib/github";

// モック設定
const mockAuth = vi.fn<() => Promise<Session | null>>();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockGetContributorStats = vi.fn<() => Promise<ContributorStat[]>>();
const mockGetContributorDetails = vi.fn<() => Promise<ContributorDetailStat[]>>();
vi.mock("@/lib/github", () => ({
  getContributorStats: () => mockGetContributorStats(),
  getContributorDetails: () => mockGetContributorDetails(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => fn),
}));

// テスト用のリクエスト生成ヘルパー
function createRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/github/contributors");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

// モックデータ
const mockStats: ContributorStat[] = [
  { login: "user1", name: "User One", avatarUrl: "https://avatar1.png", commits: 100 },
  { login: "user2", name: "User Two", avatarUrl: "https://avatar2.png", commits: 50 },
];

const mockDetails: ContributorDetailStat[] = [
  {
    login: "user1",
    name: "User One",
    avatarUrl: "https://avatar1.png",
    commits: 100,
    additions: 5000,
    deletions: 2000,
    pullRequests: 20,
    reviews: 15,
    score: 100,
    rank: 1,
  },
];

describe("GET /api/github/contributors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockAuth.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("owner が未指定の場合は 400 エラーを返す", async () => {
    const request = createRequest({ repo: "test-repo", type: "stats" });
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("owner and repo are required");
  });

  it("repo が未指定の場合は 400 エラーを返す", async () => {
    const request = createRequest({ owner: "test-owner", type: "stats" });
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("owner and repo are required");
  });

  it("type が未指定の場合は 400 エラーを返す", async () => {
    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
    });
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("type is required and must be 'stats' or 'details'");
  });

  it("type が不正な値の場合は 400 エラーを返す", async () => {
    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
      type: "invalid",
    });
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("type is required and must be 'stats' or 'details'");
  });

  it("type=stats でコントリビューター統計を返す", async () => {
    mockGetContributorStats.mockResolvedValue(mockStats);

    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
      type: "stats",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockStats);
    expect(mockGetContributorStats).toHaveBeenCalled();
    expect(mockGetContributorDetails).not.toHaveBeenCalled();
  });

  it("type=details でコントリビューター詳細を返す", async () => {
    mockGetContributorDetails.mockResolvedValue(mockDetails);

    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
      type: "details",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockDetails);
    expect(mockGetContributorDetails).toHaveBeenCalled();
    expect(mockGetContributorStats).not.toHaveBeenCalled();
  });

  it("認証済みの場合はアクセストークンを使用", async () => {
    mockAuth.mockResolvedValue({
      accessToken: "test-token",
      user: { id: "1", name: "Test", email: "test@example.com" },
      expires: "2099-01-01",
    });
    mockGetContributorStats.mockResolvedValue([]);

    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
      type: "stats",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockGetContributorStats).toHaveBeenCalled();
  });

  it("レート制限エラーの場合は 429 を返す", async () => {
    mockGetContributorStats.mockRejectedValue(
      new Error("API rate limit exceeded")
    );

    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
      type: "stats",
    });
    const response = await GET(request);

    expect(response.status).toBe(429);
  });

  it("その他のエラーの場合は 500 を返す", async () => {
    mockGetContributorStats.mockRejectedValue(
      new Error("Unknown error")
    );

    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
      type: "stats",
    });
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});
