import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";

// 動的インポートを使用（モックを確実に反映させる）
async function importRoute() {
  return import("../repo-exists/route");
}

const mockAuth = vi.fn<() => Promise<Session | null>>();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockGetRepository = vi.fn<() => Promise<unknown>>();
vi.mock("@/lib/github/repository", () => ({
  getRepository: () => mockGetRepository(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => fn),
}));

vi.mock("@/lib/github/errors", () => ({
  GitHubRateLimitError: class extends Error {
    constructor(message = "GitHub API rate limit exceeded") {
      super(message);
      this.name = "GitHubRateLimitError";
    }
  },
  isRateLimitError: (e: unknown) =>
    e instanceof Error && e.name === "GitHubRateLimitError",
}));

function createRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/github/repo-exists");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

describe("GET /api/github/repo-exists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockAuth.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("repo が未指定の場合は 400 を返す", async () => {
    const { GET } = await importRoute();
    const request = createRequest({});
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toEqual({
      code: "BAD_REQUEST",
      message: "owner/repo is required",
    });
  });

  it("owner/repo 形式が不正な場合は 400 を返す", async () => {
    const { GET } = await importRoute();
    const request = createRequest({ repo: "invalid" });
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toEqual({
      code: "BAD_REQUEST",
      message: "owner/repo is required",
    });
  });

  it("正常なリクエストで exists: true を返す", async () => {
    const { GET } = await importRoute();
    mockGetRepository.mockResolvedValue({ id: "1" });

    const request = createRequest({ repo: "test-owner/test-repo" });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ exists: true });
  });

  it("認証済みの場合はアクセストークンを使用", async () => {
    const { GET } = await importRoute();
    mockAuth.mockResolvedValue({
      accessToken: "test-token",
      user: { id: "1", name: "Test", email: "test@example.com" },
      expires: "2099-01-01",
    });
    mockGetRepository.mockResolvedValue({ id: "1" });

    const request = createRequest({ repo: "test-owner/test-repo" });
    await GET(request);

    expect(mockGetRepository).toHaveBeenCalled();
  });

  it("存在しない場合は exists: false を返す", async () => {
    const { GET } = await importRoute();
    mockGetRepository.mockRejectedValue(new Error("Repository not found"));

    const request = createRequest({ repo: "test-owner/missing" });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ exists: false });
  });

  it("未認証で private の場合も exists: false を返す", async () => {
    const { GET } = await importRoute();
    mockGetRepository.mockRejectedValue(
      new Error("This is a private repository. Please login to access.")
    );

    const request = createRequest({ repo: "test-owner/private" });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ exists: false });
  });

  it("レート制限の場合は 429 を返す", async () => {
    const { GET } = await importRoute();
    const { GitHubRateLimitError } = await import("@/lib/github/errors");
    mockGetRepository.mockRejectedValue(new GitHubRateLimitError());

    const request = createRequest({ repo: "test-owner/test-repo" });
    const response = await GET(request);

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error.code).toBe("RATE_LIMIT");
    expect(data.error.message).toContain("Rate limit exceeded");
  });

  it("その他のエラーは 500 を返す", async () => {
    const { GET } = await importRoute();
    mockGetRepository.mockRejectedValue(new Error("boom"));

    const request = createRequest({ repo: "test-owner/test-repo" });
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toEqual({
      code: "INTERNAL",
      message: "Failed to validate repository",
    });
  });
});
