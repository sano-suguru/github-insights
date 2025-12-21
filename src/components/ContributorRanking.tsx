"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ContributorDetailStat } from "@/lib/github/types";
import { calculateBadges, sortBadgesByImportance, Badge } from "@/lib/badges";
import { formatNumber } from "@/lib/utils";
import { 
  TrendingUp, GitCommit, Plus, Minus, GitPullRequest, 
  Crown, Medal, ImageIcon, X 
} from "lucide-react";
import ContributionCardModal from "./ContributionCardModal";

interface ContributorRankingProps {
  contributors: ContributorDetailStat[];
  currentUserLogin?: string;
  owner?: string;
  repo?: string;
}

export default function ContributorRanking({
  contributors,
  currentUserLogin,
  owner,
  repo,
}: ContributorRankingProps) {
  const [selectedContributor, setSelectedContributor] = useState<ContributorDetailStat | null>(null);

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
      <ol className="space-y-2" aria-label="コントリビューターランキング">
        {top10.map((contributor) => (
          <ContributorRow
            key={contributor.login}
            contributor={contributor}
            isCurrentUser={contributor.login.toLowerCase() === currentUserLogin?.toLowerCase()}
            totalContributors={contributors.length}
            onCardClick={() => setSelectedContributor(contributor)}
            showCardButton={!!owner && !!repo}
          />
        ))}
      </ol>

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
            onCardClick={() => setSelectedContributor(currentUser)}
            showCardButton={!!owner && !!repo}
          />
        </div>
      )}

      {/* カードモーダル */}
      {selectedContributor && owner && repo && (
        <ContributionCardModal
          isOpen={!!selectedContributor}
          onClose={() => setSelectedContributor(null)}
          owner={owner}
          repo={repo}
          contributor={selectedContributor}
        />
      )}
    </div>
  );
}

// 個別の行コンポーネント
function ContributorRow({
  contributor,
  isCurrentUser,
  totalContributors,
  onCardClick,
  showCardButton,
}: {
  contributor: ContributorDetailStat;
  isCurrentUser: boolean;
  totalContributors: number;
  onCardClick: () => void;
  showCardButton: boolean;
}) {
  const [showBadgePopover, setShowBadgePopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<"bottom" | "top">("bottom");
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const badges = sortBadgesByImportance(
    calculateBadges(contributor, totalContributors)
  );

  // ポップオーバー外クリックで閉じる
  useEffect(() => {
    if (!showBadgePopover) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowBadgePopover(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showBadgePopover]);

  // ポップオーバーの表示位置を計算（上 or 下）
  // ビューポート内の空きスペースに応じて動的に位置を決定。
  // この setState はポップオーバーが開いたときのみ実行され、
  // 表示位置の計算はレンダリングに直結するため useEffect 内での実行が適切。
  useEffect(() => {
    if (!showBadgePopover || !buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    // ポップオーバーの推定高さ（バッジ数に応じて変動）
    const estimatedPopoverHeight = Math.min(badges.length * 60 + 60, 400);

    // 下のスペースが足りない場合は上に表示
    /* eslint-disable react-hooks/set-state-in-effect -- 
       ポップオーバー位置計算に必要。この setState は:
       - ポップオーバーが開いたときのみ実行される
       - DOM 測定後の位置決定のため useEffect 内が適切
       - 無限ループは発生しない（依存配列で制御）
    */
    if (spaceBelow < estimatedPopoverHeight && spaceAbove > spaceBelow) {
      setPopoverPosition("top");
    } else {
      setPopoverPosition("bottom");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [showBadgePopover, badges.length]);

  return (
    <li
      className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors ${
        isCurrentUser
          ? "bg-purple-50 dark:bg-purple-900/30 ring-2 ring-purple-500"
          : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      {/* 順位 */}
      <div className="shrink-0 w-6 sm:w-8 text-center">
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
      <Link
        href={`/user/${contributor.login}`}
        className="shrink-0 hover:opacity-80 transition-opacity"
      >
        <Image
          src={contributor.avatarUrl}
          alt={contributor.name}
          width={40}
          height={40}
          className="rounded-full ring-2 ring-transparent hover:ring-purple-500 transition-all w-8 h-8 sm:w-10 sm:h-10"
        />
      </Link>

      {/* 名前とバッジ */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/user/${contributor.login}`}
            className={`font-medium truncate hover:underline ${
              isCurrentUser
                ? "text-purple-700 dark:text-purple-300"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {contributor.name}
          </Link>
          {isCurrentUser && (
            <span className="text-xs text-purple-500">(あなた)</span>
          )}
        </div>
        {/* バッジ（タップで一覧表示） */}
        {badges.length > 0 && (
          <div className="relative mt-1" ref={popoverRef}>
            <button
              ref={buttonRef}
              onClick={() => setShowBadgePopover(!showBadgePopover)}
              className="flex flex-wrap gap-1 items-center cursor-pointer hover:opacity-80 transition-opacity"
            >
              {badges.slice(0, 3).map((badge) => (
                <BadgeChip key={badge.id} badge={badge} />
              ))}
              {badges.length > 3 && (
                <span className="text-xs text-gray-400">+{badges.length - 3}</span>
              )}
            </button>
            
            {/* バッジ一覧ポップオーバー - デスクトップ用（相対位置） */}
            {showBadgePopover && (
              <>
                {/* モバイル: 固定位置モーダル */}
                <div className="sm:hidden fixed inset-0 z-modal flex items-center justify-center p-4">
                  <div 
                    className="fixed inset-0 bg-black/50"
                    onClick={() => setShowBadgePopover(false)}
                  />
                  <div className="relative z-modal w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-medium text-gray-900 dark:text-white">獲得バッジ</span>
                      <button
                        onClick={() => setShowBadgePopover(false)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                      {badges.map((badge) => {
                        const IconComponent = badge.icon;
                        return (
                          <div key={badge.id} className={`flex items-start gap-2 p-2.5 rounded-lg ${badge.color}`}>
                            <IconComponent className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{badge.name}</p>
                              <p className="text-xs opacity-80">{badge.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {/* デスクトップ: 相対位置ポップオーバー */}
                <div className={`hidden sm:block absolute right-0 z-modal w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 animate-in fade-in zoom-in-95 duration-200 max-h-96 overflow-y-auto ${
                  popoverPosition === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">獲得バッジ</span>
                    <button
                      onClick={() => setShowBadgePopover(false)}
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {badges.map((badge) => {
                      const IconComponent = badge.icon;
                      return (
                        <div key={badge.id} className={`flex items-start gap-2 p-2 rounded-lg ${badge.color}`}>
                          <IconComponent className="w-4 h-4 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{badge.name}</p>
                            <p className="text-xs opacity-80">{badge.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
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
      <div className="shrink-0 text-right hidden sm:block">
        <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
          <TrendingUp className="w-4 h-4" />
          <span className="font-bold">{contributor.score.toLocaleString()}</span>
        </div>
        <span className="text-xs text-gray-500">スコア</span>
      </div>
      {/* モバイル用スコア（コンパクト） */}
      <div className="shrink-0 sm:hidden">
        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
          {contributor.score.toLocaleString()}
        </span>
      </div>

      {/* カード生成ボタン */}
      {showCardButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCardClick();
          }}
          className="shrink-0 p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
          title="貢献度カードを生成"
        >
          <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}
    </li>
  );
}

// バッジチップ（すりガラス風）
function BadgeChip({ badge }: { badge: Badge }) {
  const IconComponent = badge.icon;
  
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
      title={badge.description}
    >
      <IconComponent className="w-3 h-3" />
      <span className="hidden lg:inline">{badge.name}</span>
    </span>
  );
}
