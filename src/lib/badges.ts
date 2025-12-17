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
} from "lucide-react";
import { ContributorDetailStat } from "./github";

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
