import { describe, it, expect } from "vitest";
import {
  calculateBadges,
  sortBadgesByImportance,
  BADGES,
  BADGE_PRIORITY,
} from "@/lib/badges";
import { ContributorDetailStat } from "@/lib/github";

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
