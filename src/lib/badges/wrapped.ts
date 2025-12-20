/**
 * GitHub Wrapped 用バッジ計算
 */

import type { ActivityTimeType } from "@/lib/github/types";
import type { WrappedBadge, WrappedBadgeRarity } from "./types";
import { WRAPPED_BADGES } from "./definitions";

/**
 * Wrapped バッジ計算用の入力
 */
export interface WrappedBadgeInput {
  longestStreak: number;
  totalContributions: number;
  prs: number;
  languageCount: number;
  activityType: ActivityTimeType;
  contributionGrowth: number | null;
  accountYears: number;
  isFirstYear: boolean;
}

/**
 * Wrapped用バッジを計算
 */
export function calculateWrappedBadges(input: WrappedBadgeInput): WrappedBadge[] {
  const badges: WrappedBadge[] = [];

  // ストリーク系（排他的 - 最高のみ）
  if (input.longestStreak >= 100) {
    badges.push(WRAPPED_BADGES["streak-100"]);
  } else if (input.longestStreak >= 30) {
    badges.push(WRAPPED_BADGES["streak-30"]);
  } else if (input.longestStreak >= 7) {
    badges.push(WRAPPED_BADGES["streak-7"]);
  }

  // 活動量系（排他的）
  if (input.totalContributions >= 2000) {
    badges.push(WRAPPED_BADGES["contributions-2000"]);
  } else if (input.totalContributions >= 1000) {
    badges.push(WRAPPED_BADGES["contributions-1000"]);
  } else if (input.totalContributions >= 500) {
    badges.push(WRAPPED_BADGES["contributions-500"]);
  } else if (input.totalContributions >= 100) {
    badges.push(WRAPPED_BADGES["contributions-100"]);
  }

  // PR系（排他的）
  if (input.prs >= 100) {
    badges.push(WRAPPED_BADGES["prs-100"]);
  } else if (input.prs >= 50) {
    badges.push(WRAPPED_BADGES["prs-50"]);
  } else if (input.prs >= 10) {
    badges.push(WRAPPED_BADGES["prs-10"]);
  }

  // 言語系（排他的）
  if (input.languageCount >= 10) {
    badges.push(WRAPPED_BADGES["polyglot-10"]);
  } else if (input.languageCount >= 5) {
    badges.push(WRAPPED_BADGES["polyglot-5"]);
  } else if (input.languageCount >= 3) {
    badges.push(WRAPPED_BADGES["polyglot-3"]);
  }

  // 時間帯系
  if (input.activityType === "night-owl") {
    badges.push(WRAPPED_BADGES["night-owl"]);
  } else if (input.activityType === "early-bird") {
    badges.push(WRAPPED_BADGES["early-bird"]);
  }

  // 成長系（排他的）
  if (input.contributionGrowth !== null) {
    if (input.contributionGrowth >= 100) {
      badges.push(WRAPPED_BADGES["growth-100"]);
    } else if (input.contributionGrowth >= 50) {
      badges.push(WRAPPED_BADGES["growth-50"]);
    }
  }

  // 特別系
  if (input.isFirstYear) {
    badges.push(WRAPPED_BADGES["first-year"]);
  }
  if (input.accountYears >= 10) {
    badges.push(WRAPPED_BADGES["veteran-10"]);
  } else if (input.accountYears >= 5) {
    badges.push(WRAPPED_BADGES["veteran-5"]);
  }

  // 希少度順にソート（legendary > epic > rare > common）
  const rarityOrder: Record<WrappedBadgeRarity, number> = {
    legendary: 4,
    epic: 3,
    rare: 2,
    common: 1,
  };

  return badges.sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);
}
