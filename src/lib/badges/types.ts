/**
 * バッジ関連の型定義
 */

import type { LucideIcon } from "lucide-react";

// ========== OG カード用バッジ色スキーム ==========

/**
 * OG画像用のバッジ色スキーム
 */
export interface OgBadgeColorScheme {
  bg: string;
  text: string;
  border: string;
}

/**
 * OG画像用のデフォルトバッジ色
 */
export const OG_BADGE_DEFAULT_COLORS: OgBadgeColorScheme = {
  bg: "rgba(139, 92, 246, 0.3)",
  text: "#ddd6fe",
  border: "rgba(139, 92, 246, 0.6)",
};

/**
 * OG画像用のバッジ色取得関数を作成するファクトリ
 * @param colorMap バッジ名と色のマッピング
 * @returns バッジ名から色スキームを返す関数
 */
export function createOgBadgeColorGetter(
  colorMap: Record<string, OgBadgeColorScheme>
): (badge: string) => OgBadgeColorScheme {
  return (badge: string) => colorMap[badge] || OG_BADGE_DEFAULT_COLORS;
}

// ========== バッジ型定義 ==========

/** バッジのカテゴリ */
export type BadgeCategory = "contributor" | "user";

/** バッジの型定義 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string; // Tailwind色クラス
  category: BadgeCategory;
}

// ========== Wrapped バッジ型定義 ==========

/** Wrapped バッジの希少度 */
export type WrappedBadgeRarity = "common" | "rare" | "epic" | "legendary";

/** Wrapped バッジ定義 */
export interface WrappedBadge {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  rarity: WrappedBadgeRarity;
  color: string; // Tailwind色クラス
}

/** 希少度に応じたTailwind色クラス */
export const WRAPPED_BADGE_COLORS: Record<WrappedBadgeRarity, string> = {
  legendary: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 backdrop-blur-sm",
  epic: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 backdrop-blur-sm",
  rare: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 backdrop-blur-sm",
  common: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30 backdrop-blur-sm",
};
