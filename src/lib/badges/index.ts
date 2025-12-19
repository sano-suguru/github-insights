/**
 * バッジモジュール
 * 
 * コントリビューター、ユーザープロファイル、GitHub Wrapped 用のバッジ定義と計算関数
 */

// 型定義
export type {
  OgBadgeColorScheme,
  BadgeCategory,
  Badge,
  WrappedBadgeRarity,
  WrappedBadge,
} from "./types";

export {
  OG_BADGE_DEFAULT_COLORS,
  createOgBadgeColorGetter,
  WRAPPED_BADGE_COLORS,
} from "./types";

// バッジ定義
export { BADGES, BADGE_PRIORITY, WRAPPED_BADGES } from "./definitions";

// ユーティリティ
export { getBadgesByCategory, sortBadgesByImportance } from "./utils";

// コントリビューター用
export { calculateBadges } from "./contributor";

// ユーザー用
export type { UserProfileStats } from "./user";
export { calculateUserBadges } from "./user";

// Wrapped用
export type { WrappedBadgeInput } from "./wrapped";
export { calculateWrappedBadges } from "./wrapped";
