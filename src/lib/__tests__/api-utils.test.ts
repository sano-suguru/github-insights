import { describe, it, expect, vi } from "vitest";
import { getErrorMessage } from "../api-utils";

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
