import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getErrorMessage, isRateLimitText, isRateLimitResponse, fetchApi } from "../api-utils";
import { sequentialFetch } from "../api-server-utils";

describe("sequentialFetch", () => {
  it("タスクを順次実行して結果を配列で返す", async () => {
    const results: number[] = [];
    const task1 = vi.fn(async () => {
      results.push(1);
      return "a";
    });
    const task2 = vi.fn(async () => {
      results.push(2);
      return "b";
    });
    const task3 = vi.fn(async () => {
      results.push(3);
      return "c";
    });

    const output = await sequentialFetch([task1, task2, task3] as const, 0);

    // 順次実行されたことを確認
    expect(results).toEqual([1, 2, 3]);
    // 結果が正しい順序で返されることを確認
    expect(output).toEqual(["a", "b", "c"]);
    // 各タスクが1回だけ呼ばれたことを確認
    expect(task1).toHaveBeenCalledTimes(1);
    expect(task2).toHaveBeenCalledTimes(1);
    expect(task3).toHaveBeenCalledTimes(1);
  });

  it("遅延が正しく適用される", async () => {
    const startTime = Date.now();
    const task1 = vi.fn(async () => "a");
    const task2 = vi.fn(async () => "b");

    await sequentialFetch([task1, task2] as const, 50);

    const elapsed = Date.now() - startTime;
    // 50ms以上かかっているはず（1回の遅延）
    expect(elapsed).toBeGreaterThanOrEqual(40); // マージン考慮
  });

  it("空の配列でも動作する", async () => {
    const output = await sequentialFetch([] as const, 0);
    expect(output).toEqual([]);
  });

  it("単一タスクでは遅延なしで実行される", async () => {
    const startTime = Date.now();
    const task = vi.fn(async () => "result");

    const output = await sequentialFetch([task] as const, 100);

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(50); // 遅延なしなので高速
    expect(output).toEqual(["result"]);
  });

  it("タスクがエラーを投げた場合は伝播する", async () => {
    const task1 = vi.fn(async () => "a");
    const task2 = vi.fn(async () => {
      throw new Error("Task failed");
    });
    const task3 = vi.fn(async () => "c");

    await expect(
      sequentialFetch([task1, task2, task3] as const, 0)
    ).rejects.toThrow("Task failed");

    // task1は実行されたがtask3は実行されない
    expect(task1).toHaveBeenCalledTimes(1);
    expect(task2).toHaveBeenCalledTimes(1);
    expect(task3).not.toHaveBeenCalled();
  });
});

describe("getErrorMessage", () => {
  it("JSONレスポンスからerrorフィールドを取得", async () => {
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      json: vi
        .fn()
        .mockResolvedValue({ error: { code: "RATE_LIMIT", message: "Rate limit exceeded" } }),
      status: 429,
      statusText: "Too Many Requests",
    } as unknown as Response;

    const message = await getErrorMessage(mockResponse, "API error");
    expect(message).toBe("Rate limit exceeded");
  });

  it("JSONにerrorフィールドがない場合はfallbackを使用", async () => {
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      json: vi.fn().mockResolvedValue({ message: "Something went wrong" }),
      status: 500,
      statusText: "Internal Server Error",
    } as unknown as Response;

    const message = await getErrorMessage(mockResponse, "API error");
    expect(message).toBe("API error");
  });

  it("非JSONレスポンスの場合はステータスを含むメッセージを返す", async () => {
    const mockResponse = {
      headers: new Headers({ "content-type": "text/html" }),
      status: 503,
      statusText: "Service Unavailable",
    } as unknown as Response;

    const message = await getErrorMessage(mockResponse, "Server error");
    expect(message).toBe("Server error (503 Service Unavailable)");
  });

  it("Content-Typeヘッダーがない場合はステータスを含むメッセージを返す", async () => {
    const mockResponse = {
      headers: new Headers(),
      status: 404,
      statusText: "Not Found",
    } as unknown as Response;

    const message = await getErrorMessage(mockResponse, "Not found");
    expect(message).toBe("Not found (404 Not Found)");
  });

  it("JSONパースに失敗した場合はステータスのみ返す", async () => {
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      status: 500,
      statusText: "Internal Server Error",
    } as unknown as Response;

    const message = await getErrorMessage(mockResponse, "Parse error");
    expect(message).toBe("Parse error (500)");
  });

  it("error フィールドが文字列の場合はそれを返す", async () => {
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      json: vi.fn().mockResolvedValue({ error: "Simple error message" }),
      status: 400,
      statusText: "Bad Request",
    } as unknown as Response;

    const message = await getErrorMessage(mockResponse, "API error");
    expect(message).toBe("Simple error message");
  });
});

describe("isRateLimitText", () => {
  it("rate limit を含むテキストで true を返す", () => {
    expect(isRateLimitText("API rate limit exceeded")).toBe(true);
    expect(isRateLimitText("Rate Limit Error")).toBe(true);
    expect(isRateLimitText("rate limit")).toBe(true);
  });

  it("rate limit を含まないテキストで false を返す", () => {
    expect(isRateLimitText("Not found")).toBe(false);
    expect(isRateLimitText("Internal server error")).toBe(false);
    expect(isRateLimitText("")).toBe(false);
  });
});

describe("isRateLimitResponse", () => {
  it("ステータス 429 で true を返す", () => {
    expect(isRateLimitResponse(429, "")).toBe(true);
    expect(isRateLimitResponse(429, "Too many requests")).toBe(true);
  });

  it("rate limit テキストを含む場合 true を返す", () => {
    expect(isRateLimitResponse(403, "API rate limit exceeded")).toBe(true);
    expect(isRateLimitResponse(500, "rate limit reached")).toBe(true);
  });

  it("429 でなく rate limit テキストもない場合 false を返す", () => {
    expect(isRateLimitResponse(404, "Not found")).toBe(false);
    expect(isRateLimitResponse(500, "Internal server error")).toBe(false);
  });
});

describe("fetchApi", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("成功時にJSONをパースして返す", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    });

    const result = await fetchApi<{ data: string }>("https://api.example.com/test");
    expect(result).toEqual({ data: "test" });
  });

  it("404エラー時にnotFoundErrorをスロー", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ error: "Resource not found" }),
    });

    await expect(
      fetchApi("https://api.example.com/test", { notFoundError: "REPO_NOT_FOUND" })
    ).rejects.toThrow("REPO_NOT_FOUND");
  });

  it("429エラー時にrateLimitErrorをスロー", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ error: "Rate limit exceeded" }),
    });

    await expect(
      fetchApi("https://api.example.com/test", { rateLimitError: "RATE_LIMITED" })
    ).rejects.toThrow("RATE_LIMITED");
  });

  it("レート制限テキストを含む場合もrateLimitErrorをスロー", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ error: "API rate limit exceeded" }),
    });

    await expect(fetchApi("https://api.example.com/test")).rejects.toThrow("RATE_LIMIT");
  });

  it("その他のエラー時にfetchErrorをスロー", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ error: "Server error" }),
    });

    await expect(
      fetchApi("https://api.example.com/test", { fetchError: "SERVER_ERROR" })
    ).rejects.toThrow("SERVER_ERROR");
  });

  it("デフォルトのエラーメッセージを使用する", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({}),
    });

    await expect(fetchApi("https://api.example.com/test")).rejects.toThrow("NOT_FOUND");
  });
});
