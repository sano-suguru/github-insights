import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { GET } from "../languages/route";
import type { LanguageStat } from "@/lib/github";

// モック設定
const mockAuth = vi.fn<() => Promise<Session | null>>();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockGetLanguageStats = vi.fn<() => Promise<LanguageStat[]>>();
vi.mock("@/lib/github", () => ({
  getLanguageStats: () => mockGetLanguageStats(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => fn),
}));

// テスト用のリクエスト生成ヘルパー
function createRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/github/languages");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

// モックデータ
const mockLanguages: LanguageStat[] = [
  { name: "TypeScript", color: "#3178c6", size: 50000, percentage: 50 },
  { name: "JavaScript", color: "#f7df1e", size: 30000, percentage: 30 },
];

describe("GET /api/github/languages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
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

  it("正常なリクエストで言語統計を返す", async () => {
    mockGetLanguageStats.mockResolvedValue(mockLanguages);

    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockLanguages);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=600");
  });

  it("認証済みの場合はアクセストークンを使用", async () => {
    mockAuth.mockResolvedValue({
      accessToken: "test-token",
      user: { id: "1", name: "Test", email: "test@example.com" },
      expires: "2099-01-01",
    });
    mockGetLanguageStats.mockResolvedValue([]);

    const request = createRequest({
      owner: "test-owner",
      repo: "test-repo",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockGetLanguageStats).toHaveBeenCalled();
  });

  it("レート制限エラーの場合は 429 を返す", async () => {
    mockGetLanguageStats.mockRejectedValue(
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
    mockGetLanguageStats.mockRejectedValue(
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
