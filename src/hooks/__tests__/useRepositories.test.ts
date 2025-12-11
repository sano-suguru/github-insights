import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

// GitHub API関数のモック
vi.mock("@/lib/github", () => ({
  getRepositories: vi.fn(),
}));

// モック後にインポート
import { getRepositories } from "@/lib/github";
import { useRepositories } from "@/hooks/useRepositories";

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
const mockRepositories = [
  {
    id: "1",
    nameWithOwner: "user/repo1",
    name: "repo1",
    description: "First repository",
    url: "https://github.com/user/repo1",
    isPrivate: false,
    stargazerCount: 100,
    forkCount: 10,
    updatedAt: "2024-01-01T00:00:00Z",
    primaryLanguage: { name: "TypeScript", color: "#3178c6" },
  },
  {
    id: "2",
    nameWithOwner: "user/repo2",
    name: "repo2",
    description: "Second repository",
    url: "https://github.com/user/repo2",
    isPrivate: true,
    stargazerCount: 50,
    forkCount: 5,
    updatedAt: "2024-01-02T00:00:00Z",
    primaryLanguage: { name: "JavaScript", color: "#f7df1e" },
  },
];

describe("useRepositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証トークンがある場合、リポジトリ一覧を取得する", async () => {
    vi.mocked(getRepositories).mockResolvedValue(mockRepositories);

    const { result } = renderHook(() => useRepositories("test-token"), {
      wrapper: createWrapper(),
    });

    // 初期状態はローディング
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRepositories);
    expect(getRepositories).toHaveBeenCalledWith("test-token");
  });

  it("認証トークンがnullの場合、クエリは実行されない", () => {
    const { result } = renderHook(() => useRepositories(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(getRepositories).not.toHaveBeenCalled();
  });

  it("エラー時はisErrorがtrueになる", async () => {
    vi.mocked(getRepositories).mockRejectedValue(new Error("API Error"));

    const { result } = renderHook(() => useRepositories("test-token"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("空のリポジトリリストを正しく処理する", async () => {
    vi.mocked(getRepositories).mockResolvedValue([]);

    const { result } = renderHook(() => useRepositories("test-token"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});
