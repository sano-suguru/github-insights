/**
 * バッジ関連のユーティリティ関数
 */

import type { Badge, BadgeCategory } from "./types";
import { BADGES, BADGE_PRIORITY } from "./definitions";

/**
 * カテゴリでバッジをフィルタ
 */
export function getBadgesByCategory(category: BadgeCategory): Badge[] {
  return Object.values(BADGES).filter((badge) => badge.category === category);
}

/**
 * バッジの重要度順にソート
 */
export function sortBadgesByImportance(badges: Badge[]): Badge[] {
  return [...badges].sort((a, b) => {
    const aIndex = BADGE_PRIORITY.indexOf(a.id);
    const bIndex = BADGE_PRIORITY.indexOf(b.id);
    // 未登録のバッジは末尾に
    const aPriority = aIndex === -1 ? Infinity : aIndex;
    const bPriority = bIndex === -1 ? Infinity : bIndex;
    return aPriority - bPriority;
  });
}
