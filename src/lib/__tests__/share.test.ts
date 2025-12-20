import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateTwitterShareUrl,
  copyToClipboard,
  generateRepoContributionShareText,
  generateUserProfileShareText,
  generateWrappedShareText,
} from "../share";

describe("generateTwitterShareUrl", () => {
  it("基本的なURLを生成する", () => {
    const url = generateTwitterShareUrl({
      text: "テスト投稿",
      url: "https://example.com",
    });
    expect(url).toContain("https://twitter.com/intent/tweet");
    expect(url).toContain("text=");
    expect(url).toContain("url=");
  });

  it("ハッシュタグを含む場合", () => {
    const url = generateTwitterShareUrl({
      text: "テスト",
      url: "https://example.com",
      hashtags: ["GitHubInsights", "OSS"],
    });
    expect(url).toContain("hashtags=GitHubInsights%2COSS");
  });

  it("ハッシュタグが空配列の場合は含まない", () => {
    const url = generateTwitterShareUrl({
      text: "テスト",
      url: "https://example.com",
      hashtags: [],
    });
    expect(url).not.toContain("hashtags=");
  });

  it("ハッシュタグがundefinedの場合は含まない", () => {
    const url = generateTwitterShareUrl({
      text: "テスト",
      url: "https://example.com",
    });
    expect(url).not.toContain("hashtags=");
  });

  it("日本語テキストがエンコードされる", () => {
    const url = generateTwitterShareUrl({
      text: "日本語テスト",
      url: "https://example.com",
    });
    expect(url).toContain(encodeURIComponent("日本語テスト"));
  });
});

describe("copyToClipboard", () => {
  const originalNavigator = global.navigator;
  const mockWriteText = vi.fn();

  beforeEach(() => {
    Object.defineProperty(global, "navigator", {
      value: {
        clipboard: {
          writeText: mockWriteText,
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
    });
    vi.resetAllMocks();
  });

  it("コピー成功時にtrueを返す", async () => {
    mockWriteText.mockResolvedValueOnce(undefined);
    const result = await copyToClipboard("テスト文字列");
    expect(result).toBe(true);
    expect(mockWriteText).toHaveBeenCalledWith("テスト文字列");
  });

  it("コピー失敗時にfalseを返す", async () => {
    mockWriteText.mockRejectedValueOnce(new Error("Copy failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    const result = await copyToClipboard("テスト文字列");
    
    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("generateRepoContributionShareText", () => {
  it("正しいフォーマットでテキストを生成する", () => {
    const text = generateRepoContributionShareText({
      owner: "facebook",
      repo: "react",
      username: "testuser",
      commits: 100,
      rank: 5,
    });
    expect(text).toContain("facebook/react");
    expect(text).toContain("100 コミット");
    expect(text).toContain("5位");
    expect(text).toContain("#GitHubInsights");
  });

  it("1位の場合も正しく生成する", () => {
    const text = generateRepoContributionShareText({
      owner: "vercel",
      repo: "next.js",
      username: "user1",
      commits: 500,
      rank: 1,
    });
    expect(text).toContain("1位");
    expect(text).toContain("500 コミット");
  });
});

describe("generateUserProfileShareText", () => {
  it("正しいフォーマットでテキストを生成する", () => {
    const text = generateUserProfileShareText({
      username: "testuser",
    });
    expect(text).toContain("@testuser");
    expect(text).toContain("#GitHubInsights");
  });

  it("特殊文字を含むユーザー名も処理する", () => {
    const text = generateUserProfileShareText({
      username: "test-user_123",
    });
    expect(text).toContain("@test-user_123");
  });
});

describe("generateWrappedShareText", () => {
  it("正しいフォーマットでテキストを生成する", () => {
    const text = generateWrappedShareText({
      username: "testuser",
      year: 2024,
      commits: 500,
      stars: 100,
    });
    expect(text).toContain("2024年");
    expect(text).toContain("500 コミット");
    expect(text).toContain("100");
    expect(text).toContain("#GitHubWrapped");
    expect(text).toContain("#GitHubInsights");
  });

  it("0コミット・0スターの場合も正しく生成する", () => {
    const text = generateWrappedShareText({
      username: "newuser",
      year: 2024,
      commits: 0,
      stars: 0,
    });
    expect(text).toContain("0 コミット");
    expect(text).toContain("0");
  });

  it("大きな数値も正しく処理する", () => {
    const text = generateWrappedShareText({
      username: "poweruser",
      year: 2024,
      commits: 10000,
      stars: 5000,
    });
    expect(text).toContain("10000 コミット");
    expect(text).toContain("5000");
  });
});
