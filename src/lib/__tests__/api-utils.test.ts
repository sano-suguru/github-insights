import { describe, it, expect, vi } from "vitest";
import { getErrorMessage, sequentialFetch } from "../api-utils";

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
      json: vi.fn().mockResolvedValue({ error: "Rate limit exceeded" }),
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
});
