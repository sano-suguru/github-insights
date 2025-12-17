/**
 * Insight Score - ユーザーの影響力・活動度を数値化するスコアリングシステム
 */

// スコア計算の入力データ
export interface InsightScoreInput {
  followers: number;
  totalStars: number;
  totalForks: number;
  publicRepos: number;
  totalPRs: number;
  totalIssues: number;
  accountYears: number;
}

// スコアとランクの結果
export interface InsightScoreResult {
  score: number;
  rank: InsightRank;
  breakdown: ScoreBreakdown;
}

// スコアの内訳
export interface ScoreBreakdown {
  followers: number;
  stars: number;
  forks: number;
  repos: number;
  prs: number;
  issues: number;
  seniority: number;
}

// ランク定義
export type InsightRank = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

// ランク閾値
const RANK_THRESHOLDS: { rank: InsightRank; minScore: number }[] = [
  { rank: "Diamond", minScore: 500000 },
  { rank: "Platinum", minScore: 100000 },
  { rank: "Gold", minScore: 10000 },
  { rank: "Silver", minScore: 1000 },
  { rank: "Bronze", minScore: 0 },
];

// 重み付け係数
const WEIGHTS = {
  followers: 10,
  stars: 5,
  forks: 3,
  repos: 2,
  prs: 1,
  issues: 0.5,
  seniority: 50, // 年数あたり
} as const;

/**
 * Insight Scoreを計算する
 */
export function calculateInsightScore(input: InsightScoreInput): InsightScoreResult {
  const breakdown: ScoreBreakdown = {
    followers: Math.floor(input.followers * WEIGHTS.followers),
    stars: Math.floor(input.totalStars * WEIGHTS.stars),
    forks: Math.floor(input.totalForks * WEIGHTS.forks),
    repos: Math.floor(input.publicRepos * WEIGHTS.repos),
    prs: Math.floor(input.totalPRs * WEIGHTS.prs),
    issues: Math.floor(input.totalIssues * WEIGHTS.issues),
    seniority: Math.floor(input.accountYears * WEIGHTS.seniority),
  };

  const score =
    breakdown.followers +
    breakdown.stars +
    breakdown.forks +
    breakdown.repos +
    breakdown.prs +
    breakdown.issues +
    breakdown.seniority;

  const rank = getRankFromScore(score);

  return { score, rank, breakdown };
}

/**
 * スコアからランクを取得
 */
export function getRankFromScore(score: number): InsightRank {
  for (const threshold of RANK_THRESHOLDS) {
    if (score >= threshold.minScore) {
      return threshold.rank;
    }
  }
  return "Bronze";
}

/**
 * ランクの色情報を取得（Tailwind CSS）
 */
export function getRankColors(rank: InsightRank): {
  bg: string;
  text: string;
  border: string;
  gradient: string;
} {
  switch (rank) {
    case "Diamond":
      return {
        bg: "bg-cyan-500/20",
        text: "text-cyan-400",
        border: "border-cyan-500/50",
        gradient: "from-cyan-400 to-blue-500",
      };
    case "Platinum":
      return {
        bg: "bg-purple-500/20",
        text: "text-purple-400",
        border: "border-purple-500/50",
        gradient: "from-purple-400 to-pink-500",
      };
    case "Gold":
      return {
        bg: "bg-yellow-500/20",
        text: "text-yellow-400",
        border: "border-yellow-500/50",
        gradient: "from-yellow-400 to-orange-500",
      };
    case "Silver":
      return {
        bg: "bg-gray-400/20",
        text: "text-gray-300",
        border: "border-gray-400/50",
        gradient: "from-gray-300 to-gray-500",
      };
    case "Bronze":
    default:
      return {
        bg: "bg-orange-700/20",
        text: "text-orange-400",
        border: "border-orange-700/50",
        gradient: "from-orange-400 to-orange-600",
      };
  }
}

/**
 * ランクの色情報を取得（OGカード用 - RGBA形式）
 */
export function getRankColorsForOg(rank: InsightRank): {
  bg: string;
  text: string;
  border: string;
} {
  switch (rank) {
    case "Diamond":
      return {
        bg: "rgba(6, 182, 212, 0.3)",
        text: "#22d3ee",
        border: "rgba(6, 182, 212, 0.6)",
      };
    case "Platinum":
      return {
        bg: "rgba(168, 85, 247, 0.3)",
        text: "#c084fc",
        border: "rgba(168, 85, 247, 0.6)",
      };
    case "Gold":
      return {
        bg: "rgba(234, 179, 8, 0.3)",
        text: "#facc15",
        border: "rgba(234, 179, 8, 0.6)",
      };
    case "Silver":
      return {
        bg: "rgba(156, 163, 175, 0.3)",
        text: "#d1d5db",
        border: "rgba(156, 163, 175, 0.6)",
      };
    case "Bronze":
    default:
      return {
        bg: "rgba(194, 65, 12, 0.3)",
        text: "#fb923c",
        border: "rgba(194, 65, 12, 0.6)",
      };
  }
}

/**
 * スコアを読みやすい形式にフォーマット
 */
export function formatScore(score: number): string {
  if (score >= 1000000) {
    return `${(score / 1000000).toFixed(1)}M`;
  }
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}K`;
  }
  return score.toLocaleString();
}

/**
 * アカウント作成日から年数を計算
 */
export function calculateAccountYears(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const years = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365);
  return Math.floor(years);
}
