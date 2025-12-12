"use client";

import Image from "next/image";
import { ContributorDetailStat } from "@/lib/github";
import { calculateBadges, sortBadgesByImportance, Badge } from "@/lib/badges";
import { 
  TrendingUp, GitCommit, Plus, Minus, GitPullRequest, 
  Crown, Trophy, Medal, Award, Star, Eye, Cpu, Eraser, Sparkles, ExternalLink 
} from "lucide-react";

// アイコン名からコンポーネントを取得するマップ
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Crown,
  Trophy,
  Medal,
  Award,
  Star,
  GitPullRequest,
  Eye,
  Cpu,
  Eraser,
  Sparkles,
};

interface ContributorRankingProps {
  contributors: ContributorDetailStat[];
  currentUserLogin?: string;
}

export default function ContributorRanking({
  contributors,
  currentUserLogin,
}: ContributorRankingProps) {
  if (contributors.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        コントリビューターデータがありません
      </div>
    );
  }

  const top10 = contributors.slice(0, 10);
  const currentUser = currentUserLogin
    ? contributors.find((c) => c.login.toLowerCase() === currentUserLogin.toLowerCase())
    : null;
  const isCurrentUserInTop10 = currentUser && currentUser.rank <= 10;

  return (
    <div className="space-y-4">
      {/* ランキングリスト */}
      <div className="space-y-2">
        {top10.map((contributor) => (
          <ContributorRow
            key={contributor.login}
            contributor={contributor}
            isCurrentUser={contributor.login.toLowerCase() === currentUserLogin?.toLowerCase()}
            totalContributors={contributors.length}
          />
        ))}
      </div>

      {/* 自分がTop10外の場合は別表示 */}
      {currentUser && !isCurrentUserInTop10 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            あなたの順位
          </p>
          <ContributorRow
            contributor={currentUser}
            isCurrentUser={true}
            totalContributors={contributors.length}
          />
        </div>
      )}
    </div>
  );
}

// 個別の行コンポーネント
function ContributorRow({
  contributor,
  isCurrentUser,
  totalContributors,
}: {
  contributor: ContributorDetailStat;
  isCurrentUser: boolean;
  totalContributors: number;
}) {
  const badges = sortBadgesByImportance(
    calculateBadges(contributor, totalContributors)
  );

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        isCurrentUser
          ? "bg-purple-50 dark:bg-purple-900/30 ring-2 ring-purple-500"
          : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      {/* 順位 */}
      <div className="shrink-0 w-8 text-center">
        {contributor.rank <= 3 ? (
          <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center ${
            contributor.rank === 1 
              ? "bg-yellow-100 dark:bg-yellow-900" 
              : contributor.rank === 2 
                ? "bg-gray-100 dark:bg-gray-600" 
                : "bg-orange-100 dark:bg-orange-900"
          }`}>
            {contributor.rank === 1 && <Crown className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />}
            {contributor.rank === 2 && <Medal className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />}
            {contributor.rank === 3 && <Medal className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />}
          </div>
        ) : (
          <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
            {contributor.rank}
          </span>
        )}
      </div>

      {/* アバター */}
      <a
        href={`https://github.com/${contributor.login}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 hover:opacity-80 transition-opacity"
      >
        <Image
          src={contributor.avatarUrl}
          alt={contributor.name}
          width={40}
          height={40}
          className="rounded-full ring-2 ring-transparent hover:ring-purple-500 transition-all"
        />
      </a>

      {/* 名前とバッジ */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <a
            href={`https://github.com/${contributor.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-medium truncate hover:underline inline-flex items-center gap-1 group ${
              isCurrentUser
                ? "text-purple-700 dark:text-purple-300"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {contributor.name}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
          </a>
          {isCurrentUser && (
            <span className="text-xs text-purple-500">(あなた)</span>
          )}
        </div>
        {/* バッジ（最大3つ表示） */}
        <div className="flex flex-wrap gap-1 mt-1">
          {badges.slice(0, 3).map((badge) => (
            <BadgeChip key={badge.id} badge={badge} />
          ))}
          {badges.length > 3 && (
            <span className="text-xs text-gray-400">+{badges.length - 3}</span>
          )}
        </div>
      </div>

      {/* 統計 */}
      <div className="shrink-0 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1" title="Commits">
          <GitCommit className="w-4 h-4" />
          <span>{contributor.commits.toLocaleString()}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-green-600 dark:text-green-400" title="追加行数">
          <Plus className="w-4 h-4" />
          <span>{formatNumber(contributor.additions)}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-red-600 dark:text-red-400" title="削除行数">
          <Minus className="w-4 h-4" />
          <span>{formatNumber(contributor.deletions)}</span>
        </div>
        <div className="hidden md:flex items-center gap-1" title="PR">
          <GitPullRequest className="w-4 h-4" />
          <span>{contributor.pullRequests}</span>
        </div>
      </div>

      {/* スコア */}
      <div className="shrink-0 text-right">
        <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
          <TrendingUp className="w-4 h-4" />
          <span className="font-bold">{contributor.score.toLocaleString()}</span>
        </div>
        <span className="text-xs text-gray-500">スコア</span>
      </div>
    </div>
  );
}

// バッジチップ（すりガラス風）
function BadgeChip({ badge }: { badge: Badge }) {
  const IconComponent = iconMap[badge.iconName];
  
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
      title={badge.description}
    >
      {IconComponent && <IconComponent className="w-3 h-3" />}
      <span className="hidden lg:inline">{badge.name}</span>
    </span>
  );
}

// 数値フォーマット（1k, 10k など）
function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${Math.round(num / 1000)}k`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}
