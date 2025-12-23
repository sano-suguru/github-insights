"use client";

import { Moon, Sun, Sunrise, Sunset, Clock, type LucideProps } from "lucide-react";
import type { ActivityTimeAnalysis, ActivityTimeType } from "@/lib/github/types";

interface ActivityTimeCardProps {
  activityTime: ActivityTimeAnalysis;
}

const activityIcons: Record<ActivityTimeType, React.ComponentType<LucideProps>> = {
  "night-owl": Moon,
  "early-bird": Sunrise,
  "business-hours": Sun,
  "evening-coder": Sunset,
  balanced: Clock,
};

function getActivityColors(type: ActivityTimeType) {
  switch (type) {
    case "night-owl":
      return {
        bg: "bg-gradient-to-br from-indigo-500 to-purple-600",
        iconBg: "bg-white/20",
      };
    case "early-bird":
      return {
        bg: "bg-gradient-to-br from-amber-400 to-orange-500",
        iconBg: "bg-white/20",
      };
    case "business-hours":
      return {
        bg: "bg-gradient-to-br from-sky-400 to-blue-500",
        iconBg: "bg-white/20",
      };
    case "evening-coder":
      return {
        bg: "bg-gradient-to-br from-orange-500 to-red-500",
        iconBg: "bg-white/20",
      };
    default:
      return {
        bg: "bg-gradient-to-br from-gray-400 to-gray-500",
        iconBg: "bg-white/20",
      };
  }
}

function formatPeakHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
}

/**
 * Activity Time card component displaying user's coding patterns
 * - Activity type (Night Owl, Early Bird, etc.)
 * - Peak hour
 */
export function ActivityTimeCard({ activityTime }: ActivityTimeCardProps) {
  const Icon = activityIcons[activityTime.type] ?? Clock;
  const colors = getActivityColors(activityTime.type);

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-linear-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
          <Clock className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Coding Pattern
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            When you&apos;re most active
          </p>
        </div>
      </div>

      {/* Activity display */}
      <div className={`rounded-xl p-6 ${colors.bg} text-white text-center`}>
        <div className={`w-16 h-16 rounded-full ${colors.iconBg} flex items-center justify-center mx-auto mb-4`}>
          <Icon className="w-8 h-8" />
        </div>
        <p className="text-2xl font-bold mb-2">{activityTime.label}</p>
        <p className="text-white/80 text-sm">
          Peak activity at {formatPeakHour(activityTime.peakHour)} UTC
        </p>
      </div>
    </div>
  );
}
