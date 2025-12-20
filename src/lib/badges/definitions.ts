/**
 * バッジ定義
 */

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
import type { Badge, WrappedBadge } from "./types";
import { WRAPPED_BADGE_COLORS } from "./types";

// ========== バッジ定義 ==========

/** すべてのバッジ定義（統合版） */
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

// ========== バッジ優先度 ==========

/**
 * バッジの重要度順（ソート用）
 * 注意: 新しいバッジを BADGES に追加したら、ここにも追加すること
 */
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

// ========== Wrapped バッジ定義 ==========

/** Wrapped用バッジ定義 */
export const WRAPPED_BADGES: Record<string, WrappedBadge> = {
  // ストリーク系
  "streak-7": {
    id: "streak-7",
    name: "Week Warrior",
    description: "7 day streak",
    icon: Flame,
    rarity: "common",
    color: WRAPPED_BADGE_COLORS.common,
  },
  "streak-30": {
    id: "streak-30",
    name: "Code Marathon",
    description: "30 day streak",
    icon: Flame,
    rarity: "rare",
    color: WRAPPED_BADGE_COLORS.rare,
  },
  "streak-100": {
    id: "streak-100",
    name: "Streak Legend",
    description: "100 day streak",
    icon: Flame,
    rarity: "legendary",
    color: WRAPPED_BADGE_COLORS.legendary,
  },

  // 活動量系
  "contributions-100": {
    id: "contributions-100",
    name: "Active",
    description: "100+ contributions",
    icon: Activity,
    rarity: "common",
    color: WRAPPED_BADGE_COLORS.common,
  },
  "contributions-500": {
    id: "contributions-500",
    name: "Power User",
    description: "500+ contributions",
    icon: Zap,
    rarity: "rare",
    color: WRAPPED_BADGE_COLORS.rare,
  },
  "contributions-1000": {
    id: "contributions-1000",
    name: "Machine",
    description: "1000+ contributions",
    icon: Rocket,
    rarity: "epic",
    color: WRAPPED_BADGE_COLORS.epic,
  },
  "contributions-2000": {
    id: "contributions-2000",
    name: "Titan",
    description: "2000+ contributions",
    icon: Crown,
    rarity: "legendary",
    color: WRAPPED_BADGE_COLORS.legendary,
  },

  // PR系
  "prs-10": {
    id: "prs-10",
    name: "PR Opener",
    description: "10+ PRs",
    icon: GitPullRequest,
    rarity: "common",
    color: WRAPPED_BADGE_COLORS.common,
  },
  "prs-50": {
    id: "prs-50",
    name: "PR Master",
    description: "50+ PRs",
    icon: GitPullRequest,
    rarity: "rare",
    color: WRAPPED_BADGE_COLORS.rare,
  },
  "prs-100": {
    id: "prs-100",
    name: "PR Legend",
    description: "100+ PRs",
    icon: GitPullRequest,
    rarity: "epic",
    color: WRAPPED_BADGE_COLORS.epic,
  },

  // 言語系
  "polyglot-3": {
    id: "polyglot-3",
    name: "Trilingual",
    description: "3+ languages",
    icon: Languages,
    rarity: "common",
    color: WRAPPED_BADGE_COLORS.common,
  },
  "polyglot-5": {
    id: "polyglot-5",
    name: "Polyglot",
    description: "5+ languages",
    icon: Languages,
    rarity: "rare",
    color: WRAPPED_BADGE_COLORS.rare,
  },
  "polyglot-10": {
    id: "polyglot-10",
    name: "Language Master",
    description: "10+ languages",
    icon: Languages,
    rarity: "epic",
    color: WRAPPED_BADGE_COLORS.epic,
  },

  // 時間帯系
  "night-owl": {
    id: "night-owl",
    name: "Night Owl",
    description: "Active at night",
    icon: Moon,
    rarity: "rare",
    color: WRAPPED_BADGE_COLORS.rare,
  },
  "early-bird": {
    id: "early-bird",
    name: "Early Bird",
    description: "Active in morning",
    icon: Sunrise,
    rarity: "rare",
    color: WRAPPED_BADGE_COLORS.rare,
  },

  // 成長系
  "growth-50": {
    id: "growth-50",
    name: "Rising Star",
    description: "50%+ growth",
    icon: TrendingUp,
    rarity: "rare",
    color: WRAPPED_BADGE_COLORS.rare,
  },
  "growth-100": {
    id: "growth-100",
    name: "Breakout Year",
    description: "100%+ growth",
    icon: TrendingUp,
    rarity: "epic",
    color: WRAPPED_BADGE_COLORS.epic,
  },

  // 特別系
  "first-year": {
    id: "first-year",
    name: "Fresh Start",
    description: "First year",
    icon: Sparkles,
    rarity: "common",
    color: WRAPPED_BADGE_COLORS.common,
  },
  "veteran-5": {
    id: "veteran-5",
    name: "Veteran",
    description: "5+ years",
    icon: Shield,
    rarity: "rare",
    color: WRAPPED_BADGE_COLORS.rare,
  },
  "veteran-10": {
    id: "veteran-10",
    name: "Elder",
    description: "10+ years",
    icon: Shield,
    rarity: "epic",
    color: WRAPPED_BADGE_COLORS.epic,
  },
};
