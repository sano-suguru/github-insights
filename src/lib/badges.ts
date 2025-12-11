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
export const BADGES: Record<string, Badge> = {
  // コミット数ベース
  FIRST_COMMIT: {
    id: "first_commit",
    name: "First Commit",
    description: "初めてのコミット",
    iconName: "Sparkles",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  ACTIVE_CONTRIBUTOR: {
    id: "active_contributor",
    name: "Active Contributor",
    description: "10回以上のコミット",
    iconName: "Medal",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  },
  DEDICATED_CONTRIBUTOR: {
    id: "dedicated_contributor",
    name: "Dedicated Contributor",
    description: "50回以上のコミット",
    iconName: "Award",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  },
  CORE_CONTRIBUTOR: {
    id: "core_contributor",
    name: "Core Contributor",
    description: "100回以上のコミット",
    iconName: "Trophy",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },

  // 順位ベース
  TOP_CONTRIBUTOR: {
    id: "top_contributor",
    name: "Top Contributor",
    description: "最も貢献度が高い",
    iconName: "Crown",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  },
  TOP_3: {
    id: "top_3",
    name: "Top 3",
    description: "貢献度トップ3",
    iconName: "Trophy",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  },
  TOP_10: {
    id: "top_10",
    name: "Top 10",
    description: "貢献度トップ10",
    iconName: "Star",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },

  // PR/レビューベース
  PR_MASTER: {
    id: "pr_master",
    name: "PR Master",
    description: "10件以上のPR",
    iconName: "GitPullRequest",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  },
  REVIEWER: {
    id: "reviewer",
    name: "Code Reviewer",
    description: "10件以上のレビュー",
    iconName: "Eye",
    color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  },

  // 行数ベース
  CODE_MACHINE: {
    id: "code_machine",
    name: "Code Machine",
    description: "10,000行以上の追加",
    iconName: "Cpu",
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  },
  REFACTOR_HERO: {
    id: "refactor_hero",
    name: "Refactor Hero",
    description: "5,000行以上の削除",
    iconName: "Eraser",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
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
