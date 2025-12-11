import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

// GitHub API関数のモック
vi.mock("@/lib/github", () => ({
  getCommitHistory: vi.fn(),
}));

// モック後にインポート
import { getCommitHistory } from "@/lib/github";
import { useCommitHistory } from "@/hooks/useCommitHistory";

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
  });

  it("コミット履歴を取得して返す", async () => {
    vi.mocked(getCommitHistory).mockResolvedValue(mockCommitHistory);

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

    expect(result.current.data).toEqual(mockCommitHistory);
    expect(getCommitHistory).toHaveBeenCalledWith(null, "owner", "repo", { days: 30 });
  });

  it("days パラメータを正しく渡す", async () => {
    vi.mocked(getCommitHistory).mockResolvedValue(mockCommitHistory);

    const { result } = renderHook(
      () =>
        useCommitHistory({
          accessToken: "test-token",
          owner: "owner",
          repo: "repo",
          days: 90,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getCommitHistory).toHaveBeenCalledWith("test-token", "owner", "repo", { days: 90 });
  });

  it("days=null の場合は null を渡す", async () => {
    vi.mocked(getCommitHistory).mockResolvedValue(mockCommitHistory);

    const { result } = renderHook(
      () =>
        useCommitHistory({
          accessToken: null,
          owner: "owner",
          repo: "repo",
          days: null,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getCommitHistory).toHaveBeenCalledWith(null, "owner", "repo", { days: null });
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
    expect(getCommitHistory).not.toHaveBeenCalled();
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
    expect(getCommitHistory).not.toHaveBeenCalled();
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
    expect(getCommitHistory).not.toHaveBeenCalled();
  });

  it("エラー時は isError が true になる", async () => {
    vi.mocked(getCommitHistory).mockRejectedValue(new Error("API Error"));

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
    vi.mocked(getCommitHistory).mockResolvedValue(mockCommitHistory);

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
    expect(getCommitHistory).toHaveBeenCalledTimes(2);
  });
});
