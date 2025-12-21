/**
 * バッジモジュール
 * 
 * コントリビューター、ユーザープロファイル、GitHub Wrapped 用のバッジ定義と計算関数
 */

// 型定義
// Note: BadgeCategory, WrappedBadgeRarity, WrappedBadge は外部で未使用だが、
//       ライブラリの拡張性のためエクスポートを維持
export type {
  OgBadgeColorScheme,
  BadgeCategory,
  Badge,
  WrappedBadgeRarity,
  WrappedBadge,
} from "./types";

// OGカード用バッジ色ファクトリ
export { createOgBadgeColorGetter } from "./types";

// バッジ定義
export { BADGES, BADGE_PRIORITY, WRAPPED_BADGES } from "./definitions";

// ユーティリティ
export { sortBadgesByImportance } from "./utils";

// コントリビューター用
export { calculateBadges } from "./contributor";

// ユーザー用
export type { UserProfileStats } from "./user";
export { calculateUserBadges } from "./user";

// Wrapped用
export type { WrappedBadgeInput } from "./wrapped";
export { calculateWrappedBadges } from "./wrapped";
