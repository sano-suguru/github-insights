import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";
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
const mockGetContributionCalendar = vi.fn<() => Promise<{ totalContributions: number; longestStreak: number; currentStreak: number }>>();
const mockCalculateUserStats = vi.fn<() => UserStats>();
vi.mock("@/lib/github/user", () => ({
  getUserProfile: () => mockGetUserProfile(),
  getUserRepositories: () => mockGetUserRepositories(),
  getUserEvents: () => mockGetUserEvents(),
  getUserContributionStats: () => mockGetUserContributionStats(),
  getContributionCalendar: () => mockGetContributionCalendar(),
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
const mockAuth = vi.fn<() => Promise<Session | null>>();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
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
    // デフォルトで認証済み状態を設定
    mockAuth.mockResolvedValue({ accessToken: "test-token" } as Session);
    // デフォルトでストリークのモックを設定
    mockGetContributionCalendar.mockResolvedValue({ totalContributions: 0, longestStreak: 0, currentStreak: 0 });
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
    mockGetContributionCalendar.mockResolvedValue({ totalContributions: 500, longestStreak: 30, currentStreak: 7 });
    mockCalculateUserStats.mockReturnValue(mockStats);

    const request = createRequest();
    const response = await GET(request, {
      params: Promise.resolve({ username: "testuser" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.profile).toEqual(mockProfile);
    expect(data.stats).toEqual(mockStats);
    expect(data.contributionStats).toEqual({
      totalPRs: 10,
      totalIssues: 5,
      currentStreak: 7,
      longestStreak: 30,
    });
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
    expect(data.error).toEqual({
      code: "NOT_FOUND",
      message: "User not found",
    });
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
    expect(data.error.code).toBe("RATE_LIMIT");
    expect(data.error.message).toContain("Rate limit exceeded");
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
    expect(data.error).toEqual({
      code: "INTERNAL",
      message: "Failed to fetch user data",
    });
  });

  it("未認証時はストリークを取得しない", async () => {
    // auth モックを未認証状態に変更
    mockAuth.mockResolvedValue(null);

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
    
    // 未認証時はストリークが undefined（JSON では省略される）
    expect(data.contributionStats.currentStreak).toBeUndefined();
    expect(data.contributionStats.longestStreak).toBeUndefined();
    // getContributionCalendar が呼ばれていないことを確認
    expect(mockGetContributionCalendar).not.toHaveBeenCalled();
  });

  it("認証済み時はストリークを取得する", async () => {
    const { GET } = await importRoute();
    mockGetUserProfile.mockResolvedValue(mockProfile);
    mockGetUserRepositories.mockResolvedValue(mockRepositories);
    mockGetUserEvents.mockResolvedValue([]);
    mockGetUserContributionStats.mockResolvedValue({ totalPRs: 10, totalIssues: 5 });
    mockGetContributionCalendar.mockResolvedValue({ totalContributions: 500, longestStreak: 30, currentStreak: 7 });
    mockCalculateUserStats.mockReturnValue(mockStats);

    const request = createRequest();
    const response = await GET(request, {
      params: Promise.resolve({ username: "testuser" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    // 認証済み時はストリークが取得される
    expect(data.contributionStats.currentStreak).toBe(7);
    expect(data.contributionStats.longestStreak).toBe(30);
    // getContributionCalendar が呼ばれていることを確認
    expect(mockGetContributionCalendar).toHaveBeenCalled();
  });
});
