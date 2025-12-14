"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 基本のスケルトン要素
 * アニメーションするプレースホルダー
 */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
        className
      )}
      style={style}
    />
  );
}

/**
 * 統計カード用スケルトン
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * 統計カードグリッド用スケルトン（4カード）
 */
export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  );
}

/**
 * 円グラフ用スケルトン（Languages, Contributors）
 */
export function PieChartSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* 円グラフの形状 */}
      <Skeleton className="w-48 h-48 rounded-full" />
      {/* 凡例 */}
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
    </div>
  );
}

/**
 * 折れ線グラフ用スケルトン（Commits）
 */
export function LineChartSkeleton() {
  return (
    <div className="relative h-64 w-full">
      {/* Y軸ラベル */}
      <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between">
        <Skeleton className="h-3 w-6" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-6" />
      </div>
      {/* グラフエリア */}
      <div className="ml-10 h-full flex flex-col">
        <div className="flex-1 flex items-end gap-1 pb-8">
          {/* 波形のようなスケルトン */}
          {[40, 60, 35, 80, 55, 70, 45, 90, 65, 50, 75, 85].map((h, i) => (
            <div key={i} className="flex-1 flex items-end">
              <Skeleton 
                className="w-full rounded-t" 
                style={{ height: `${h}%` }}
              />
            </div>
          ))}
        </div>
        {/* X軸ラベル */}
        <div className="flex justify-between">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}

/**
 * ヒートマップ用スケルトン（Activity）
 */
export function HeatmapSkeleton() {
  return (
    <div className="space-y-2">
      {/* 曜日ラベル */}
      <div className="flex gap-1 pl-8">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="w-6 h-3" />
        ))}
      </div>
      {/* ヒートマップグリッド */}
      <div className="space-y-1">
        {Array.from({ length: 7 }, (_, row) => (
          <div key={row} className="flex gap-1">
            <Skeleton className="w-6 h-4" />
            {Array.from({ length: 12 }, (_, col) => (
              <Skeleton 
                key={col} 
                className="w-4 h-4 rounded-sm"
                style={{ 
                  opacity: 0.3 + Math.random() * 0.7 
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 棒グラフ用スケルトン（Contributors bar chart）
 */
export function BarChartSkeleton() {
  return (
    <div className="space-y-3">
      {[90, 75, 60, 45, 30].map((width, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 flex items-center gap-2">
            <Skeleton className="h-6 rounded" style={{ width: `${width}%` }} />
            <Skeleton className="h-4 w-10 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ランキングカード用スケルトン
 */
export function RankingCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
      <Skeleton className="w-8 h-8 rounded-full" />
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

/**
 * ランキングセクション用スケルトン
 */
export function RankingSkeleton() {
  return (
    <div className="space-y-4">
      <RankingCardSkeleton />
      <RankingCardSkeleton />
      <RankingCardSkeleton />
    </div>
  );
}

/**
 * 自分の貢献サマリー用スケルトン
 */
export function MyContributionSkeleton() {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <Skeleton className="h-8 w-12 mx-auto mb-2" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton className="h-8 w-12 mx-auto mb-2" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton className="h-8 w-12 mx-auto mb-2" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton className="h-8 w-12 mx-auto mb-2" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
      </div>
    </div>
  );
}

/**
 * チャートカードラッパー - ローディング時にスケルトン表示
 */
interface ChartSkeletonWrapperProps {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}

export function ChartSkeletonWrapper({
  isLoading,
  skeleton,
  children,
}: ChartSkeletonWrapperProps) {
  if (isLoading) {
    return <>{skeleton}</>;
  }
  return <>{children}</>;
}
