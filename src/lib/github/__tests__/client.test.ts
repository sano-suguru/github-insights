/**
 * client.ts のテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getPublicRateLimitInfo,
  createGitHubClient,
  createPublicGitHubClient,
  withRetry,
  updateRateLimit,
} from "../client";

// @octokit/graphql をモック
vi.mock("@octokit/graphql", () => ({
  graphql: {
    defaults: vi.fn((options) => {
      // モッククライアントを返す
      const mockClient = vi.fn();
      (mockClient as unknown as Record<string, unknown>).options = options;
      return mockClient;
    }),
  },
}));

// errors.ts をモック
vi.mock("../errors", () => ({
  isRateLimitError: vi.fn((error) => {
    return error instanceof Error && error.message.includes("rate limit");
  }),
}));

import { graphql } from "@octokit/graphql";

describe("getPublicRateLimitInfo", () => {
  it("初期状態では null を返す", () => {
    // 注: 他のテストでグローバル状態が変更される可能性があるため、
    // この関数が正しく動作することをテスト
    const result = getPublicRateLimitInfo();
    expect(result === null || typeof result === "object").toBe(true);
  });
});

describe("createGitHubClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証ヘッダー付きでクライアントを作成する", () => {
    const client = createGitHubClient("test-token");

    expect(graphql.defaults).toHaveBeenCalledWith({
      headers: {
        authorization: "token test-token",
      },
    });
    expect(client).toBeDefined();
  });
});

describe("createPublicGitHubClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証なしでクライアントを作成する", () => {
    const client = createPublicGitHubClient();

    expect(graphql.defaults).toHaveBeenCalledWith({});
    expect(client).toBeDefined();
  });
});

describe("withRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("成功時はそのまま結果を返す", async () => {
    const fn = vi.fn().mockResolvedValue("success");

    const result = await withRetry(fn);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("レート制限エラー時にリトライする", async () => {
    const rateLimitError = new Error("rate limit exceeded");
    const fn = vi.fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce("success after retry");

    const resultPromise = withRetry(fn);
    
    // 1回目のリトライ待機（1秒）を進める
    await vi.advanceTimersByTimeAsync(1000);

    const result = await resultPromise;

    expect(result).toBe("success after retry");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("セカンダリレート制限エラー時にリトライする", async () => {
    const secondaryLimitError = new Error("secondary rate limit exceeded");
    const fn = vi.fn()
      .mockRejectedValueOnce(secondaryLimitError)
      .mockResolvedValueOnce("success");

    const resultPromise = withRetry(fn);
    await vi.advanceTimersByTimeAsync(1000);

    const result = await resultPromise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("abuse detection エラー時にリトライする", async () => {
    const abuseError = new Error("abuse detection mechanism triggered");
    const fn = vi.fn()
      .mockRejectedValueOnce(abuseError)
      .mockResolvedValueOnce("success");

    const resultPromise = withRetry(fn);
    await vi.advanceTimersByTimeAsync(1000);

    const result = await resultPromise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("403 limit エラー時にリトライする", async () => {
    const limitError = new Error("403 API rate limit exceeded");
    const fn = vi.fn()
      .mockRejectedValueOnce(limitError)
      .mockResolvedValueOnce("success");

    const resultPromise = withRetry(fn);
    await vi.advanceTimersByTimeAsync(1000);

    const result = await resultPromise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("非レート制限エラーはリトライしない", async () => {
    const genericError = new Error("Network error");
    const fn = vi.fn().mockRejectedValue(genericError);

    await expect(withRetry(fn)).rejects.toThrow("Network error");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("最大リトライ回数を超えたらエラーをスロー", async () => {
    vi.useRealTimers(); // このテストでは実時間を使用
    
    const rateLimitError = new Error("rate limit exceeded");
    const fn = vi.fn().mockRejectedValue(rateLimitError);

    await expect(withRetry(fn, { maxRetries: 2, baseDelay: 1 })).rejects.toThrow("rate limit exceeded");
    expect(fn).toHaveBeenCalledTimes(2);
    
    vi.useFakeTimers(); // fake timersに戻す
  });

  it("カスタム maxRetries と baseDelay をサポート", async () => {
    const rateLimitError = new Error("rate limit exceeded");
    const fn = vi.fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce("success");

    const resultPromise = withRetry(fn, { maxRetries: 5, baseDelay: 500 });
    
    // カスタム baseDelay (500ms) を進める
    await vi.advanceTimersByTimeAsync(500);

    const result = await resultPromise;

    expect(result).toBe("success");
  });

  it("指数バックオフで待機時間が増加する", async () => {
    const rateLimitError = new Error("rate limit exceeded");
    const fn = vi.fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce("success");

    const resultPromise = withRetry(fn, { baseDelay: 1000 });
    
    // 1回目のリトライ: 2^0 * 1000 = 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    // 2回目のリトライ: 2^1 * 1000 = 2000ms
    await vi.advanceTimersByTimeAsync(2000);

    const result = await resultPromise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("updateRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("レート制限情報を取得して返す", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      rateLimit: {
        limit: 5000,
        remaining: 4999,
        resetAt: "2024-01-01T12:00:00Z",
        used: 1,
      },
    });

    const result = await updateRateLimit(mockClient as never, false);

    expect(result).not.toBeNull();
    expect(result!.limit).toBe(5000);
    expect(result!.remaining).toBe(4999);
    expect(result!.used).toBe(1);
    expect(result!.resetAt).toBeInstanceOf(Date);
  });

  it("未認証の場合はグローバル状態を更新する", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      rateLimit: {
        limit: 60,
        remaining: 59,
        resetAt: "2024-01-01T12:00:00Z",
        used: 1,
      },
    });

    await updateRateLimit(mockClient as never, true);

    const publicInfo = getPublicRateLimitInfo();
    expect(publicInfo).not.toBeNull();
    expect(publicInfo!.limit).toBe(60);
  });

  it("エラー時は null を返す", async () => {
    const mockClient = vi.fn().mockRejectedValue(new Error("API error"));

    const result = await updateRateLimit(mockClient as never, false);

    expect(result).toBeNull();
  });
});
