import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import {
  useLanguageStats,
  useContributorStats,
  useRepositoryStats,
  useContributorDetails,
  useRepoAllData,
} from "@/hooks/useRepoData";

// fetch のモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

// fetchモックヘルパー
function mockFetchResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

// URL に基づいてレスポンスを返すモック設定
function setupFetchMock(responses: Record<string, unknown>) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/github/languages")) {
      return mockFetchResponse(responses.languages ?? mockLanguageStats);
    }
    if (url.includes("/api/github/contributors") && url.includes("type=stats")) {
      return mockFetchResponse(responses.contributorStats ?? mockContributorStats);
    }
    if (url.includes("/api/github/contributors") && url.includes("type=details")) {
      return mockFetchResponse(responses.contributorDetails ?? mockContributorDetails);
    }
    if (url.includes("/api/github/stats")) {
      return mockFetchResponse(responses.stats ?? mockRepositoryStats);
    }
    return mockFetchResponse({ error: "Not found" }, false, 404);
  });
}

describe("useLanguageStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetchMock({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("言語統計を取得して返す", async () => {
    const { result } = renderHook(
      () =>
        useLanguageStats({
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
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/github/languages?owner=owner&repo=repo")
    );
  });

  it("enabled=falseの場合はクエリを実行しない", () => {
    const { result } = renderHook(
      () =>
        useLanguageStats({
          owner: "owner",
          repo: "repo",
          enabled: false,
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("ownerが空の場合はクエリを実行しない", () => {
    const { result } = renderHook(
      () =>
        useLanguageStats({
          owner: "",
          repo: "repo",
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("エラー時はisErrorがtrueになる", async () => {
    mockFetch.mockImplementation(() =>
      mockFetchResponse({ error: "API Error" }, false, 500)
    );

    const { result } = renderHook(
      () =>
        useLanguageStats({
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
    setupFetchMock({});
  });

  it("コントリビューター統計を取得して返す", async () => {
    const { result } = renderHook(
      () =>
        useContributorStats({
          owner: "owner",
          repo: "repo",
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockContributorStats);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/github/contributors?owner=owner&repo=repo&type=stats")
    );
  });
});

describe("useRepositoryStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetchMock({});
  });

  it("リポジトリ統計を取得して返す", async () => {
    const { result } = renderHook(
      () =>
        useRepositoryStats({
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
    setupFetchMock({});
  });

  it("コントリビューター詳細を取得して返す", async () => {
    const { result } = renderHook(
      () =>
        useContributorDetails({
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
    setupFetchMock({});
  });

  it("全データを一括取得する", async () => {
    const { result } = renderHook(
      () =>
        useRepoAllData({
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
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/github/contributors") && url.includes("type=stats")) {
        return mockFetchResponse({ error: "API Error" }, false, 500);
      }
      if (url.includes("/api/github/languages")) {
        return mockFetchResponse(mockLanguageStats);
      }
      if (url.includes("/api/github/contributors") && url.includes("type=details")) {
        return mockFetchResponse(mockContributorDetails);
      }
      if (url.includes("/api/github/stats")) {
        return mockFetchResponse(mockRepositoryStats);
      }
      return mockFetchResponse({ error: "Not found" }, false, 404);
    });

    const { result } = renderHook(
      () =>
        useRepoAllData({
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
          owner: "owner",
          repo: "repo",
          enabled: false,
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.languageStats.fetchStatus).toBe("idle");
    expect(result.current.contributorStats.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
