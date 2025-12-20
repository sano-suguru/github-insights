import type { Badge } from "@/lib/badges";

interface BadgeChipProps {
  badge: Badge;
}

/**
 * バッジチップコンポーネント
 * ユーザーの実績バッジを表示する
 */
export function BadgeChip({ badge }: BadgeChipProps) {
  const IconComponent = badge.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
      title={badge.description}
    >
      <IconComponent className="w-3 h-3" />
      <span>{badge.name}</span>
    </span>
  );
}
