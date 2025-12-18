import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { GET } from "../commits/route";
import type { CommitInfo } from "@/lib/github/types";

// モック設定
const mockAuth = vi.fn<() => Promise<Session | null>>();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockGetCommitHistory = vi.fn<() => Promise<CommitInfo[]>>();
vi.mock("@/lib/github/commits", () => ({
  getCommitHistory: () => mockGetCommitHistory(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => fn),
}));

// テスト用のリクエスト生成ヘルパー
function createRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/github/commits");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

// モックコミットデータ
const createMockCommit = (overrides = {}): CommitInfo => ({
  committedDate: "2024-01-01T00:00:00Z",
  message: "test commit",
  author: { name: "Test User", user: { login: "testuser" } },
  additions: 100,
  deletions: 50,
  ...overrides,
});

describe("GET /api/github/commits", () => {
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

  it("days が不正な値の場合は 400 エラーを返す", async () => {
    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
      days: "invalid",
    });
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("days must be a number or null");
  });

  it("正常なリクエストでコミット履歴を返す", async () => {
    const mockCommits = [createMockCommit()];
    mockGetCommitHistory.mockResolvedValue(mockCommits);

    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
      days: "30",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockCommits);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
  });

  it("days=null の場合は全期間を取得", async () => {
    const mockCommits = [createMockCommit()];
    mockGetCommitHistory.mockResolvedValue(mockCommits);

    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
      days: "null",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockGetCommitHistory).toHaveBeenCalled();
  });

  it("認証済みの場合はアクセストークンを使用", async () => {
    mockAuth.mockResolvedValue({
      accessToken: "test-token",
      user: { id: "1", name: "Test", email: "test@example.com" },
      expires: "2099-01-01",
    });
    mockGetCommitHistory.mockResolvedValue([]);

    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockGetCommitHistory).toHaveBeenCalled();
  });

  it("レート制限エラーの場合は 429 を返す", async () => {
    mockGetCommitHistory.mockRejectedValue(
      new Error("API rate limit exceeded")
    );

    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
    });
    const response = await GET(request);

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error).toContain("rate limit");
  });

  it("その他のエラーの場合は 500 を返す", async () => {
    mockGetCommitHistory.mockRejectedValue(
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
