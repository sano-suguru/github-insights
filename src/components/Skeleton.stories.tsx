import type { Meta, StoryObj } from "@storybook/nextjs";
import {
  Skeleton,
  StatCardSkeleton,
  StatsGridSkeleton,
  PieChartSkeleton,
  LineChartSkeleton,
  HeatmapSkeleton,
  BarChartSkeleton,
  RankingCardSkeleton,
  RankingSkeleton,
  MyContributionSkeleton,
} from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "Components/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="p-4 bg-gray-50 dark:bg-gray-900">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Skeleton>;

/**
 * 基本のスケルトン要素
 */
export const Default: Story = {
  args: {
    className: "w-32 h-4",
  },
};

/**
 * 様々なサイズのスケルトン
 */
export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <Skeleton className="w-16 h-3" />
      <Skeleton className="w-32 h-4" />
      <Skeleton className="w-48 h-6" />
      <Skeleton className="w-64 h-8" />
    </div>
  ),
};

/**
 * 円形のスケルトン（アバター用）
 */
export const Circle: Story = {
  render: () => (
    <div className="flex gap-4">
      <Skeleton className="w-8 h-8 rounded-full" />
      <Skeleton className="w-12 h-12 rounded-full" />
      <Skeleton className="w-16 h-16 rounded-full" />
    </div>
  ),
};

/**
 * 統計カードのスケルトン
 */
export const StatCard: Story = {
  render: () => <StatCardSkeleton />,
};

/**
 * 統計カードグリッド（4カード）
 */
export const StatsGrid: Story = {
  render: () => <StatsGridSkeleton />,
};

/**
 * 円グラフ用スケルトン
 */
export const PieChart: Story = {
  render: () => (
    <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-xl">
      <PieChartSkeleton />
    </div>
  ),
};

/**
 * 折れ線グラフ用スケルトン
 */
export const LineChart: Story = {
  render: () => (
    <div className="w-full max-w-lg bg-white dark:bg-gray-800 p-6 rounded-xl">
      <LineChartSkeleton />
    </div>
  ),
};

/**
 * ヒートマップ用スケルトン
 */
export const Heatmap: Story = {
  render: () => (
    <div className="w-full max-w-lg bg-white dark:bg-gray-800 p-6 rounded-xl">
      <HeatmapSkeleton />
    </div>
  ),
};

/**
 * 棒グラフ用スケルトン
 */
export const BarChart: Story = {
  render: () => (
    <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-xl">
      <BarChartSkeleton />
    </div>
  ),
};

/**
 * ランキングカード用スケルトン
 */
export const RankingCard: Story = {
  render: () => (
    <div className="w-full max-w-md">
      <RankingCardSkeleton />
    </div>
  ),
};

/**
 * ランキングセクション用スケルトン
 */
export const Ranking: Story = {
  render: () => (
    <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-xl">
      <RankingSkeleton />
    </div>
  ),
};

/**
 * 自分の貢献サマリー用スケルトン
 */
export const MyContribution: Story = {
  render: () => (
    <div className="w-full max-w-2xl">
      <MyContributionSkeleton />
    </div>
  ),
};

/**
 * ダッシュボード全体のローディング状態イメージ
 */
export const DashboardLoading: Story = {
  render: () => (
    <div className="space-y-6">
      <StatsGridSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl">
          <Skeleton className="h-5 w-24 mb-4" />
          <PieChartSkeleton />
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl">
          <Skeleton className="h-5 w-20 mb-4" />
          <LineChartSkeleton />
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl">
          <Skeleton className="h-5 w-32 mb-4" />
          <BarChartSkeleton />
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl">
          <Skeleton className="h-5 w-20 mb-4" />
          <HeatmapSkeleton />
        </div>
      </div>
    </div>
  ),
};
