import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

// GitHub API関数のモック
vi.mock("@/lib/github", () => ({
  getLanguageStats: vi.fn(),
  getContributorStats: vi.fn(),
  getRepositoryStats: vi.fn(),
  getContributorDetails: vi.fn(),
}));

// モック後にインポート
import {
  getLanguageStats,
  getContributorStats,
  getRepositoryStats,
  getContributorDetails,
} from "@/lib/github";
import {
  useLanguageStats,
  useContributorStats,
  useRepositoryStats,
  useContributorDetails,
  useRepoAllData,
} from "@/hooks/useRepoData";

// テスト用のQueryClient wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = "TestQueryClientWrapper";
  return Wrapper;
}

// モックデータ
const mockLanguageStats = [
  { name: "TypeScript", color: "#3178c6", size: 50000, percentage: 50 },
  { name: "JavaScript", color: "#f7df1e", size: 30000, percentage: 30 },
];

const mockContributorStats = [
  { login: "user1", name: "User One", avatarUrl: "https://avatar1.png", commits: 100 },
  { login: "user2", name: "User Two", avatarUrl: "https://avatar2.png", commits: 50 },
];

const mockRepositoryStats = {
  name: "test-repo",
  description: "A test repository",
  stars: 100,
  forks: 25,
  watchers: 50,
  issues: 10,
  pullRequests: 5,
  commits: 500,
};

const mockContributorDetails = [
  {
    login: "user1",
    avatarUrl: "https://avatar1.png",
    name: "User One",
    commits: 100,
    additions: 5000,
    deletions: 2000,
    pullRequests: 20,
    reviews: 15,
    score: 100,
    rank: 1,
  },
];

describe("useLanguageStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("言語統計を取得して返す", async () => {
    vi.mocked(getLanguageStats).mockResolvedValue(mockLanguageStats);

    const { result } = renderHook(
      () =>
        useLanguageStats({
          accessToken: null,
          owner: "owner",
          repo: "repo",
        }),
      { wrapper: createWrapper() }
    );

    // 初期状態はローディング
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockLanguageStats);
    expect(getLanguageStats).toHaveBeenCalledWith(null, "owner", "repo");
  });

  it("enabled=falseの場合はクエリを実行しない", () => {
    const { result } = renderHook(
      () =>
        useLanguageStats({
          accessToken: null,
          owner: "owner",
          repo: "repo",
          enabled: false,
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(getLanguageStats).not.toHaveBeenCalled();
  });

  it("ownerが空の場合はクエリを実行しない", () => {
    const { result } = renderHook(
      () =>
        useLanguageStats({
          accessToken: null,
          owner: "",
          repo: "repo",
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(getLanguageStats).not.toHaveBeenCalled();
  });

  it("エラー時はisErrorがtrueになる", async () => {
    vi.mocked(getLanguageStats).mockRejectedValue(new Error("API Error"));

    const { result } = renderHook(
      () =>
        useLanguageStats({
          accessToken: null,
          owner: "owner",
          repo: "repo",
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe("useContributorStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("コントリビューター統計を取得して返す", async () => {
    vi.mocked(getContributorStats).mockResolvedValue(mockContributorStats);

    const { result } = renderHook(
      () =>
        useContributorStats({
          accessToken: "test-token",
          owner: "owner",
          repo: "repo",
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockContributorStats);
    expect(getContributorStats).toHaveBeenCalledWith("test-token", "owner", "repo");
  });
});

describe("useRepositoryStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("リポジトリ統計を取得して返す", async () => {
    vi.mocked(getRepositoryStats).mockResolvedValue(mockRepositoryStats);

    const { result } = renderHook(
      () =>
        useRepositoryStats({
          accessToken: null,
          owner: "owner",
          repo: "repo",
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRepositoryStats);
  });
});

describe("useContributorDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("コントリビューター詳細を取得して返す", async () => {
    vi.mocked(getContributorDetails).mockResolvedValue(mockContributorDetails);

    const { result } = renderHook(
      () =>
        useContributorDetails({
          accessToken: null,
          owner: "owner",
          repo: "repo",
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockContributorDetails);
  });
});

describe("useRepoAllData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("全データを一括取得する", async () => {
    vi.mocked(getLanguageStats).mockResolvedValue(mockLanguageStats);
    vi.mocked(getContributorStats).mockResolvedValue(mockContributorStats);
    vi.mocked(getContributorDetails).mockResolvedValue(mockContributorDetails);
    vi.mocked(getRepositoryStats).mockResolvedValue(mockRepositoryStats);

    const { result } = renderHook(
      () =>
        useRepoAllData({
          accessToken: null,
          owner: "owner",
          repo: "repo",
        }),
      { wrapper: createWrapper() }
    );

    // 初期状態はローディング
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.languageStats.data).toEqual(mockLanguageStats);
    expect(result.current.contributorStats.data).toEqual(mockContributorStats);
    expect(result.current.contributorDetails.data).toEqual(mockContributorDetails);
    expect(result.current.repositoryStats.data).toEqual(mockRepositoryStats);
    expect(result.current.isError).toBe(false);
  });

  it("一部のクエリがエラーの場合isErrorがtrueになる", async () => {
    vi.mocked(getLanguageStats).mockResolvedValue(mockLanguageStats);
    vi.mocked(getContributorStats).mockRejectedValue(new Error("API Error"));
    vi.mocked(getContributorDetails).mockResolvedValue(mockContributorDetails);
    vi.mocked(getRepositoryStats).mockResolvedValue(mockRepositoryStats);

    const { result } = renderHook(
      () =>
        useRepoAllData({
          accessToken: null,
          owner: "owner",
          repo: "repo",
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.contributorStats.isError).toBe(true);
  });

  it("enabled=falseの場合は全クエリが実行されない", () => {
    const { result } = renderHook(
      () =>
        useRepoAllData({
          accessToken: null,
          owner: "owner",
          repo: "repo",
          enabled: false,
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.languageStats.fetchStatus).toBe("idle");
    expect(result.current.contributorStats.fetchStatus).toBe("idle");
    expect(getLanguageStats).not.toHaveBeenCalled();
    expect(getContributorStats).not.toHaveBeenCalled();
  });
});
