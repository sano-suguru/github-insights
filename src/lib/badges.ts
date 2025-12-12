import { ContributorDetailStat } from "./github";

// バッジの種類
export interface Badge {
  id: string;
  name: string;
  description: string;
  iconName: string;  // Lucide アイコン名
  color: string; // Tailwind色クラス
}

// 利用可能なバッジ定義
// すりガラス風デザイン + 色相を分散させて区別しやすく
export const BADGES: Record<string, Badge> = {
  // コミット数ベース（グリーン〜エメラルド系）
  FIRST_COMMIT: {
    id: "first_commit",
    name: "First Commit",
    description: "初めてのコミット",
    iconName: "Sparkles",
    color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 backdrop-blur-sm",
  },
  ACTIVE_CONTRIBUTOR: {
    id: "active_contributor",
    name: "Active Contributor",
    description: "10回以上のコミット",
    iconName: "Medal",
    color: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 backdrop-blur-sm",
  },
  DEDICATED_CONTRIBUTOR: {
    id: "dedicated_contributor",
    name: "Dedicated Contributor",
    description: "50回以上のコミット",
    iconName: "Award",
    color: "bg-lime-500/15 text-lime-600 dark:text-lime-400 border border-lime-500/30 backdrop-blur-sm",
  },
  CORE_CONTRIBUTOR: {
    id: "core_contributor",
    name: "Core Contributor",
    description: "100回以上のコミット",
    iconName: "Trophy",
    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 backdrop-blur-sm",
  },

  // 順位ベース（紫〜ピンク系 - テーマカラー）
  TOP_CONTRIBUTOR: {
    id: "top_contributor",
    name: "Top Contributor",
    description: "最も貢献度が高い",
    iconName: "Crown",
    color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 backdrop-blur-sm",
  },
  TOP_3: {
    id: "top_3",
    name: "Top 3",
    description: "貢献度トップ3",
    iconName: "Trophy",
    color: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30 backdrop-blur-sm",
  },
  TOP_10: {
    id: "top_10",
    name: "Top 10",
    description: "貢献度トップ10",
    iconName: "Star",
    color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 backdrop-blur-sm",
  },

  // PR/レビューベース（ブルー〜インディゴ系）
  PR_MASTER: {
    id: "pr_master",
    name: "PR Master",
    description: "10件以上のPR",
    iconName: "GitPullRequest",
    color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 backdrop-blur-sm",
  },
  REVIEWER: {
    id: "reviewer",
    name: "Code Reviewer",
    description: "10件以上のレビュー",
    iconName: "Eye",
    color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 backdrop-blur-sm",
  },

  // 行数ベース（シアン〜オレンジ系）
  CODE_MACHINE: {
    id: "code_machine",
    name: "Code Machine",
    description: "10,000行以上の追加",
    iconName: "Cpu",
    color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 backdrop-blur-sm",
  },
  REFACTOR_HERO: {
    id: "refactor_hero",
    name: "Refactor Hero",
    description: "5,000行以上の削除",
    iconName: "Eraser",
    color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 backdrop-blur-sm",
  },
};

// コントリビューターの統計からバッジを判定
export function calculateBadges(
  contributor: ContributorDetailStat,
  totalContributors: number
): Badge[] {
  const badges: Badge[] = [];

  // コミット数ベース
  if (contributor.commits >= 1) {
    badges.push(BADGES.FIRST_COMMIT);
  }
  if (contributor.commits >= 10) {
    badges.push(BADGES.ACTIVE_CONTRIBUTOR);
  }
  if (contributor.commits >= 50) {
    badges.push(BADGES.DEDICATED_CONTRIBUTOR);
  }
  if (contributor.commits >= 100) {
    badges.push(BADGES.CORE_CONTRIBUTOR);
  }

  // 順位ベース
  if (contributor.rank === 1) {
    badges.push(BADGES.TOP_CONTRIBUTOR);
  } else if (contributor.rank <= 3 && totalContributors >= 3) {
    badges.push(BADGES.TOP_3);
  } else if (contributor.rank <= 10 && totalContributors >= 10) {
    badges.push(BADGES.TOP_10);
  }

  // PR/レビューベース
  if (contributor.pullRequests >= 10) {
    badges.push(BADGES.PR_MASTER);
  }
  if (contributor.reviews >= 10) {
    badges.push(BADGES.REVIEWER);
  }

  // 行数ベース
  if (contributor.additions >= 10000) {
    badges.push(BADGES.CODE_MACHINE);
  }
  if (contributor.deletions >= 5000) {
    badges.push(BADGES.REFACTOR_HERO);
  }

  return badges;
}

// バッジの重要度順にソート（表示順）
export function sortBadgesByImportance(badges: Badge[]): Badge[] {
  const order = [
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
  ];

  return badges.sort((a, b) => {
    const aIndex = order.indexOf(a.id);
    const bIndex = order.indexOf(b.id);
    return aIndex - bIndex;
  });
}
