/**
 * ユーザープロファイル用バッジ計算
 */

import type { Badge } from "./types";
import { BADGES } from "./definitions";

/**
 * ユーザープロファイル統計
 */
export interface UserProfileStats {
  followers: number;
  publicRepos: number;
  totalPRs?: number;
  createdAt: string; // ISO 8601 形式
}

/**
 * ユーザープロファイルのバッジを計算
 */
export function calculateUserBadges(stats: UserProfileStats): Badge[] {
  const badges: Badge[] = [];

  // フォロワー数ベース（排他的）
  if (stats.followers >= 1000) {
    badges.push(BADGES.influencer);
  } else if (stats.followers >= 100) {
    badges.push(BADGES.popular);
  }

  // リポジトリ数ベース（排他的）
  if (stats.publicRepos >= 50) {
    badges.push(BADGES.prolific);
  } else if (stats.publicRepos >= 20) {
    badges.push(BADGES.builder);
  }

  // PR数ベース（オプション、排他的）
  if (stats.totalPRs !== undefined) {
    if (stats.totalPRs >= 100) {
      badges.push(BADGES.user_pr_master);
    } else if (stats.totalPRs >= 50) {
      badges.push(BADGES.user_contributor);
    }
  }

  // アカウント作成年ベース
  const createdYear = new Date(stats.createdAt).getFullYear();
  if (createdYear <= 2015) {
    badges.push(BADGES.veteran);
  }

  return badges;
}
