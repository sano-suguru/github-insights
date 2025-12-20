/**
 * OG画像生成用の共通コンポーネント
 * 
 * @vercel/og の ImageResponse は Satori を使用してReact要素をSVGに変換するため、
 * 標準的なReactコンポーネントとは異なる制約があります:
 * - flexbox のみサポート（gridは非対応）
 * - 一部のCSSプロパティは非対応
 * - next/image は使用不可（通常の img タグを使用）
 */

import { OG_COLORS, OG_ICONS, OG_WIDTH, OG_HEIGHT } from "./constants";

// ========== 型定義 ==========

interface ErrorCardProps {
  message: string;
  width?: number;
  height?: number;
}

interface FooterProps {
  /** 右寄せでブランド表示のみ（デフォルト） */
  variant?: "simple" | "with-meta";
  /** variant="with-meta" 時の左側テキスト */
  leftText?: string;
}

interface StatBoxProps {
  label: string;
  value: string;
  /** カスタム背景色 */
  bgColor?: string;
  /** カスタムボーダー色 */
  borderColor?: string;
}

interface BackgroundGlowProps {
  /** グローの位置 */
  position: "top-right" | "bottom-left" | "center";
  /** グローの色（デフォルト: purple） */
  color?: "purple" | "pink" | "indigo";
  /** サイズ（デフォルト: 400） */
  size?: number;
}

// ========== コンポーネント ==========

/**
 * エラー表示カード
 * ユーザーが見つからない、リポジトリが見つからない等のエラー時に使用
 */
export function ErrorCard({ 
  message, 
  width = OG_WIDTH, 
  height = OG_HEIGHT 
}: ErrorCardProps) {
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${OG_COLORS.bgDark} 0%, ${OG_COLORS.bgPurple} 50%, ${OG_COLORS.bgDark} 100%)`,
        color: OG_COLORS.white,
        fontSize: 32,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {message}
    </div>
  );
}

/**
 * フッターコンポーネント
 * GitHub Insights ロゴとブランド名を表示
 */
export function Footer({ variant = "simple", leftText }: FooterProps) {
  if (variant === "with-meta" && leftText) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 48px",
          background: "rgba(0,0,0,0.25)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <span style={{ color: OG_COLORS.purple300, fontSize: 14, fontWeight: 500 }}>
          {leftText}
        </span>
        <span style={{ color: OG_COLORS.purple400, fontSize: 14, fontWeight: 500 }}>
          github-insights.vercel.app
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginTop: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* GitHubロゴ */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${OG_COLORS.purple500}, ${OG_COLORS.pink500})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d={OG_ICONS.github} />
          </svg>
        </div>
        <span
          style={{
            background: `linear-gradient(135deg, ${OG_COLORS.purple400}, ${OG_COLORS.pink500})`,
            backgroundClip: "text",
            color: "transparent",
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          GitHub Insights
        </span>
      </div>
    </div>
  );
}

/**
 * 統計ボックスコンポーネント
 * 数値とラベルを表示するカード
 */
export function StatBox({ 
  label, 
  value,
  bgColor = OG_COLORS.cardBg,
  borderColor = OG_COLORS.cardBorder,
}: StatBoxProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: bgColor,
        padding: "16px 28px",
        borderRadius: 16,
        minWidth: 110,
        border: `1px solid ${borderColor}`,
      }}
    >
      <span
        style={{
          color: OG_COLORS.white,
          fontSize: 34,
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {value}
      </span>
      <span style={{ color: OG_COLORS.gray400, fontSize: 18 }}>{label}</span>
    </div>
  );
}

/**
 * 背景グローエフェクト
 * 装飾的な光のぼかし効果
 */
export function BackgroundGlow({ 
  position, 
  color = "purple",
  size = 400,
}: BackgroundGlowProps) {
  const colorMap = {
    purple: OG_COLORS.glowPurple,
    pink: OG_COLORS.glowPink,
    indigo: "rgba(99, 102, 241, 0.15)",
  };

  const positionStyles = {
    "top-right": { top: -100, right: -100 },
    "bottom-left": { bottom: -100, left: -100 },
    "center": { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
  };

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyles[position],
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${colorMap[color]} 0%, transparent 70%)`,
        display: "flex",
      }}
    />
  );
}

/**
 * カード背景コンポーネント
 * グラデーション背景とグローエフェクトを含む
 */
export function CardBackground({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(135deg, ${OG_COLORS.bgDark} 0%, ${OG_COLORS.bgPurple} 50%, ${OG_COLORS.bgDark} 100%)`,
        padding: 48,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 背景グロー */}
      <BackgroundGlow position="top-right" color="purple" size={400} />
      <BackgroundGlow position="bottom-left" color="indigo" size={400} />
      
      {children}
    </div>
  );
}

/**
 * ユーザーアバターコンポーネント
 * 
 * @vercel/og では next/image が使えないため、通常の img タグを使用
 */
export function Avatar({ 
  src, 
  alt, 
  size = 140,
  borderWidth = 4,
}: { 
  src: string; 
  alt: string; 
  size?: number;
  borderWidth?: number;
}) {
  return (
    // @vercel/og の ImageResponse は Satori を使用してReact要素をSVGに変換するため、
    // next/image の <Image /> コンポーネントは使用できません。通常の <img> タグが必要です。
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{
        borderRadius: size / 2,
        border: `${borderWidth}px solid ${OG_COLORS.purple500}`,
      }}
    />
  );
}
