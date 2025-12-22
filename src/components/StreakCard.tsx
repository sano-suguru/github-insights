"use client";

import { Flame, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
}

/**
 * Streak card component displaying consecutive contribution days
 * - Current streak (including today)
 * - Longest streak (personal record)
 */
export function StreakCard({ currentStreak, longestStreak }: StreakCardProps) {
  const getStreakColors = (streak: number) => {
    if (streak >= 100) {
      return {
        bg: "bg-gradient-to-br from-purple-500 to-pink-500",
        text: "text-white",
        iconBg: "bg-white/20",
      };
    }
    if (streak >= 30) {
      return {
        bg: "bg-gradient-to-br from-orange-500 to-red-500",
        text: "text-white",
        iconBg: "bg-white/20",
      };
    }
    if (streak >= 7) {
      return {
        bg: "bg-gradient-to-br from-amber-400 to-orange-500",
        text: "text-white",
        iconBg: "bg-white/20",
      };
    }
    return {
      bg: "bg-gray-100 dark:bg-gray-700",
      text: "text-gray-700 dark:text-gray-200",
      iconBg: "bg-gray-200 dark:bg-gray-600",
    };
  };

  const currentColors = getStreakColors(currentStreak);
  const isPersonalBest = currentStreak > 0 && currentStreak === longestStreak;

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-linear-to-br from-orange-400 to-red-500 flex items-center justify-center">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Contribution Streak
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Consecutive days of activity
            </p>
          </div>
        </div>
        {isPersonalBest && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
            <Zap className="w-3 h-3" />
            Personal Best
          </span>
        )}
      </div>

      {/* Streak display */}
      <div className="grid grid-cols-2 gap-4">
        {/* Current Streak */}
        <div className={cn("rounded-xl p-4", currentColors.bg, currentColors.text)}>
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", currentColors.iconBg)}>
              <Flame className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium opacity-90">Current</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{currentStreak}</span>
            <span className="text-sm opacity-75">days</span>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="rounded-xl p-4 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Longest
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {longestStreak}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
