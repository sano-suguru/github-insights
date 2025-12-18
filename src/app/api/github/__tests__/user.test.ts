import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { UserProfile, UserRepository, UserStats } from "@/lib/github/types";

// 動的インポートを使用（[username] フォルダ名の問題を回避）
async function importRoute() {
  return import("../user/[username]/route");
}

// モック設定
const mockGetUserProfile = vi.fn<() => Promise<UserProfile | null>>();
const mockGetUserRepositories = vi.fn<() => Promise<UserRepository[]>>();
const mockGetUserEvents = vi.fn<() => Promise<unknown[]>>();
const mockGetUserContributionStats = vi.fn<() => Promise<{ totalPRs: number; totalIssues: number }>>();
const mockCalculateUserStats = vi.fn<() => UserStats>();
vi.mock("@/lib/github/user", () => ({
  getUserProfile: () => mockGetUserProfile(),
  getUserRepositories: () => mockGetUserRepositories(),
  getUserEvents: () => mockGetUserEvents(),
  getUserContributionStats: () => mockGetUserContributionStats(),
  calculateUserStats: () => mockCalculateUserStats(),
}));
vi.mock("@/lib/github/errors", () => ({
  GitHubRateLimitError: class extends Error {
    constructor(message = "GitHub API rate limit exceeded") {
      super(message);
      this.name = "GitHubRateLimitError";
    }
  },
  isRateLimitError: (e: unknown) => e instanceof Error && e.name === "GitHubRateLimitError",
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => fn),
}));

// auth モック - セッションからアクセストークンを取得するため
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve({ accessToken: "test-token" })),
}));

// テスト用のリクエスト生成ヘルパー
function createRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/github/user/testuser");
}

// モックプロファイルデータ
const mockProfile: UserProfile = {
  login: "testuser",
  avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
  name: "Test User",
  bio: "A test user",
  company: "Test Company",
  location: "Tokyo, Japan",
  blog: "https://example.com",
  twitterUsername: "testuser",
  followers: 100,
  following: 50,
  publicRepos: 20,
  publicGists: 5,
  createdAt: "2020-01-01T00:00:00Z",
  type: "User",
};

// モックリポジトリデータ
const mockRepositories: UserRepository[] = [
  {
    name: "test-repo",
    nameWithOwner: "testuser/test-repo",
    description: "A test repository",
    stargazerCount: 100,
    forkCount: 25,
    primaryLanguage: { name: "TypeScript", color: "#3178c6" },
    updatedAt: "2024-01-01T00:00:00Z",
    isArchived: false,
    isFork: false,
  },
];

// モック統計データ
const mockStats: UserStats = {
  totalStars: 100,
  totalForks: 25,
  totalRepos: 1,
  languageBreakdown: [{ name: "TypeScript", color: "#3178c6", count: 1, percentage: 100 }],
  topRepositories: mockRepositories,
};

describe("GET /api/github/user/[username]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常なリクエストでユーザープロファイルと統計を返す", async () => {
    const { GET } = await importRoute();
    mockGetUserProfile.mockResolvedValue(mockProfile);
    mockGetUserRepositories.mockResolvedValue(mockRepositories);
    mockGetUserEvents.mockResolvedValue([]);
    mockGetUserContributionStats.mockResolvedValue({ totalPRs: 10, totalIssues: 5 });
    mockCalculateUserStats.mockReturnValue(mockStats);

    const request = createRequest();
    const response = await GET(request, {
      params: Promise.resolve({ username: "testuser" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.profile).toEqual(mockProfile);
    expect(data.stats).toEqual(mockStats);
    expect(data.contributionStats).toEqual({ totalPRs: 10, totalIssues: 5 });
  });

  it("ユーザーが見つからない場合は 404 を返す", async () => {
    const { GET } = await importRoute();
    mockGetUserProfile.mockResolvedValue(null);

    const request = createRequest();
    const response = await GET(request, {
      params: Promise.resolve({ username: "nonexistent" }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("User not found");
  });

  it("レート制限エラーの場合は 429 を返す", async () => {
    const { GET } = await importRoute();
    const { GitHubRateLimitError } = await import("@/lib/github/errors");
    mockGetUserProfile.mockRejectedValue(new GitHubRateLimitError());

    const request = createRequest();
    const response = await GET(request, {
      params: Promise.resolve({ username: "testuser" }),
    });

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error).toContain("Rate limit exceeded");
  });

  it("その他のエラーの場合は 500 を返す", async () => {
    const { GET } = await importRoute();
    mockGetUserProfile.mockRejectedValue(new Error("Unknown error"));

    const request = createRequest();
    const response = await GET(request, {
      params: Promise.resolve({ username: "testuser" }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to fetch user data");
  });
});
