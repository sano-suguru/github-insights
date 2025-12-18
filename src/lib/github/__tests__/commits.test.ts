/**
 * commits.ts のテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCommitHistory } from "../commits";

// client.ts をモック
vi.mock("../client", () => ({
  createGitHubClient: vi.fn(),
  createPublicGitHubClient: vi.fn(),
}));

// errors.ts をモック
vi.mock("../errors", () => ({
  isRateLimitError: vi.fn((error) => {
    return error instanceof Error && error.message.includes("rate limit");
  }),
}));

import { createGitHubClient, createPublicGitHubClient } from "../client";

describe("getCommitHistory", () => {
  const mockCommits = [
    {
      committedDate: "2024-01-15T10:00:00Z",
      author: { name: "Alice", user: { login: "alice" } },
      additions: 100,
      deletions: 50,
      message: "feat: add new feature",
    },
    {
      committedDate: "2024-01-14T09:00:00Z",
      author: { name: "Bob", user: { login: "bob" } },
      additions: 20,
      deletions: 10,
      message: "fix: bug fix",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("未認証でコミット履歴を取得できる", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        defaultBranchRef: {
          target: {
            history: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: mockCommits,
            },
          },
        },
      },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const result = await getCommitHistory(null, "owner", "repo");

    expect(createPublicGitHubClient).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0].message).toBe("feat: add new feature");
  });

  it("認証済みでコミット履歴を取得できる", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        defaultBranchRef: {
          target: {
            history: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: mockCommits,
            },
          },
        },
      },
    });
    vi.mocked(createGitHubClient).mockReturnValue(mockClient as never);

    const result = await getCommitHistory("token", "owner", "repo");

    expect(createGitHubClient).toHaveBeenCalledWith("token");
    expect(result).toHaveLength(2);
  });

  it("days オプションで期間を指定できる", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        defaultBranchRef: {
          target: {
            history: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: mockCommits,
            },
          },
        },
      },
    });
    vi.mocked(createGitHubClient).mockReturnValue(mockClient as never);

    await getCommitHistory("token", "owner", "repo", { days: 7 });

    expect(mockClient).toHaveBeenCalled();
    const callArgs = mockClient.mock.calls[0][1];
    expect(callArgs.since).toBeDefined();
  });

  it("days: null で全期間を取得", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        defaultBranchRef: {
          target: {
            history: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [],
            },
          },
        },
      },
    });
    vi.mocked(createGitHubClient).mockReturnValue(mockClient as never);

    await getCommitHistory("token", "owner", "repo", { days: null });

    const callArgs = mockClient.mock.calls[0][1];
    expect(callArgs.since).toBeNull();
  });

  it("defaultBranchRef が null の場合は空配列を返す", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        defaultBranchRef: null,
      },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const result = await getCommitHistory(null, "owner", "repo");

    expect(result).toEqual([]);
  });

  it("ページネーションで複数ページを取得", async () => {
    const mockClient = vi
      .fn()
      .mockResolvedValueOnce({
        repository: {
          defaultBranchRef: {
            target: {
              history: {
                pageInfo: { hasNextPage: true, endCursor: "cursor1" },
                nodes: [mockCommits[0]],
              },
            },
          },
        },
      })
      .mockResolvedValueOnce({
        repository: {
          defaultBranchRef: {
            target: {
              history: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [mockCommits[1]],
              },
            },
          },
        },
      });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    // タイマーを進める必要がある
    const resultPromise = getCommitHistory(null, "owner", "repo");
    
    // 2回目のリクエスト前の100ms待機を進める
    await vi.advanceTimersByTimeAsync(100);

    const result = await resultPromise;

    expect(mockClient).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it("レート制限時にリトライする", async () => {
    const rateLimitError = new Error("rate limit exceeded");
    const mockClient = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce({
        repository: {
          defaultBranchRef: {
            target: {
              history: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: mockCommits,
              },
            },
          },
        },
      });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    const resultPromise = getCommitHistory(null, "owner", "repo");
    
    // リトライの1秒待機を進める
    await vi.advanceTimersByTimeAsync(1000);

    const result = await resultPromise;

    expect(mockClient).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it("非レート制限エラーはリトライせずにスロー", async () => {
    const genericError = new Error("Network error");
    const mockClient = vi.fn().mockRejectedValue(genericError);
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    await expect(getCommitHistory(null, "owner", "repo")).rejects.toThrow("Network error");
    expect(mockClient).toHaveBeenCalledTimes(1);
  });
});
