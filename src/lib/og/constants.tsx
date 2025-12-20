/**
 * OG画像生成用の定数定義
 */

import type { OgBadgeColorScheme } from "@/lib/badges";

// ========== OG画像サイズ ==========

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// ========== 共通カラーパレット ==========

/**
 * OG画像で使用する共通カラー
 * 各カードタイプで上書き可能
 */
export const OG_COLORS = {
  // 背景（共通）
  bgDark: "#0f172a",      // slate-900
  bgPurple: "#581c87",    // purple-900
  bgIndigo: "#1e1b4b",    // indigo-950
  bgMid: "#581c87",       // alias for bgPurple (互換性用)
  
  // アクセント（共通）
  purple500: "#a855f7",
  purple400: "#c084fc",
  purple300: "#d8b4fe",
  purple200: "#e9d5ff",
  pink500: "#ec4899",
  pink400: "#f472b6",
  
  // メダルカラー
  gold: "#fbbf24",
  silver: "#94a3b8",
  bronze: "#f59e0b",
  
  // テキスト
  white: "#ffffff",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  
  // 追加カラー
  green400: "#4ade80",
  orange400: "#fb923c",
  blue400: "#60a5fa",
  yellow400: "#facc15",
  
  // カード背景
  cardBg: "rgba(31, 41, 55, 0.6)",      // gray-800/60
  cardBorder: "rgba(139, 92, 246, 0.2)", // purple-500/20
  
  // バッジ（デフォルト）
  badgeBg: "rgba(168, 85, 247, 0.2)",
  badgeText: "#c084fc",
  badgeBorder: "rgba(168, 85, 247, 0.4)",
  
  // グロー効果
  glowPurple: "rgba(168, 85, 247, 0.4)",
  glowPink: "rgba(236, 72, 153, 0.3)",
} as const;

// ========== SVGアイコンパス ==========

/**
 * OG画像で使用するSVGアイコンパス
 * lucide-reactと同等のパスを使用
 */
export const OG_ICONS = {
  // Git関連
  gitCommit:
    "M12 6a6 6 0 0 0-6 6h-4a1 1 0 0 0 0 2h4a6 6 0 0 0 12 0h4a1 1 0 0 0 0-2h-4a6 6 0 0 0-6-6zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
  gitPullRequest:
    "M18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-1-3.17V6a4 4 0 0 0-4-4H9.83a3.001 3.001 0 1 0 0 2H13a2 2 0 0 1 2 2v5.83a3.001 3.001 0 1 0 2 0zM6 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z",
  gitFork:
    "M12 2a3 3 0 0 0-1 5.83V10H7a2 2 0 0 0-2 2v1.17a3.001 3.001 0 1 0 2 0V12h4v4.17a3.001 3.001 0 1 0 2 0V12h4v1.17a3.001 3.001 0 1 0 2-0V12a2 2 0 0 0-2-2h-4V7.83A3 3 0 0 0 12 2z",
  
  // アイコン
  trophy:
    "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  circleDot: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm0-12a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  flame: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
  fire: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z", // alias for flame
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  
  // ブランド
  github:
    "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z",
} as const;

// ========== バッジカラーマッピング ==========

/**
 * コントリビューターカード用バッジカラー
 */
export const CONTRIBUTOR_BADGE_COLORS: Record<string, OgBadgeColorScheme> = {
  // 順位ベース（紫系）
  "Top Contributor": { bg: "rgba(168, 85, 247, 0.3)", text: "#e9d5ff", border: "rgba(168, 85, 247, 0.6)" },
  "Top 3": { bg: "rgba(236, 72, 153, 0.3)", text: "#fbcfe8", border: "rgba(236, 72, 153, 0.6)" },
  // コミット数ベース（アンバー/ゴールド系）
  "Core Contributor": { bg: "rgba(245, 158, 11, 0.3)", text: "#fde68a", border: "rgba(245, 158, 11, 0.6)" },
  "Dedicated": { bg: "rgba(132, 204, 22, 0.3)", text: "#d9f99d", border: "rgba(132, 204, 22, 0.6)" },
  "Active": { bg: "rgba(16, 185, 129, 0.3)", text: "#a7f3d0", border: "rgba(16, 185, 129, 0.6)" },
  // PR/Issue ベース（ブルー系）
  "PR Master": { bg: "rgba(59, 130, 246, 0.3)", text: "#bfdbfe", border: "rgba(59, 130, 246, 0.6)" },
  "Bug Hunter": { bg: "rgba(249, 115, 22, 0.3)", text: "#fed7aa", border: "rgba(249, 115, 22, 0.6)" },
};

/**
 * ユーザーカード用バッジカラー
 */
export const USER_BADGE_COLORS: Record<string, OgBadgeColorScheme> = {
  // 人気/影響力ベース（紫〜ピンク系）
  "Influencer": { bg: "rgba(168, 85, 247, 0.3)", text: "#e9d5ff", border: "rgba(168, 85, 247, 0.6)" },
  "Popular": { bg: "rgba(236, 72, 153, 0.3)", text: "#fbcfe8", border: "rgba(236, 72, 153, 0.6)" },
  // リポジトリ数ベース（グリーン系）
  "Prolific": { bg: "rgba(16, 185, 129, 0.3)", text: "#a7f3d0", border: "rgba(16, 185, 129, 0.6)" },
  "Builder": { bg: "rgba(20, 184, 166, 0.3)", text: "#99f6e4", border: "rgba(20, 184, 166, 0.6)" },
  // PR数ベース（ブルー系）
  "PR Master": { bg: "rgba(59, 130, 246, 0.3)", text: "#bfdbfe", border: "rgba(59, 130, 246, 0.6)" },
  "Contributor": { bg: "rgba(99, 102, 241, 0.3)", text: "#c7d2fe", border: "rgba(99, 102, 241, 0.6)" },
  // 古参ユーザー（アンバー系）
  "Veteran": { bg: "rgba(245, 158, 11, 0.3)", text: "#fde68a", border: "rgba(245, 158, 11, 0.6)" },
};

// ========== ヘルパー関数 ==========

/**
 * ランクに応じたメダルカラーを取得
 */
export function getRankColor(rank: number): string {
  if (rank === 1) return OG_COLORS.gold;
  if (rank === 2) return OG_COLORS.silver;
  if (rank === 3) return OG_COLORS.bronze;
  return OG_COLORS.purple400;
}

/**
 * ランクに応じた絵文字ラベルを取得
 */
export function getRankLabel(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

/**
 * アクティビティグリッドを生成（貢献度に基づいてランダム風に）
 */
export function generateActivityGrid(commits: number, seed: number): number[] {
  const grid: number[] = [];
  const intensity = Math.min(commits / 10, 10);
  for (let i = 0; i < 35; i++) {
    const random = ((seed * (i + 1) * 9301 + 49297) % 233280) / 233280;
    const level = random < 0.2 ? 0 : random < 0.5 ? 1 : random < 0.7 ? 2 : random < 0.9 ? 3 : 4;
    grid.push(Math.min(level, Math.ceil(intensity / 2)));
  }
  return grid;
}

// ========== SVGアイコンコンポーネント ==========

/**
 * OG画像内で使用するSVGアイコンコンポーネント
 */
export function SvgIcon({ 
  path, 
  size = 24, 
  color = OG_COLORS.white 
}: { 
  path: string; 
  size?: number; 
  color?: string 
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}
