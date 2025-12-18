import { describe, it, expect } from "vitest";
import {
  parseAccountType,
  calculateUserStats,
  calculateStreaks,
  analyzeActivityTime,
} from "../transforms";
import type { UserRepository, UserEvent } from "../types";

describe("parseAccountType", () => {
  it("'User' を正しく返す", () => {
    expect(parseAccountType("User")).toBe("User");
  });

  it("'Organization' を正しく返す", () => {
    expect(parseAccountType("Organization")).toBe("Organization");
  });

  it("未知の文字列はデフォルトで 'User' を返す", () => {
    expect(parseAccountType("Bot")).toBe("User");
    expect(parseAccountType("unknown")).toBe("User");
  });

  it("null/undefined はデフォルトで 'User' を返す", () => {
    expect(parseAccountType(null)).toBe("User");
    expect(parseAccountType(undefined)).toBe("User");
  });

  it("数値はデフォルトで 'User' を返す", () => {
    expect(parseAccountType(123)).toBe("User");
  });

  it("オブジェクトはデフォルトで 'User' を返す", () => {
    expect(parseAccountType({ type: "User" })).toBe("User");
  });
});

describe("calculateUserStats", () => {
  const createMockRepo = (
    overrides: Partial<UserRepository> = {}
  ): UserRepository => ({
    name: "test-repo",
    nameWithOwner: "testuser/test-repo",
    description: "A test repository",
    stargazerCount: 10,
    forkCount: 5,
    primaryLanguage: { name: "TypeScript", color: "#3178c6" },
    isFork: false,
    isArchived: false,
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  it("空の配列の場合は全て0を返す", () => {
    const result = calculateUserStats([]);

    expect(result.totalStars).toBe(0);
    expect(result.totalForks).toBe(0);
    expect(result.totalRepos).toBe(0);
    expect(result.languageBreakdown).toEqual([]);
    expect(result.topRepositories).toEqual([]);
  });

  it("スター数とフォーク数を正しく合計する", () => {
    const repos = [
      createMockRepo({ stargazerCount: 100, forkCount: 10 }),
      createMockRepo({ stargazerCount: 50, forkCount: 5 }),
      createMockRepo({ stargazerCount: 25, forkCount: 3 }),
    ];

    const result = calculateUserStats(repos);

    expect(result.totalStars).toBe(175);
    expect(result.totalForks).toBe(18);
    expect(result.totalRepos).toBe(3);
  });

  it("言語の内訳を正しく計算する", () => {
    const repos = [
      createMockRepo({ primaryLanguage: { name: "TypeScript", color: "#3178c6" } }),
      createMockRepo({ primaryLanguage: { name: "TypeScript", color: "#3178c6" } }),
      createMockRepo({ primaryLanguage: { name: "JavaScript", color: "#f1e05a" } }),
    ];

    const result = calculateUserStats(repos);

    expect(result.languageBreakdown).toHaveLength(2);
    expect(result.languageBreakdown[0]).toEqual({
      name: "TypeScript",
      color: "#3178c6",
      count: 2,
      percentage: 67,
    });
    expect(result.languageBreakdown[1]).toEqual({
      name: "JavaScript",
      color: "#f1e05a",
      count: 1,
      percentage: 33,
    });
  });

  it("primaryLanguage が null のリポジトリを正しく処理する", () => {
    const repos = [
      createMockRepo({ primaryLanguage: { name: "TypeScript", color: "#3178c6" } }),
      createMockRepo({ primaryLanguage: null }),
    ];

    const result = calculateUserStats(repos);

    expect(result.languageBreakdown).toHaveLength(1);
    expect(result.languageBreakdown[0].name).toBe("TypeScript");
  });

  it("フォークとアーカイブ済みリポジトリをトップから除外する", () => {
    const repos = [
      createMockRepo({ name: "original", isFork: false, isArchived: false }),
      createMockRepo({ name: "forked", isFork: true, isArchived: false }),
      createMockRepo({ name: "archived", isFork: false, isArchived: true }),
    ];

    const result = calculateUserStats(repos);

    expect(result.topRepositories).toHaveLength(1);
    expect(result.topRepositories[0].name).toBe("original");
  });

  it("トップリポジトリは最大10件まで", () => {
    const repos = Array.from({ length: 15 }, (_, i) =>
      createMockRepo({ name: `repo-${i}` })
    );

    const result = calculateUserStats(repos);

    expect(result.topRepositories).toHaveLength(10);
  });
});

describe("calculateStreaks", () => {
  it("空の配列の場合は 0 を返す", () => {
    const result = calculateStreaks([], 2024);

    expect(result.longestStreak).toBe(0);
    expect(result.currentStreak).toBe(0);
  });

  it("連続した貢献日の最長ストリークを計算する", () => {
    const days = [
      { date: "2024-01-01", contributionCount: 1 },
      { date: "2024-01-02", contributionCount: 2 },
      { date: "2024-01-03", contributionCount: 1 },
      { date: "2024-01-04", contributionCount: 0 }, // 途切れ
      { date: "2024-01-05", contributionCount: 1 },
      { date: "2024-01-06", contributionCount: 1 },
    ];

    const result = calculateStreaks(days, 2024);

    expect(result.longestStreak).toBe(3);
  });

  it("全ての日に貢献がある場合", () => {
    const days = [
      { date: "2024-01-01", contributionCount: 1 },
      { date: "2024-01-02", contributionCount: 2 },
      { date: "2024-01-03", contributionCount: 3 },
      { date: "2024-01-04", contributionCount: 4 },
      { date: "2024-01-05", contributionCount: 5 },
    ];

    const result = calculateStreaks(days, 2024);

    expect(result.longestStreak).toBe(5);
  });

  it("貢献がない日のみの場合", () => {
    const days = [
      { date: "2024-01-01", contributionCount: 0 },
      { date: "2024-01-02", contributionCount: 0 },
      { date: "2024-01-03", contributionCount: 0 },
    ];

    const result = calculateStreaks(days, 2024);

    expect(result.longestStreak).toBe(0);
    expect(result.currentStreak).toBe(0);
  });

  it("過去の年の現在のストリークは年末から計算", () => {
    const days = [
      { date: "2023-12-29", contributionCount: 0 },
      { date: "2023-12-30", contributionCount: 1 },
      { date: "2023-12-31", contributionCount: 2 },
    ];

    const result = calculateStreaks(days, 2023);

    expect(result.currentStreak).toBe(2);
  });

  it("日付がソートされていなくても正しく処理する", () => {
    const days = [
      { date: "2024-01-03", contributionCount: 1 },
      { date: "2024-01-01", contributionCount: 1 },
      { date: "2024-01-02", contributionCount: 1 },
    ];

    const result = calculateStreaks(days, 2024);

    expect(result.longestStreak).toBe(3);
  });

  it("現在の年で今日に貢献がある場合のストリークを計算", () => {
    const today = new Date();
    const year = today.getFullYear();
    const todayStr = today.toISOString().split("T")[0];
    
    // 昨日と今日の日付を生成
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    
    const days = [
      { date: yesterdayStr, contributionCount: 1 },
      { date: todayStr, contributionCount: 2 },
    ];

    const result = calculateStreaks(days, year);

    expect(result.currentStreak).toBe(2);
  });

  it("現在の年で今日のデータがない場合", () => {
    const today = new Date();
    const year = today.getFullYear();
    
    // 過去の日付のみ
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 10);
    const pastDateStr = pastDate.toISOString().split("T")[0];
    
    const days = [
      { date: pastDateStr, contributionCount: 1 },
    ];

    const result = calculateStreaks(days, year);

    // 今日のデータがないのでcurrentStreakは0
    expect(result.currentStreak).toBe(0);
  });
});

describe("analyzeActivityTime", () => {
  const createMockEvent = (hour: number): UserEvent => ({
    id: `event-${hour}`,
    type: "PushEvent",
    createdAt: `2024-01-01T${hour.toString().padStart(2, "0")}:00:00Z`,
    repo: {
      name: "test/repo",
    },
  });

  it("イベントがない場合は balanced を返す", () => {
    const result = analyzeActivityTime([]);

    expect(result.type).toBe("balanced");
    expect(result.label).toBe("Balanced");
    expect(result.peakHour).toBe(12);
  });

  it("深夜に活動が多い場合は night-owl を返す", () => {
    const events = [
      createMockEvent(23),
      createMockEvent(0),
      createMockEvent(1),
      createMockEvent(2),
      createMockEvent(23),
      createMockEvent(0),
    ];

    const result = analyzeActivityTime(events);

    expect(result.type).toBe("night-owl");
    expect(result.label).toBe("Night Owl");
  });

  it("早朝に活動が多い場合は early-bird を返す", () => {
    const events = [
      createMockEvent(5),
      createMockEvent(6),
      createMockEvent(7),
      createMockEvent(5),
      createMockEvent(6),
      createMockEvent(7),
    ];

    const result = analyzeActivityTime(events);

    expect(result.type).toBe("early-bird");
    expect(result.label).toBe("Early Bird");
  });

  it("営業時間に活動が多い場合は business-hours を返す", () => {
    const events = [
      createMockEvent(9),
      createMockEvent(10),
      createMockEvent(11),
      createMockEvent(14),
      createMockEvent(15),
      createMockEvent(16),
    ];

    const result = analyzeActivityTime(events);

    expect(result.type).toBe("business-hours");
    expect(result.label).toBe("9-to-5 Coder");
  });

  it("夕方に活動が多い場合は evening-coder を返す", () => {
    const events = [
      createMockEvent(18),
      createMockEvent(19),
      createMockEvent(20),
      createMockEvent(18),
      createMockEvent(19),
      createMockEvent(21),
    ];

    const result = analyzeActivityTime(events);

    expect(result.type).toBe("evening-coder");
    expect(result.label).toBe("Evening Coder");
  });

  it("活動が分散している場合は balanced を返す", () => {
    // 各時間帯にまんべんなく分散（どの時間帯も30%未満）
    const events = [
      createMockEvent(0),   // night-owl
      createMockEvent(5),   // early-bird
      createMockEvent(6),   // early-bird
      createMockEvent(10),  // business
      createMockEvent(11),  // business
      createMockEvent(15),  // business
      createMockEvent(18),  // evening
      createMockEvent(19),  // evening
      createMockEvent(20),  // evening
      createMockEvent(23),  // night-owl
    ];

    const result = analyzeActivityTime(events);

    expect(result.type).toBe("balanced");
    expect(result.label).toBe("All-Day Coder");
  });

  it("ピーク時間を正しく検出する", () => {
    const events = [
      createMockEvent(14),
      createMockEvent(14),
      createMockEvent(14),
      createMockEvent(15),
    ];

    const result = analyzeActivityTime(events);

    expect(result.peakHour).toBe(14);
  });

  it("分布を % で返す", () => {
    const events = [
      createMockEvent(10),
      createMockEvent(10),
      createMockEvent(11),
      createMockEvent(11),
    ];

    const result = analyzeActivityTime(events);

    expect(result.distribution[10]).toBe(50);
    expect(result.distribution[11]).toBe(50);
    expect(result.distribution[12]).toBe(0);
  });
});
