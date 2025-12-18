import { describe, it, expect } from "vitest";
import {
  calculateBadges,
  sortBadgesByImportance,
  BADGES,
  BADGE_PRIORITY,
  calculateUserBadges,
  calculateWrappedBadges,
  UserProfileStats,
  WrappedBadgeInput,
} from "@/lib/badges";
import type { ContributorDetailStat } from "@/lib/github/types";

// テスト用のコントリビューターデータを生成するヘルパー
function createMockContributor(
  overrides: Partial<ContributorDetailStat> = {}
): ContributorDetailStat {
  return {
    login: "testuser",
    name: "Test User",
    avatarUrl: "https://example.com/avatar.png",
    commits: 0,
    additions: 0,
    deletions: 0,
    pullRequests: 0,
    reviews: 0,
    score: 0,
    rank: 1,
    ...overrides,
  };
}

describe("calculateBadges", () => {
  describe("コミット数ベースのバッジ", () => {
    it("1コミット以上でFIRST_COMMITバッジを獲得", () => {
      const contributor = createMockContributor({ commits: 1 });
      const badges = calculateBadges(contributor, 10);
      
      expect(badges.some((b) => b.id === "first_commit")).toBe(true);
    });

    it("10コミット以上でACTIVE_CONTRIBUTORバッジを獲得", () => {
      const contributor = createMockContributor({ commits: 10 });
      const badges = calculateBadges(contributor, 10);
      
      expect(badges.some((b) => b.id === "active_contributor")).toBe(true);
    });

    it("50コミット以上でDEDICATED_CONTRIBUTORバッジを獲得", () => {
      const contributor = createMockContributor({ commits: 50 });
      const badges = calculateBadges(contributor, 10);
      
      expect(badges.some((b) => b.id === "dedicated_contributor")).toBe(true);
    });

    it("100コミット以上でCORE_CONTRIBUTORバッジを獲得", () => {
      const contributor = createMockContributor({ commits: 100 });
      const badges = calculateBadges(contributor, 10);
      
      expect(badges.some((b) => b.id === "core_contributor")).toBe(true);
    });

    it("0コミットではコミット系バッジを獲得しない", () => {
      const contributor = createMockContributor({ commits: 0 });
      const badges = calculateBadges(contributor, 10);
      
      expect(badges.some((b) => b.id === "first_commit")).toBe(false);
    });
  });

  describe("順位ベースのバッジ", () => {
    it("1位でTOP_CONTRIBUTORバッジを獲得", () => {
      const contributor = createMockContributor({ rank: 1 });
      const badges = calculateBadges(contributor, 10);
      
      expect(badges.some((b) => b.id === "top_contributor")).toBe(true);
    });

    it("2位でTOP_3バッジを獲得（3人以上の場合）", () => {
      const contributor = createMockContributor({ rank: 2 });
      const badges = calculateBadges(contributor, 5);
      
      expect(badges.some((b) => b.id === "top_3")).toBe(true);
    });

    it("3位でTOP_3バッジを獲得（3人以上の場合）", () => {
      const contributor = createMockContributor({ rank: 3 });
      const badges = calculateBadges(contributor, 3);
      
      expect(badges.some((b) => b.id === "top_3")).toBe(true);
    });

    it("2人しかいない場合、2位はTOP_3バッジを獲得しない", () => {
      const contributor = createMockContributor({ rank: 2 });
      const badges = calculateBadges(contributor, 2);
      
      expect(badges.some((b) => b.id === "top_3")).toBe(false);
    });

    it("10位でTOP_10バッジを獲得（10人以上の場合）", () => {
      const contributor = createMockContributor({ rank: 10 });
      const badges = calculateBadges(contributor, 15);
      
      expect(badges.some((b) => b.id === "top_10")).toBe(true);
    });

    it("11位ではTOP_10バッジを獲得しない", () => {
      const contributor = createMockContributor({ rank: 11 });
      const badges = calculateBadges(contributor, 15);
      
      expect(badges.some((b) => b.id === "top_10")).toBe(false);
    });
  });

  describe("PR/レビューベースのバッジ", () => {
    it("10PR以上でPR_MASTERバッジを獲得", () => {
      const contributor = createMockContributor({ pullRequests: 10 });
      const badges = calculateBadges(contributor, 10);
      
      expect(badges.some((b) => b.id === "pr_master")).toBe(true);
    });

    it("10レビュー以上でREVIEWERバッジを獲得", () => {
      const contributor = createMockContributor({ reviews: 10 });
      const badges = calculateBadges(contributor, 10);
      
      expect(badges.some((b) => b.id === "reviewer")).toBe(true);
    });
  });

  describe("行数ベースのバッジ", () => {
    it("10000行以上の追加でCODE_MACHINEバッジを獲得", () => {
      const contributor = createMockContributor({ additions: 10000 });
      const badges = calculateBadges(contributor, 10);
      
      expect(badges.some((b) => b.id === "code_machine")).toBe(true);
    });

    it("5000行以上の削除でREFACTOR_HEROバッジを獲得", () => {
      const contributor = createMockContributor({ deletions: 5000 });
      const badges = calculateBadges(contributor, 10);
      
      expect(badges.some((b) => b.id === "refactor_hero")).toBe(true);
    });
  });

  describe("複合条件", () => {
    it("トップコントリビューターは複数のバッジを獲得できる", () => {
      const contributor = createMockContributor({
        rank: 1,
        commits: 150,
        additions: 15000,
        deletions: 8000,
        pullRequests: 25,
        reviews: 20,
      });
      const badges = calculateBadges(contributor, 10);
      
      // 期待されるバッジ
      expect(badges.some((b) => b.id === "top_contributor")).toBe(true);
      expect(badges.some((b) => b.id === "core_contributor")).toBe(true);
      expect(badges.some((b) => b.id === "code_machine")).toBe(true);
      expect(badges.some((b) => b.id === "refactor_hero")).toBe(true);
      expect(badges.some((b) => b.id === "pr_master")).toBe(true);
      expect(badges.some((b) => b.id === "reviewer")).toBe(true);
    });
  });
});

describe("sortBadgesByImportance", () => {
  it("TOP_CONTRIBUTORが最も重要なバッジとして最初に来る", () => {
    const badges = [
      BADGES.first_commit,
      BADGES.top_contributor,
      BADGES.active_contributor,
    ];
    const sorted = sortBadgesByImportance(badges);
    
    expect(sorted[0].id).toBe("top_contributor");
  });

  it("重要度順にソートされる", () => {
    const badges = [
      BADGES.first_commit,
      BADGES.top_3,
      BADGES.core_contributor,
      BADGES.top_contributor,
    ];
    const sorted = sortBadgesByImportance(badges);
    
    expect(sorted[0].id).toBe("top_contributor");
    expect(sorted[1].id).toBe("top_3");
    expect(sorted[2].id).toBe("core_contributor");
    expect(sorted[3].id).toBe("first_commit");
  });

  it("空配列を渡しても問題ない", () => {
    const sorted = sortBadgesByImportance([]);
    expect(sorted).toEqual([]);
  });
});

describe("BADGES定義", () => {
  it("すべてのバッジに必要なプロパティがある", () => {
    Object.values(BADGES).forEach((badge) => {
      expect(badge).toHaveProperty("id");
      expect(badge).toHaveProperty("name");
      expect(badge).toHaveProperty("description");
      expect(badge).toHaveProperty("icon");
      expect(badge).toHaveProperty("color");
      expect(badge).toHaveProperty("category");
      expect(["contributor", "user"]).toContain(badge.category);
    });
  });

  it("バッジIDがユニークである", () => {
    const ids = Object.values(BADGES).map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it("すべてのバッジIDがBADGE_PRIORITYに登録されている", () => {
    const allBadgeIds = Object.values(BADGES).map((b) => b.id);
    
    // すべてのバッジIDがBADGE_PRIORITYに含まれていること
    allBadgeIds.forEach((id) => {
      expect(BADGE_PRIORITY).toContain(id);
    });
    
    // BADGE_PRIORITYに存在しないIDがないこと（無効なエントリがないか）
    BADGE_PRIORITY.forEach((id) => {
      expect(allBadgeIds).toContain(id);
    });
  });
});

describe("calculateUserBadges", () => {
  // ヘルパー関数
  function createUserStats(overrides: Partial<UserProfileStats> = {}): UserProfileStats {
    return {
      followers: 0,
      publicRepos: 0,
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  describe("フォロワー数ベースのバッジ", () => {
    it("1000フォロワー以上でinfluencerバッジを獲得", () => {
      const stats = createUserStats({ followers: 1000 });
      const badges = calculateUserBadges(stats);
      expect(badges.some((b) => b.id === "influencer")).toBe(true);
    });

    it("100フォロワー以上1000未満でpopularバッジを獲得", () => {
      const stats = createUserStats({ followers: 500 });
      const badges = calculateUserBadges(stats);
      expect(badges.some((b) => b.id === "popular")).toBe(true);
      expect(badges.some((b) => b.id === "influencer")).toBe(false);
    });

    it("100フォロワー未満ではフォロワー系バッジを獲得しない", () => {
      const stats = createUserStats({ followers: 50 });
      const badges = calculateUserBadges(stats);
      expect(badges.some((b) => b.id === "popular")).toBe(false);
      expect(badges.some((b) => b.id === "influencer")).toBe(false);
    });
  });

  describe("リポジトリ数ベースのバッジ", () => {
    it("50リポジトリ以上でprolificバッジを獲得", () => {
      const stats = createUserStats({ publicRepos: 50 });
      const badges = calculateUserBadges(stats);
      expect(badges.some((b) => b.id === "prolific")).toBe(true);
    });

    it("20リポジトリ以上50未満でbuilderバッジを獲得", () => {
      const stats = createUserStats({ publicRepos: 30 });
      const badges = calculateUserBadges(stats);
      expect(badges.some((b) => b.id === "builder")).toBe(true);
      expect(badges.some((b) => b.id === "prolific")).toBe(false);
    });
  });

  describe("PR数ベースのバッジ", () => {
    it("100PR以上でuser_pr_masterバッジを獲得", () => {
      const stats = createUserStats({ totalPRs: 100 });
      const badges = calculateUserBadges(stats);
      expect(badges.some((b) => b.id === "user_pr_master")).toBe(true);
    });

    it("50PR以上100未満でuser_contributorバッジを獲得", () => {
      const stats = createUserStats({ totalPRs: 75 });
      const badges = calculateUserBadges(stats);
      expect(badges.some((b) => b.id === "user_contributor")).toBe(true);
    });

    it("totalPRsがundefinedの場合はPR系バッジを獲得しない", () => {
      const stats = createUserStats({ totalPRs: undefined });
      const badges = calculateUserBadges(stats);
      expect(badges.some((b) => b.id === "user_pr_master")).toBe(false);
      expect(badges.some((b) => b.id === "user_contributor")).toBe(false);
    });
  });

  describe("アカウント年齢ベースのバッジ", () => {
    it("2015年以前のアカウントでveteranバッジを獲得", () => {
      const stats = createUserStats({ createdAt: "2015-01-01T00:00:00Z" });
      const badges = calculateUserBadges(stats);
      expect(badges.some((b) => b.id === "veteran")).toBe(true);
    });

    it("2016年以降のアカウントではveteranバッジを獲得しない", () => {
      const stats = createUserStats({ createdAt: "2016-01-01T00:00:00Z" });
      const badges = calculateUserBadges(stats);
      expect(badges.some((b) => b.id === "veteran")).toBe(false);
    });
  });
});

describe("calculateWrappedBadges", () => {
  // ヘルパー関数
  function createWrappedInput(overrides: Partial<WrappedBadgeInput> = {}): WrappedBadgeInput {
    return {
      longestStreak: 0,
      totalContributions: 0,
      prs: 0,
      languageCount: 0,
      activityType: "balanced",
      contributionGrowth: null,
      accountYears: 0,
      isFirstYear: false,
      ...overrides,
    };
  }

  describe("ストリーク系バッジ", () => {
    it("100日以上のストリークでstreak-100バッジを獲得", () => {
      const input = createWrappedInput({ longestStreak: 100 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "streak-100")).toBe(true);
    });

    it("30日以上100日未満でstreak-30バッジを獲得", () => {
      const input = createWrappedInput({ longestStreak: 50 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "streak-30")).toBe(true);
    });

    it("7日以上30日未満でstreak-7バッジを獲得", () => {
      const input = createWrappedInput({ longestStreak: 15 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "streak-7")).toBe(true);
    });
  });

  describe("活動量系バッジ", () => {
    it("2000コントリビューション以上でcontributions-2000バッジを獲得", () => {
      const input = createWrappedInput({ totalContributions: 2000 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "contributions-2000")).toBe(true);
    });

    it("1000コントリビューション以上2000未満でcontributions-1000バッジを獲得", () => {
      const input = createWrappedInput({ totalContributions: 1500 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "contributions-1000")).toBe(true);
    });

    it("500コントリビューション以上1000未満でcontributions-500バッジを獲得", () => {
      const input = createWrappedInput({ totalContributions: 750 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "contributions-500")).toBe(true);
    });

    it("100コントリビューション以上500未満でcontributions-100バッジを獲得", () => {
      const input = createWrappedInput({ totalContributions: 250 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "contributions-100")).toBe(true);
    });
  });

  describe("PR系バッジ", () => {
    it("100PR以上でprs-100バッジを獲得", () => {
      const input = createWrappedInput({ prs: 100 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "prs-100")).toBe(true);
    });

    it("50PR以上100未満でprs-50バッジを獲得", () => {
      const input = createWrappedInput({ prs: 75 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "prs-50")).toBe(true);
    });

    it("10PR以上50未満でprs-10バッジを獲得", () => {
      const input = createWrappedInput({ prs: 30 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "prs-10")).toBe(true);
    });
  });

  describe("言語系バッジ", () => {
    it("10言語以上でpolyglot-10バッジを獲得", () => {
      const input = createWrappedInput({ languageCount: 10 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "polyglot-10")).toBe(true);
    });

    it("5言語以上10未満でpolyglot-5バッジを獲得", () => {
      const input = createWrappedInput({ languageCount: 7 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "polyglot-5")).toBe(true);
    });

    it("3言語以上5未満でpolyglot-3バッジを獲得", () => {
      const input = createWrappedInput({ languageCount: 4 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "polyglot-3")).toBe(true);
    });
  });

  describe("時間帯系バッジ", () => {
    it("night-owlタイプでnight-owlバッジを獲得", () => {
      const input = createWrappedInput({ activityType: "night-owl" });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "night-owl")).toBe(true);
    });

    it("early-birdタイプでearly-birdバッジを獲得", () => {
      const input = createWrappedInput({ activityType: "early-bird" });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "early-bird")).toBe(true);
    });
  });

  describe("成長系バッジ", () => {
    it("100%以上の成長でgrowth-100バッジを獲得", () => {
      const input = createWrappedInput({ contributionGrowth: 150 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "growth-100")).toBe(true);
    });

    it("50%以上100%未満の成長でgrowth-50バッジを獲得", () => {
      const input = createWrappedInput({ contributionGrowth: 75 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "growth-50")).toBe(true);
    });

    it("成長率がnullの場合は成長系バッジを獲得しない", () => {
      const input = createWrappedInput({ contributionGrowth: null });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "growth-100")).toBe(false);
      expect(badges.some((b) => b.id === "growth-50")).toBe(false);
    });
  });

  describe("特別系バッジ", () => {
    it("初年度ユーザーはfirst-yearバッジを獲得", () => {
      const input = createWrappedInput({ isFirstYear: true });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "first-year")).toBe(true);
    });

    it("10年以上のアカウントでveteran-10バッジを獲得", () => {
      const input = createWrappedInput({ accountYears: 10 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "veteran-10")).toBe(true);
    });

    it("5年以上10年未満のアカウントでveteran-5バッジを獲得", () => {
      const input = createWrappedInput({ accountYears: 7 });
      const badges = calculateWrappedBadges(input);
      expect(badges.some((b) => b.id === "veteran-5")).toBe(true);
    });
  });

  describe("バッジのソート", () => {
    it("バッジは希少度順にソートされる（legendary > epic > rare > common）", () => {
      const input = createWrappedInput({
        longestStreak: 100,  // legendary: streak-100
        totalContributions: 100,  // common: contributions-100
        prs: 10,  // common: prs-10
      });
      const badges = calculateWrappedBadges(input);
      
      // 最初のバッジはlegendary（streak-100）であるべき
      expect(badges[0].rarity).toBe("legendary");
    });
  });
});