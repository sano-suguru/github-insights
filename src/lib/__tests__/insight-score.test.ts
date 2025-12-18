import { describe, it, expect } from "vitest";
import {
  calculateInsightScore,
  getRankFromScore,
  formatScore,
  calculateAccountYears,
  getRankColors,
  getRankColorsForOg,
  InsightScoreInput,
} from "../insight-score";

describe("calculateInsightScore", () => {
  it("各要素に重みを掛けてスコアを計算する", () => {
    const input: InsightScoreInput = {
      followers: 100,
      totalStars: 200,
      totalForks: 50,
      publicRepos: 30,
      totalPRs: 100,
      totalIssues: 40,
      accountYears: 5,
    };

    const result = calculateInsightScore(input);

    // followers: 100 * 10 = 1000
    // stars: 200 * 5 = 1000
    // forks: 50 * 3 = 150
    // repos: 30 * 2 = 60
    // prs: 100 * 1 = 100
    // issues: 40 * 0.5 = 20
    // seniority: 5 * 50 = 250
    // total: 2580
    expect(result.score).toBe(2580);
    expect(result.rank).toBe("Silver");
  });

  it("ゼロの入力でもエラーにならない", () => {
    const input: InsightScoreInput = {
      followers: 0,
      totalStars: 0,
      totalForks: 0,
      publicRepos: 0,
      totalPRs: 0,
      totalIssues: 0,
      accountYears: 0,
    };

    const result = calculateInsightScore(input);
    expect(result.score).toBe(0);
    expect(result.rank).toBe("Bronze");
  });

  it("内訳が正しく計算される", () => {
    const input: InsightScoreInput = {
      followers: 10,
      totalStars: 10,
      totalForks: 10,
      publicRepos: 10,
      totalPRs: 10,
      totalIssues: 10,
      accountYears: 1,
    };

    const result = calculateInsightScore(input);
    expect(result.breakdown.followers).toBe(100);
    expect(result.breakdown.stars).toBe(50);
    expect(result.breakdown.forks).toBe(30);
    expect(result.breakdown.repos).toBe(20);
    expect(result.breakdown.prs).toBe(10);
    expect(result.breakdown.issues).toBe(5);
    expect(result.breakdown.seniority).toBe(50);
  });
});

describe("getRankFromScore", () => {
  it("Bronze: 0〜999", () => {
    expect(getRankFromScore(0)).toBe("Bronze");
    expect(getRankFromScore(999)).toBe("Bronze");
  });

  it("Silver: 1000〜9999", () => {
    expect(getRankFromScore(1000)).toBe("Silver");
    expect(getRankFromScore(9999)).toBe("Silver");
  });

  it("Gold: 10000〜99999", () => {
    expect(getRankFromScore(10000)).toBe("Gold");
    expect(getRankFromScore(99999)).toBe("Gold");
  });

  it("Platinum: 100000〜499999", () => {
    expect(getRankFromScore(100000)).toBe("Platinum");
    expect(getRankFromScore(499999)).toBe("Platinum");
  });

  it("Diamond: 500000+", () => {
    expect(getRankFromScore(500000)).toBe("Diamond");
    expect(getRankFromScore(1000000)).toBe("Diamond");
  });
});

describe("formatScore", () => {
  it("1000未満はそのまま表示", () => {
    expect(formatScore(0)).toBe("0");
    expect(formatScore(999)).toBe("999");
  });

  it("1000以上はK表記", () => {
    expect(formatScore(1000)).toBe("1.0K");
    expect(formatScore(1500)).toBe("1.5K");
    expect(formatScore(999999)).toBe("1000.0K");
  });

  it("100万以上はM表記", () => {
    expect(formatScore(1000000)).toBe("1.0M");
    expect(formatScore(2500000)).toBe("2.5M");
  });
});

describe("calculateAccountYears", () => {
  it("過去の日付から年数を計算する", () => {
    // 5年前の日付
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    
    const years = calculateAccountYears(fiveYearsAgo.toISOString());
    expect(years).toBe(5);
  });

  it("1年未満は0を返す", () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const years = calculateAccountYears(sixMonthsAgo.toISOString());
    expect(years).toBe(0);
  });
});

describe("getRankColors", () => {
  it("Diamond ランクの色情報を返す", () => {
    const colors = getRankColors("Diamond");
    expect(colors.bg).toContain("cyan");
    expect(colors.text).toContain("cyan");
    expect(colors.border).toContain("cyan");
    expect(colors.gradient).toContain("cyan");
  });

  it("Platinum ランクの色情報を返す", () => {
    const colors = getRankColors("Platinum");
    expect(colors.bg).toContain("purple");
    expect(colors.text).toContain("purple");
  });

  it("Gold ランクの色情報を返す", () => {
    const colors = getRankColors("Gold");
    expect(colors.bg).toContain("yellow");
    expect(colors.text).toContain("yellow");
  });

  it("Silver ランクの色情報を返す", () => {
    const colors = getRankColors("Silver");
    expect(colors.bg).toContain("gray");
    expect(colors.text).toContain("gray");
  });

  it("Bronze ランクの色情報を返す", () => {
    const colors = getRankColors("Bronze");
    expect(colors.bg).toContain("orange");
    expect(colors.text).toContain("orange");
  });
});

describe("getRankColorsForOg", () => {
  it("Diamond ランクのOG用色情報を返す", () => {
    const colors = getRankColorsForOg("Diamond");
    expect(colors.bg).toContain("rgba");
    expect(colors.text).toBe("#22d3ee");
    expect(colors.border).toContain("rgba");
  });

  it("Platinum ランクのOG用色情報を返す", () => {
    const colors = getRankColorsForOg("Platinum");
    expect(colors.text).toBe("#c084fc");
  });

  it("Gold ランクのOG用色情報を返す", () => {
    const colors = getRankColorsForOg("Gold");
    expect(colors.text).toBe("#facc15");
  });

  it("Silver ランクのOG用色情報を返す", () => {
    const colors = getRankColorsForOg("Silver");
    expect(colors.text).toBe("#d1d5db");
  });

  it("Bronze ランクのOG用色情報を返す", () => {
    const colors = getRankColorsForOg("Bronze");
    expect(colors.text).toBe("#fb923c");
  });
});
