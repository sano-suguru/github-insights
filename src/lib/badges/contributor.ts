/**
 * コントリビューター用バッジ計算
 */

import type { ContributorDetailStat } from "@/lib/github/types";
import type { Badge } from "./types";
import { BADGES } from "./definitions";

/**
 * コントリビューターのバッジを計算
 */
export function calculateBadges(
  contributor: ContributorDetailStat,
  totalContributors: number
): Badge[] {
  const badges: Badge[] = [];

  // コミット数ベース
  if (contributor.commits >= 1) {
    badges.push(BADGES.first_commit);
  }
  if (contributor.commits >= 10) {
    badges.push(BADGES.active_contributor);
  }
  if (contributor.commits >= 50) {
    badges.push(BADGES.dedicated_contributor);
  }
  if (contributor.commits >= 100) {
    badges.push(BADGES.core_contributor);
  }

  // 順位ベース
  if (contributor.rank === 1) {
    badges.push(BADGES.top_contributor);
  } else if (contributor.rank <= 3 && totalContributors >= 3) {
    badges.push(BADGES.top_3);
  } else if (contributor.rank <= 10 && totalContributors >= 10) {
    badges.push(BADGES.top_10);
  }

  // PR/レビューベース
  if (contributor.pullRequests >= 10) {
    badges.push(BADGES.pr_master);
  }
  if (contributor.reviews >= 10) {
    badges.push(BADGES.reviewer);
  }

  // 行数ベース
  if (contributor.additions >= 10000) {
    badges.push(BADGES.code_machine);
  }
  if (contributor.deletions >= 5000) {
    badges.push(BADGES.refactor_hero);
  }

  return badges;
}
