"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  MapPin,
  Building2,
  Link as LinkIcon,
  Calendar,
  ExternalLink,
  Camera,
  X,
} from "lucide-react";
import type { UserProfile } from "@/lib/github/types";
import type { Badge } from "@/lib/badges";
import { BadgeChip } from "@/components/BadgeChip";

interface UserProfileHeaderProps {
  profile: UserProfile;
  joinedDate: string;
  userBadges: Badge[];
  onOpenCardModal: () => void;
}

/**
 * ユーザープロフィールヘッダー
 * アバター、基本情報、バッジ、アクションボタンを表示
 */
export function UserProfileHeader({
  profile,
  joinedDate,
  userBadges,
  onOpenCardModal,
}: UserProfileHeaderProps) {
  const [showBadgePopover, setShowBadgePopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<"bottom" | "top">(
    "bottom"
  );
  const badgeButtonRef = useRef<HTMLButtonElement>(null);

  // ポップオーバーの表示位置を計算してトグル
  const toggleBadgePopover = useCallback(() => {
    if (!showBadgePopover && badgeButtonRef.current) {
      const buttonRect = badgeButtonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      // ポップオーバーの推定高さ（バッジ数に応じて変動）
      const estimatedPopoverHeight = Math.min(userBadges.length * 60 + 60, 400);

      // 下のスペースが足りない場合は上に表示
      if (spaceBelow < estimatedPopoverHeight && spaceAbove > spaceBelow) {
        setPopoverPosition("top");
      } else {
        setPopoverPosition("bottom");
      }
    }
    setShowBadgePopover((prev) => !prev);
  }, [showBadgePopover, userBadges.length]);

  return (
    <div className="relative z-content bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 md:p-8 mb-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* アバター */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profile.avatarUrl}
          alt={profile.login}
          className="w-32 h-32 rounded-full border-4 border-purple-100 dark:border-purple-900 shadow-lg"
        />

        {/* プロファイル情報 */}
        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {profile.name || profile.login}
            </h1>
            {profile.type === "Organization" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full w-fit">
                <Building2 className="w-3 h-3" />
                Organization
              </span>
            )}
          </div>

          <a
            href={`https://github.com/${profile.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors mb-4"
          >
            @{profile.login}
            <ExternalLink className="w-3 h-3" />
          </a>

          {profile.bio && (
            <p className="text-gray-700 dark:text-gray-300 mb-4 max-w-2xl">
              {profile.bio}
            </p>
          )}

          {/* メタ情報 */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            {profile.company && (
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {profile.company}
              </span>
            )}
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {profile.location}
              </span>
            )}
            {profile.blog && (
              <a
                href={
                  profile.blog.startsWith("http")
                    ? profile.blog
                    : `https://${profile.blog}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-purple-500 dark:hover:text-purple-400"
              >
                <LinkIcon className="w-4 h-4" />
                {profile.blog.replace(/^https?:\/\//, "")}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Joined {joinedDate}
            </span>
          </div>

          {/* バッジ */}
          {userBadges.length > 0 && (
            <div className="relative mt-4">
              <button
                ref={badgeButtonRef}
                onClick={toggleBadgePopover}
                aria-expanded={showBadgePopover}
                aria-label={`${userBadges.length}個のバッジを表示`}
                className="flex flex-wrap gap-2 items-center cursor-pointer hover:opacity-80 transition-opacity"
              >
                {userBadges.slice(0, 4).map((badge) => (
                  <BadgeChip key={badge.id} badge={badge} />
                ))}
                {userBadges.length > 4 && (
                  <span className="text-xs text-gray-400">
                    +{userBadges.length - 4}
                  </span>
                )}
              </button>

              {/* バッジ一覧ポップオーバー */}
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
                        <span className="text-base font-medium text-gray-900 dark:text-white">
                          Badges
                        </span>
                        <button
                          onClick={() => setShowBadgePopover(false)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <X className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {userBadges.map((badge) => {
                          const IconComponent = badge.icon;
                          return (
                            <div
                              key={badge.id}
                              className={`flex items-start gap-2 p-2.5 rounded-lg ${badge.color}`}
                            >
                              <IconComponent className="w-5 h-5 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">
                                  {badge.name}
                                </p>
                                <p className="text-xs opacity-80">
                                  {badge.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* デスクトップ: 相対位置ポップオーバー */}
                  <div
                    className={`hidden sm:block absolute right-0 z-modal w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 animate-in fade-in zoom-in-95 duration-200 max-h-96 overflow-y-auto ${
                      popoverPosition === "bottom"
                        ? "top-full mt-2"
                        : "bottom-full mb-2"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Badges
                      </span>
                      <button
                        onClick={() => setShowBadgePopover(false)}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {userBadges.map((badge) => {
                        const IconComponent = badge.icon;
                        return (
                          <div
                            key={badge.id}
                            className={`flex items-start gap-2 p-2 rounded-lg ${badge.color}`}
                          >
                            <IconComponent className="w-4 h-4 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{badge.name}</p>
                              <p className="text-xs opacity-80">
                                {badge.description}
                              </p>
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

          {/* カード生成ボタン */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={onOpenCardModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Camera className="w-4 h-4" />
              Generate Card
            </button>
            <Link
              href={`/user/${profile.login}/wrapped/${new Date().getFullYear()}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Calendar className="w-4 h-4" />
              Year in Review
            </Link>
          </div>
        </div>

        {/* フォロワー統計 */}
        <div className="flex md:flex-col gap-6 md:gap-4 text-center md:text-right">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {profile.followers.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center md:justify-end gap-1">
              <Users className="w-4 h-4" />
              Followers
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {profile.following.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Following
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
