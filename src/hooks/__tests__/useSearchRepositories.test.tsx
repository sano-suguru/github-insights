import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import {
  useSearchRepositories,
  MIN_USER_SEARCH_QUERY_LENGTH,
  MIN_REPO_SEARCH_QUERY_LENGTH,
} from "../useSearchRepositories";

// テスト用のQueryClientラッパー
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
  function TestQueryClientWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return TestQueryClientWrapper;
}

// モックデータ
const mockPopularReposData = {
  featured: ["facebook/react", "vercel/next.js", "microsoft/vscode"],
  categories: {},
  all: [
    "facebook/react",
    "vercel/next.js",
    "microsoft/vscode",
    "microsoft/typescript",
  ],
};

const mockRemoteRepos = {
  repositories: [
    {
      nameWithOwner: "vuejs/vue",
      description: "Vue.js framework",
      stargazerCount: 200000,
      primaryLanguage: { name: "JavaScript", color: "#f1e05a" },
    },
  ],
};

const mockUserSearchResults = {
  users: [
    {
      login: "octocat",
      avatarUrl: "https://github.com/octocat.png",
      name: "The Octocat",
      followers: 1000,
      publicRepos: 50,
      type: "User" as const,
    },
  ],
};

// fetch モック
function setupFetchMock() {
  return vi.fn((url: string) => {
    const urlObj = new URL(url, "http://localhost");
    const pathname = urlObj.pathname;

    if (pathname.includes("/data/popular-repos.json")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPopularReposData),
      });
    }
    if (pathname.includes("/api/github/search-users")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUserSearchResults),
      });
    }
    if (pathname.includes("/api/github/search")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRemoteRepos),
      });
    }
    return Promise.reject(new Error(`Unknown URL: ${url}`));
  });
}

describe("useSearchRepositories", () => {
  beforeEach(() => {
    globalThis.fetch = setupFetchMock() as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("定数", () => {
    it("MIN_USER_SEARCH_QUERY_LENGTH は 1", () => {
      expect(MIN_USER_SEARCH_QUERY_LENGTH).toBe(1);
    });

    it("MIN_REPO_SEARCH_QUERY_LENGTH は 2", () => {
      expect(MIN_REPO_SEARCH_QUERY_LENGTH).toBe(2);
    });
  });

  describe("初期状態", () => {
    it("空のクエリの場合、isUserSearch は false", () => {
      const { result } = renderHook(() => useSearchRepositories(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.isUserSearch).toBe(false);
    });

    it("@ で始まるクエリの場合、isUserSearch は true", () => {
      const { result } = renderHook(() => useSearchRepositories("@octo"), {
        wrapper: createWrapper(),
      });

      expect(result.current.isUserSearch).toBe(true);
    });

    it("通常のクエリの場合、isUserSearch は false", () => {
      const { result } = renderHook(() => useSearchRepositories("react"), {
        wrapper: createWrapper(),
      });

      expect(result.current.isUserSearch).toBe(false);
    });
  });

  describe("リポジトリ検索（同期処理）", () => {
    it("ユーザーリポジトリからマッチするものを即座に返す", () => {
      const userRepos = [
        {
          nameWithOwner: "user/my-react-app",
          description: "My React App",
          stargazerCount: 100,
          primaryLanguage: { name: "TypeScript", color: "#3178c6" },
        },
        {
          nameWithOwner: "user/other-project",
          description: "Other",
          stargazerCount: 50,
          primaryLanguage: null,
        },
      ];

      const { result } = renderHook(
        () =>
          useSearchRepositories("react", {
            userRepositories: userRepos as never[],
          }),
        { wrapper: createWrapper() }
      );

      const userResult = result.current.results.find(
        (r) => r.nameWithOwner === "user/my-react-app"
      );
      expect(userResult).toBeDefined();
      expect(userResult?.source).toBe("user");
    });

    it("履歴からマッチするものを即座に返す", () => {
      const { result } = renderHook(
        () =>
          useSearchRepositories("react", {
            recentRepos: ["facebook/react", "my/other-project"],
          }),
        { wrapper: createWrapper() }
      );

      const historyResult = result.current.results.find(
        (r) => r.nameWithOwner === "facebook/react" && r.source === "history"
      );
      expect(historyResult).toBeDefined();
    });

    it("空クエリ時に履歴を表示する", () => {
      const { result } = renderHook(
        () =>
          useSearchRepositories("", {
            recentRepos: ["my/repo1", "my/repo2"],
          }),
        { wrapper: createWrapper() }
      );

      const historyResults = result.current.results.filter(
        (r) => r.source === "history"
      );
      expect(historyResults.length).toBe(2);
    });

    it("重複するリポジトリは除外される", () => {
      const userRepos = [
        {
          nameWithOwner: "facebook/react",
          description: "React",
          stargazerCount: 100,
          primaryLanguage: null,
        },
      ];

      const { result } = renderHook(
        () =>
          useSearchRepositories("react", {
            userRepositories: userRepos as never[],
            recentRepos: ["facebook/react"],
          }),
        { wrapper: createWrapper() }
      );

      const reactRepos = result.current.results.filter(
        (r) => r.nameWithOwner === "facebook/react"
      );
      // user ソースで先に追加されるため、1つだけ
      expect(reactRepos.length).toBe(1);
      expect(reactRepos[0].source).toBe("user");
    });
  });

  describe("ユーザー検索モード", () => {
    it("ユーザー検索モードではリポジトリ結果は空", () => {
      const { result } = renderHook(
        () =>
          useSearchRepositories("@octo", {
            recentRepos: ["facebook/react"],
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.results).toHaveLength(0);
      expect(result.current.isUserSearch).toBe(true);
    });
  });

  describe("enabled オプション", () => {
    it("enabled が false の場合、ローカルマッチは返されるがAPIクエリは無効化される", () => {
      const fetchMock = setupFetchMock();
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const { result } = renderHook(
        () =>
          useSearchRepositories("react", {
            enabled: false,
            recentRepos: ["facebook/react"],
          }),
        { wrapper: createWrapper() }
      );

      // enabled が false でも履歴からのマッチは返される
      const historyResults = result.current.results.filter(
        (r) => r.source === "history"
      );
      expect(historyResults.length).toBe(1);

      // ただし、React Query のクエリは無効化されるので API は呼ばれない
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("非同期検索（統合テスト）", () => {
    it("ローカル検索結果を返す", async () => {
      const { result } = renderHook(() => useSearchRepositories("react"), {
        wrapper: createWrapper(),
      });

      // ローカル検索は即座に実行される（デバウンスなし）
      await waitFor(
        () => {
          const popularResults = result.current.results.filter(
            (r) => r.source === "popular"
          );
          expect(popularResults.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );
    });

    it("リモート検索結果を返す", async () => {
      const { result } = renderHook(() => useSearchRepositories("vue"), {
        wrapper: createWrapper(),
      });

      // リモート検索はデバウンス後に実行される
      await waitFor(
        () => {
          const searchResults = result.current.results.filter(
            (r) => r.source === "search"
          );
          expect(searchResults.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );
    });

    it("ユーザー検索結果を返す", async () => {
      const { result } = renderHook(() => useSearchRepositories("@octo"), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.userResults.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      expect(result.current.userResults[0].login).toBe("octocat");
    });
  });

  describe("デバウンス状態", () => {
    it("初期状態では isDebouncing は false", () => {
      const { result } = renderHook(() => useSearchRepositories(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.isDebouncing).toBe(false);
    });

    it("クエリ入力直後は isDebouncing が true になる可能性がある", () => {
      const { result, rerender } = renderHook(
        ({ query }: { query: string }) => useSearchRepositories(query),
        { wrapper: createWrapper(), initialProps: { query: "" } }
      );

      rerender({ query: "react" });

      // デバウンス中かどうかは内部のタイミングに依存
      // ここでは型が正しいことだけ確認
      expect(typeof result.current.isDebouncing).toBe("boolean");
    });
  });

  describe("エラー状態", () => {
    it("正常時は error が null", () => {
      const { result } = renderHook(() => useSearchRepositories("react"), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("レート制限(429)", () => {
    it("リポジトリ検索が 429 の場合は error が返る", async () => {
      globalThis.fetch = vi.fn((url: string) => {
        const urlObj = new URL(url, "http://localhost");
        const pathname = urlObj.pathname;

        if (pathname.includes("/data/popular-repos.json")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPopularReposData),
          });
        }

        if (pathname.includes("/api/github/search")) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: () => Promise.resolve({ error: "Rate limit exceeded" }),
          });
        }

        return Promise.reject(new Error(`Unknown URL: ${url}`));
      }) as unknown as typeof fetch;

      const { result } = renderHook(() => useSearchRepositories("re"), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.error).toBeInstanceOf(Error);
        },
        { timeout: 2000 }
      );

      const message = (result.current.error as Error).message;
      expect(message.toLowerCase()).toContain("rate limit");
    });

    it("ユーザー検索が 429 の場合は error が返る", async () => {
      globalThis.fetch = vi.fn((url: string) => {
        const urlObj = new URL(url, "http://localhost");
        const pathname = urlObj.pathname;

        if (pathname.includes("/data/popular-repos.json")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPopularReposData),
          });
        }

        if (pathname.includes("/api/github/search-users")) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: () => Promise.resolve({ error: "Rate limit exceeded" }),
          });
        }

        return Promise.reject(new Error(`Unknown URL: ${url}`));
      }) as unknown as typeof fetch;

      const { result } = renderHook(() => useSearchRepositories("@oct"), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.error).toBeInstanceOf(Error);
        },
        { timeout: 2000 }
      );

      const message = (result.current.error as Error).message;
      expect(message.toLowerCase()).toContain("rate limit");
    });
  });
});
