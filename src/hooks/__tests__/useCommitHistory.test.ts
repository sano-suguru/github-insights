import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useCommitHistory, usePrefetchCommitHistory } from "@/hooks/useCommitHistory";

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

// fetchモックヘルパー
function mockFetchResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

// モックデータ（getCommitHistoryの戻り値の型に合わせる）
const mockCommitHistory = [
  {
    committedDate: "2024-01-01T10:00:00Z",
    message: "Initial commit",
    author: {
      name: "User One",
      user: { login: "user1" },
    },
    additions: 100,
    deletions: 0,
  },
  {
    committedDate: "2024-01-02T10:00:00Z",
    message: "Add feature",
    author: {
      name: "User Two",
      user: { login: "user2" },
    },
    additions: 50,
    deletions: 10,
  },
];

describe("useCommitHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation(() => mockFetchResponse(mockCommitHistory));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("コミット履歴を取得して返す", async () => {
    // モックデータにフィルタリングされないよう最近の日付を使用
    const recentCommits = mockCommitHistory.map((c, i) => ({
      ...c,
      committedDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    }));
    mockFetch.mockImplementation(() => mockFetchResponse(recentCommits));

    const { result } = renderHook(
      () =>
        useCommitHistory({
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

    expect(result.current.data).toEqual(recentCommits);
    // ベース期間キャッシュにより、デフォルト30日リクエストは30日でフェッチ
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/github/commits?owner=owner&repo=repo&days=30")
    );
  });

  it("認証済みで90日以上リクエストは365日でフェッチされる", async () => {
    // 認証済み（accessToken あり）で90日以上リクエストすると、ベース期間として365日でフェッチ
    const { result } = renderHook(
      () =>
        useCommitHistory({
          accessToken: "test-token", // 認証済み
          owner: "owner",
          repo: "repo",
          days: 90, // 90日以上
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // 認証済みで90日以上は365日でフェッチ
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/github/commits?owner=owner&repo=repo&days=365")
    );
  });

  it("認証済みで90日未満リクエストは30日でフェッチされる", async () => {
    // 認証済みでも90日未満は30日でフェッチ（キャッシュ効率化のため）
    const { result } = renderHook(
      () =>
        useCommitHistory({
          accessToken: "test-token", // 認証済み
          owner: "owner",
          repo: "repo",
          days: 89,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // 認証済みでも90日未満は30日でフェッチ
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/github/commits?owner=owner&repo=repo&days=30")
    );
  });

  it("未認証で90日リクエストは30日でフェッチされる", async () => {
    // 未認証（accessToken: null）は常に30日でフェッチ
    const { result } = renderHook(
      () =>
        useCommitHistory({
          accessToken: null, // 未認証
          owner: "owner",
          repo: "repo",
          days: 90,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // 未認証時は常に30日でフェッチ
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/github/commits?owner=owner&repo=repo&days=30")
    );
  });

  it("認証済みでdays=nullは全期間（null）でフェッチされる", async () => {
    const { result } = renderHook(
      () =>
        useCommitHistory({
          accessToken: "test-token", // 認証済み
          owner: "owner",
          repo: "repo",
          days: null,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // 認証済みでdays=nullは全期間（null）でフェッチ
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("days=null")
    );
  });

  it("未認証でdays=nullでも30日でフェッチされる", async () => {
    const { result } = renderHook(
      () =>
        useCommitHistory({
          accessToken: null, // 未認証
          owner: "owner",
          repo: "repo",
          days: null,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // 未認証時は常に30日でフェッチ
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("days=30")
    );
  });

  it("enabled=false の場合はクエリを実行しない", () => {
    const { result } = renderHook(
      () =>
        useCommitHistory({
          accessToken: null,
          owner: "owner",
          repo: "repo",
          enabled: false,
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("owner が空の場合はクエリを実行しない", () => {
    const { result } = renderHook(
      () =>
        useCommitHistory({
          accessToken: null,
          owner: "",
          repo: "repo",
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("repo が空の場合はクエリを実行しない", () => {
    const { result } = renderHook(
      () =>
        useCommitHistory({
          accessToken: null,
          owner: "owner",
          repo: "",
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("エラー時は isError が true になる", async () => {
    mockFetch.mockImplementation(() =>
      mockFetchResponse({ error: "API Error" }, false, 500)
    );

    const { result } = renderHook(
      () =>
        useCommitHistory({
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

  it("queryKey に days が含まれる（キャッシュの分離）", async () => {
    // 30日のフック
    const { result: result30 } = renderHook(
      () =>
        useCommitHistory({
          accessToken: null,
          owner: "owner",
          repo: "repo",
          days: 30,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result30.current.isSuccess).toBe(true);
    });

    // 90日のフック（別のwrapperで新しいQueryClient）
    const { result: result90 } = renderHook(
      () =>
        useCommitHistory({
          accessToken: null,
          owner: "owner",
          repo: "repo",
          days: 90,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result90.current.isSuccess).toBe(true);
    });

    // 両方のクエリが実行される（キャッシュが分離されている）
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("認証済みで365日超過リクエストは全期間（null）でフェッチされる", async () => {
    const { result } = renderHook(
      () =>
        useCommitHistory({
          accessToken: "test-token", // 認証済み
          owner: "owner",
          repo: "repo",
          days: 400, // 365日超過
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // 認証済みで365日超過は全期間（null）でフェッチ
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("days=null")
    );
  });
});

describe("usePrefetchCommitHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation(() => mockFetchResponse(mockCommitHistory));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("プリフェッチ関数を返す", () => {
    const { result } = renderHook(() => usePrefetchCommitHistory(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current).toBe("function");
  });

  it("キャッシュがない場合はプリフェッチを実行", async () => {
    const { result } = renderHook(() => usePrefetchCommitHistory(), {
      wrapper: createWrapper(),
    });

    // プリフェッチ実行
    result.current(null, "owner", "repo", 30);

    // フェッチが呼ばれる
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/github/commits?owner=owner&repo=repo&days=30")
      );
    });
  });

  it("認証済みで90日超過は365日でプリフェッチ", async () => {
    const { result } = renderHook(() => usePrefetchCommitHistory(), {
      wrapper: createWrapper(),
    });

    result.current("test-token", "owner", "repo", 180);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("days=365")
      );
    });
  });

  it("認証済みでdays=nullは全期間でプリフェッチ", async () => {
    const { result } = renderHook(() => usePrefetchCommitHistory(), {
      wrapper: createWrapper(),
    });

    result.current("test-token", "owner", "repo", null);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("days=null")
      );
    });
  });

  it("キャッシュがある場合はプリフェッチをスキップ", async () => {
    // まずデータをキャッシュに入れる
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    queryClient.setQueryData(["commitHistory", "owner", "repo", 30], mockCommitHistory);

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => usePrefetchCommitHistory(), { wrapper });

    // プリフェッチ実行
    result.current(null, "owner", "repo", 30);

    // キャッシュがあるのでフェッチはスキップ
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
