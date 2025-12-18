import { describe, it, expect } from "vitest";
import { GitHubRateLimitError, isRateLimitError } from "../errors";

describe("GitHubRateLimitError", () => {
  it("デフォルトメッセージで作成できる", () => {
    const error = new GitHubRateLimitError();

    expect(error.message).toBe("GitHub API rate limit exceeded");
    expect(error.name).toBe("GitHubRateLimitError");
  });

  it("カスタムメッセージで作成できる", () => {
    const error = new GitHubRateLimitError("Custom rate limit message");

    expect(error.message).toBe("Custom rate limit message");
    expect(error.name).toBe("GitHubRateLimitError");
  });

  it("Error のインスタンスである", () => {
    const error = new GitHubRateLimitError();

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(GitHubRateLimitError);
  });
});

describe("isRateLimitError", () => {
  it("GitHubRateLimitError の場合は true を返す", () => {
    const error = new GitHubRateLimitError();

    expect(isRateLimitError(error)).toBe(true);
  });

  it("'rate limit' を含むエラーメッセージの場合は true を返す", () => {
    const error = new Error("API rate limit exceeded");

    expect(isRateLimitError(error)).toBe(true);
  });

  it("'Rate Limit' (大文字) を含むエラーメッセージの場合も true を返す", () => {
    const error = new Error("Rate Limit Exceeded");

    expect(isRateLimitError(error)).toBe(true);
  });

  it("'403' を含むエラーメッセージの場合は true を返す", () => {
    const error = new Error("403 Forbidden");

    expect(isRateLimitError(error)).toBe(true);
  });

  it("関連しないエラーメッセージの場合は false を返す", () => {
    const error = new Error("Network error");

    expect(isRateLimitError(error)).toBe(false);
  });

  it("null の場合は false を返す", () => {
    expect(isRateLimitError(null)).toBe(false);
  });

  it("undefined の場合は false を返す", () => {
    expect(isRateLimitError(undefined)).toBe(false);
  });

  it("文字列の場合は false を返す", () => {
    expect(isRateLimitError("rate limit")).toBe(false);
  });

  it("オブジェクトの場合は false を返す", () => {
    expect(isRateLimitError({ message: "rate limit" })).toBe(false);
  });

  it("数値の場合は false を返す", () => {
    expect(isRateLimitError(403)).toBe(false);
  });
});
