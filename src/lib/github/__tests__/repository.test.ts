/**
 * repository.ts のテスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getRepository,
  getPublicRepository,
  searchRepositories,
  getRepositories,
} from "../repository";

// client.ts をモック
vi.mock("../client", () => ({
  createGitHubClient: vi.fn(),
  createPublicGitHubClient: vi.fn(),
  withRetry: vi.fn((fn) => fn()),
  updateRateLimit: vi.fn(),
}));

// errors.ts をモック
vi.mock("../errors", () => ({
  GitHubRateLimitError: class extends Error {
    constructor() {
      super("GitHub API rate limit exceeded");
      this.name = "GitHubRateLimitError";
    }
  },
  isRateLimitError: vi.fn((error) => {
    return error instanceof Error && error.message.includes("rate limit");
  }),
}));

import {
  createGitHubClient,
  createPublicGitHubClient,
  updateRateLimit,
} from "../client";

describe("getRepository", () => {
  const mockRepository = {
    id: "repo-1",
    name: "test-repo",
    nameWithOwner: "owner/test-repo",
    description: "Test repository",
    url: "https://github.com/owner/test-repo",
    isPrivate: false,
    primaryLanguage: { name: "TypeScript", color: "#3178c6" },
    updatedAt: "2024-01-01T00:00:00Z",
    stargazerCount: 100,
    forkCount: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証でリポジトリ情報を取得できる", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: mockRepository,
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);
    vi.mocked(updateRateLimit).mockResolvedValue(null);

    const result = await getRepository(null, "owner", "test-repo");

    expect(createPublicGitHubClient).toHaveBeenCalled();
    expect(result.name).toBe("test-repo");
    expect(result.stargazerCount).toBe(100);
    expect(updateRateLimit).toHaveBeenCalled();
  });

  it("認証済みでリポジトリ情報を取得できる", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: mockRepository,
    });
    vi.mocked(createGitHubClient).mockReturnValue(mockClient as never);

    const result = await getRepository("token", "owner", "test-repo");

    expect(createGitHubClient).toHaveBeenCalledWith("token");
    expect(result.name).toBe("test-repo");
  });

  it("リポジトリが見つからない場合はエラーをスローする", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: null,
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    await expect(getRepository(null, "owner", "not-found")).rejects.toThrow(
      "Repository not found"
    );
  });

  it("未認証でプライベートリポジトリにアクセスするとエラー", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: { ...mockRepository, isPrivate: true },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    await expect(getRepository(null, "owner", "private-repo")).rejects.toThrow(
      "This is a private repository"
    );
  });
});

describe("getPublicRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getRepository を null トークンで呼び出す", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      repository: {
        id: "1",
        name: "repo",
        nameWithOwner: "owner/repo",
        isPrivate: false,
      },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    await getPublicRepository("owner", "repo");

    expect(createPublicGitHubClient).toHaveBeenCalled();
  });
});

describe("searchRepositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("短いクエリは空の結果を返す", async () => {
    const result = await searchRepositories(null, "a");
    expect(result.repositories).toEqual([]);
    expect(result.rateLimit).toBeNull();
  });

  it("空のクエリは空の結果を返す", async () => {
    const result = await searchRepositories(null, "");
    expect(result.repositories).toEqual([]);
  });

  it("リポジトリを検索できる", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      search: {
        repositoryCount: 2,
        nodes: [
          {
            name: "react",
            nameWithOwner: "facebook/react",
            description: "React library",
            isPrivate: false,
            primaryLanguage: { name: "JavaScript", color: "#f1e05a" },
            stargazerCount: 200000,
            forkCount: 40000,
            updatedAt: "2024-01-01T00:00:00Z",
          },
          {
            name: "private-repo",
            nameWithOwner: "someone/private-repo",
            description: "Private",
            isPrivate: true,
            primaryLanguage: null,
            stargazerCount: 0,
            forkCount: 0,
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ],
      },
    });
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);
    vi.mocked(updateRateLimit).mockResolvedValue(null);

    const result = await searchRepositories(null, "react");

    expect(result.repositories).toHaveLength(1);
    expect(result.repositories[0].nameWithOwner).toBe("facebook/react");
  });

  it("レート制限エラーを処理する", async () => {
    const mockClient = vi.fn().mockRejectedValue(new Error("rate limit"));
    vi.mocked(createPublicGitHubClient).mockReturnValue(mockClient as never);

    await expect(searchRepositories(null, "react")).rejects.toThrow(
      "GitHub API rate limit exceeded"
    );
  });

  it("認証済みでも検索できる", async () => {
    const mockClient = vi.fn().mockResolvedValue({
      search: { repositoryCount: 0, nodes: [] },
    });
    vi.mocked(createGitHubClient).mockReturnValue(mockClient as never);
    vi.mocked(updateRateLimit).mockResolvedValue(null);

    await searchRepositories("token", "test");

    expect(createGitHubClient).toHaveBeenCalledWith("token");
  });
});

describe("getRepositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証済みユーザーのリポジトリ一覧を取得できる", async () => {
    const mockRepos = [
      {
        id: "1",
        name: "repo1",
        nameWithOwner: "user/repo1",
        description: "First repo",
        url: "https://github.com/user/repo1",
        isPrivate: false,
        primaryLanguage: null,
        updatedAt: "2024-01-01T00:00:00Z",
        stargazerCount: 10,
        forkCount: 2,
      },
      {
        id: "2",
        name: "repo2",
        nameWithOwner: "user/repo2",
        description: null,
        url: "https://github.com/user/repo2",
        isPrivate: true,
        primaryLanguage: { name: "Python", color: "#3572A5" },
        updatedAt: "2024-01-02T00:00:00Z",
        stargazerCount: 5,
        forkCount: 1,
      },
    ];

    const mockClient = vi.fn().mockResolvedValue({
      viewer: {
        repositories: {
          nodes: mockRepos,
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    });
    vi.mocked(createGitHubClient).mockReturnValue(mockClient as never);

    const result = await getRepositories("token");

    expect(createGitHubClient).toHaveBeenCalledWith("token");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("repo1");
    expect(result[1].name).toBe("repo2");
  });
});
