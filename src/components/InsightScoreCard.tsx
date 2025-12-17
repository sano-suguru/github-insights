"use client";

import { useMemo } from "react";
import { Trophy, TrendingUp, Star, GitFork, Users, BookOpen, GitPullRequest, CircleDot, Calendar } from "lucide-react";
import {
  calculateInsightScore,
  InsightScoreInput,
  InsightScoreResult,
  formatScore,
  getRankColors,
} from "@/lib/insight-score";

interface InsightScoreCardProps {
  input: InsightScoreInput;
  /** コンパクト表示（バッジのみ） */
  compact?: boolean;
}

/**
 * Insight Score を表示するカード
 * - 総合スコアとランク
 * - スコア内訳（フルバージョン）
 */
export function InsightScoreCard({ input, compact = false }: InsightScoreCardProps) {
  const result = useMemo(() => calculateInsightScore(input), [input]);
  const colors = getRankColors(result.rank);

  if (compact) {
    return <InsightScoreBadge result={result} />;
  }

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
      {/* ヘッダー: スコアとランク */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: colors.bg }}
          >
            <Trophy className="w-6 h-6" style={{ color: colors.text }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Insight Score
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              GitHub活動の総合指標
            </p>
          </div>
        </div>
        <InsightScoreBadge result={result} size="lg" />
      </div>

      {/* スコア内訳 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          スコア内訳
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <BreakdownItem
            icon={Users}
            label="Followers"
            value={input.followers}
            score={result.breakdown.followers}
            color="text-blue-500"
          />
          <BreakdownItem
            icon={Star}
            label="Stars"
            value={input.totalStars}
            score={result.breakdown.stars}
            color="text-yellow-500"
          />
          <BreakdownItem
            icon={GitFork}
            label="Forks"
            value={input.totalForks}
            score={result.breakdown.forks}
            color="text-green-500"
          />
          <BreakdownItem
            icon={BookOpen}
            label="Repos"
            value={input.publicRepos}
            score={result.breakdown.repos}
            color="text-purple-500"
          />
          <BreakdownItem
            icon={GitPullRequest}
            label="PRs"
            value={input.totalPRs}
            score={result.breakdown.prs}
            color="text-pink-500"
          />
          <BreakdownItem
            icon={CircleDot}
            label="Issues"
            value={input.totalIssues}
            score={result.breakdown.issues}
            color="text-orange-500"
          />
          <BreakdownItem
            icon={Calendar}
            label="Years"
            value={input.accountYears}
            score={result.breakdown.seniority}
            color="text-cyan-500"
            suffix="年"
          />
        </div>
      </div>
    </div>
  );
}

interface InsightScoreBadgeProps {
  result: InsightScoreResult;
  size?: "sm" | "md" | "lg";
}

/**
 * Insight Score のバッジ表示
 */
export function InsightScoreBadge({ result, size = "md" }: InsightScoreBadgeProps) {
  const colors = getRankColors(result.rank);
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs gap-1",
    md: "px-3 py-1.5 text-sm gap-1.5",
    lg: "px-4 py-2 text-base gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full ${sizeClasses[size]}`}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      <Trophy className={iconSizes[size]} />
      <span>{formatScore(result.score)}</span>
      <span className="opacity-75">({result.rank})</span>
    </span>
  );
}

interface BreakdownItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  score: number;
  color: string;
  suffix?: string;
}

function BreakdownItem({ icon: Icon, label, value, score, color, suffix = "" }: BreakdownItemProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {value.toLocaleString()}{suffix}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          +{score.toLocaleString()}pt
        </span>
      </div>
    </div>
  );
}

export default InsightScoreCard;
