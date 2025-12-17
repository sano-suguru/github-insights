import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Medal,
  Award,
  Trophy,
  Crown,
  Star,
  GitPullRequest,
  Eye,
  Cpu,
  Eraser,
  Users,
  Heart,
  FolderGit2,
  Hammer,
  GitMerge,
  Shield,
  Flame,
  Zap,
  Rocket,
  Languages,
  Moon,
  Sunrise,
  TrendingUp,
  Activity,
} from "lucide-react";
import type { ContributorDetailStat, ActivityTimeType } from "./github";

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

// ========== バッジのカテゴリ ==========

// バッジのカテゴリ
export type BadgeCategory = "contributor" | "user";

// バッジの型定義
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string; // Tailwind色クラス
  category: BadgeCategory;
}

// すべてのバッジ定義（統合版）
export const BADGES: Record<string, Badge> = {
  // ========== コントリビューター用バッジ ==========
  
  // コミット数ベース（グリーン〜エメラルド系）
  first_commit: {
    id: "first_commit",
    name: "First Commit",
    description: "初めてのコミット",
    icon: Sparkles,
    color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 backdrop-blur-sm",
    category: "contributor",
  },
  active_contributor: {
    id: "active_contributor",
    name: "Active Contributor",
    description: "10回以上のコミット",
    icon: Medal,
    color: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 backdrop-blur-sm",
    category: "contributor",
  },
  dedicated_contributor: {
    id: "dedicated_contributor",
    name: "Dedicated Contributor",
    description: "50回以上のコミット",
    icon: Award,
    color: "bg-lime-500/15 text-lime-600 dark:text-lime-400 border border-lime-500/30 backdrop-blur-sm",
    category: "contributor",
  },
  core_contributor: {
    id: "core_contributor",
    name: "Core Contributor",
    description: "100回以上のコミット",
    icon: Trophy,
    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 backdrop-blur-sm",
    category: "contributor",
  },

  // 順位ベース（紫〜ピンク系 - テーマカラー）
  top_contributor: {
    id: "top_contributor",
    name: "Top Contributor",
    description: "最も貢献度が高い",
    icon: Crown,
    color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 backdrop-blur-sm",
    category: "contributor",
  },
  top_3: {
    id: "top_3",
    name: "Top 3",
    description: "貢献度トップ3",
    icon: Trophy,
    color: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30 backdrop-blur-sm",
    category: "contributor",
  },
  top_10: {
    id: "top_10",
    name: "Top 10",
    description: "貢献度トップ10",
    icon: Star,
    color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 backdrop-blur-sm",
    category: "contributor",
  },

  // PR/レビューベース（ブルー〜インディゴ系）
  pr_master: {
    id: "pr_master",
    name: "PR Master",
    description: "10件以上のPR",
    icon: GitPullRequest,
    color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 backdrop-blur-sm",
    category: "contributor",
  },
  reviewer: {
    id: "reviewer",
    name: "Code Reviewer",
    description: "10件以上のレビュー",
    icon: Eye,
    color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 backdrop-blur-sm",
    category: "contributor",
  },

  // 行数ベース（シアン〜オレンジ系）
  code_machine: {
    id: "code_machine",
    name: "Code Machine",
    description: "10,000行以上の追加",
    icon: Cpu,
    color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 backdrop-blur-sm",
    category: "contributor",
  },
  refactor_hero: {
    id: "refactor_hero",
    name: "Refactor Hero",
    description: "5,000行以上の削除",
    icon: Eraser,
    color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 backdrop-blur-sm",
    category: "contributor",
  },

  // ========== ユーザープロファイル用バッジ ==========
  
  influencer: {
    id: "influencer",
    name: "Influencer",
    description: "フォロワー1,000人以上",
    icon: Users,
    color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 backdrop-blur-sm",
    category: "user",
  },
  popular: {
    id: "popular",
    name: "Popular",
    description: "フォロワー100人以上",
    icon: Heart,
    color: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30 backdrop-blur-sm",
    category: "user",
  },
  prolific: {
    id: "prolific",
    name: "Prolific",
    description: "リポジトリ50個以上",
    icon: FolderGit2,
    color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 backdrop-blur-sm",
    category: "user",
  },
  builder: {
    id: "builder",
    name: "Builder",
    description: "リポジトリ20個以上",
    icon: Hammer,
    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 backdrop-blur-sm",
    category: "user",
  },
  user_pr_master: {
    id: "user_pr_master",
    name: "PR Master",
    description: "PR 100件以上",
    icon: GitPullRequest,
    color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 backdrop-blur-sm",
    category: "user",
  },
  user_contributor: {
    id: "user_contributor",
    name: "Contributor",
    description: "PR 50件以上",
    icon: GitMerge,
    color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 backdrop-blur-sm",
    category: "user",
  },
  veteran: {
    id: "veteran",
    name: "Veteran",
    description: "2015年以前からのユーザー",
    icon: Shield,
    color: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30 backdrop-blur-sm",
    category: "user",
  },
};

// バッジの重要度順（ソート用）
// 注意: 新しいバッジを BADGES に追加したら、ここにも追加すること
export const BADGE_PRIORITY: string[] = [
  // コントリビューター用（高優先度）
  "top_contributor",
  "top_3",
  "top_10",
  "core_contributor",
  "dedicated_contributor",
  "active_contributor",
  "code_machine",
  "refactor_hero",
  "pr_master",
  "reviewer",
  "first_commit",
  // ユーザー用
  "influencer",
  "popular",
  "prolific",
  "builder",
  "user_pr_master",
  "user_contributor",
  "veteran",
];

// ========== ヘルパー関数 ==========

// カテゴリでバッジをフィルタ
export function getBadgesByCategory(category: BadgeCategory): Badge[] {
  return Object.values(BADGES).filter((badge) => badge.category === category);
}

// バッジの重要度順にソート
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

// ========== コントリビューター用バッジ計算 ==========

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

// ========== ユーザープロファイル用バッジ計算 ==========

export interface UserProfileStats {
  followers: number;
  publicRepos: number;
  totalPRs?: number;
  createdAt: string; // ISO 8601 形式
}

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

// ========== GitHub Wrapped 用バッジ ==========

// Wrapped バッジの希少度
export type WrappedBadgeRarity = "common" | "rare" | "epic" | "legendary";

// Wrapped バッジ定義
export interface WrappedBadge {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  rarity: WrappedBadgeRarity;
}

// Wrapped用バッジ定義
export const WRAPPED_BADGES: Record<string, WrappedBadge> = {
  // ストリーク系
  "streak-7": {
    id: "streak-7",
    name: "Week Warrior",
    description: "7 day streak",
    icon: Flame,
    rarity: "common",
  },
  "streak-30": {
    id: "streak-30",
    name: "Code Marathon",
    description: "30 day streak",
    icon: Flame,
    rarity: "rare",
  },
  "streak-100": {
    id: "streak-100",
    name: "Streak Legend",
    description: "100 day streak",
    icon: Flame,
    rarity: "legendary",
  },

  // 活動量系
  "contributions-100": {
    id: "contributions-100",
    name: "Active",
    description: "100+ contributions",
    icon: Activity,
    rarity: "common",
  },
  "contributions-500": {
    id: "contributions-500",
    name: "Power User",
    description: "500+ contributions",
    icon: Zap,
    rarity: "rare",
  },
  "contributions-1000": {
    id: "contributions-1000",
    name: "Machine",
    description: "1000+ contributions",
    icon: Rocket,
    rarity: "epic",
  },
  "contributions-2000": {
    id: "contributions-2000",
    name: "Titan",
    description: "2000+ contributions",
    icon: Crown,
    rarity: "legendary",
  },

  // PR系
  "prs-10": {
    id: "prs-10",
    name: "PR Opener",
    description: "10+ PRs",
    icon: GitPullRequest,
    rarity: "common",
  },
  "prs-50": {
    id: "prs-50",
    name: "PR Master",
    description: "50+ PRs",
    icon: GitPullRequest,
    rarity: "rare",
  },
  "prs-100": {
    id: "prs-100",
    name: "PR Legend",
    description: "100+ PRs",
    icon: GitPullRequest,
    rarity: "epic",
  },

  // 言語系
  "polyglot-3": {
    id: "polyglot-3",
    name: "Trilingual",
    description: "3+ languages",
    icon: Languages,
    rarity: "common",
  },
  "polyglot-5": {
    id: "polyglot-5",
    name: "Polyglot",
    description: "5+ languages",
    icon: Languages,
    rarity: "rare",
  },
  "polyglot-10": {
    id: "polyglot-10",
    name: "Language Master",
    description: "10+ languages",
    icon: Languages,
    rarity: "epic",
  },

  // 時間帯系
  "night-owl": {
    id: "night-owl",
    name: "Night Owl",
    description: "Active at night",
    icon: Moon,
    rarity: "rare",
  },
  "early-bird": {
    id: "early-bird",
    name: "Early Bird",
    description: "Active in morning",
    icon: Sunrise,
    rarity: "rare",
  },

  // 成長系
  "growth-50": {
    id: "growth-50",
    name: "Rising Star",
    description: "50%+ growth",
    icon: TrendingUp,
    rarity: "rare",
  },
  "growth-100": {
    id: "growth-100",
    name: "Breakout Year",
    description: "100%+ growth",
    icon: TrendingUp,
    rarity: "epic",
  },

  // 特別系
  "first-year": {
    id: "first-year",
    name: "Fresh Start",
    description: "First year",
    icon: Sparkles,
    rarity: "common",
  },
  "veteran-5": {
    id: "veteran-5",
    name: "Veteran",
    description: "5+ years",
    icon: Shield,
    rarity: "rare",
  },
  "veteran-10": {
    id: "veteran-10",
    name: "Elder",
    description: "10+ years",
    icon: Shield,
    rarity: "epic",
  },
};

// Wrapped バッジ計算用の入力
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

/**
 * Wrapped バッジの希少度に応じた色を取得
 */
export function getWrappedBadgeColors(rarity: WrappedBadgeRarity): { bg: string; text: string; border: string } {
  switch (rarity) {
    case "legendary":
      return { bg: "#fef3c7", text: "#92400e", border: "#fbbf24" }; // 金
    case "epic":
      return { bg: "#ede9fe", text: "#5b21b6", border: "#8b5cf6" }; // 紫
    case "rare":
      return { bg: "#dbeafe", text: "#1e40af", border: "#3b82f6" }; // 青
    default:
      return { bg: "#f3f4f6", text: "#374151", border: "#9ca3af" }; // グレー
  }
}
