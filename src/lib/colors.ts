/**
 * 色調整ユーティリティ
 * GitHub言語色をアプリのダークテーマに合わせて調整
 */

// アプリのテーマカラー（紫系）
const THEME_HUE = 270; // 紫の色相
const THEME_BLEND_RATIO = 0.15; // テーマカラーとのブレンド比率

/**
 * HEXをHSLに変換
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // #を除去
  const cleanHex = hex.replace("#", "");
  
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * HSLをHEXに変換
 */
function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * GitHub言語色をアプリテーマに合わせて調整
 * - 彩度を抑える
 * - 明度をダークテーマ向けに調整
 * - テーマカラー（紫）とブレンド
 */
export function adjustLanguageColor(githubColor: string | null): string {
  // デフォルト色（グレー）
  if (!githubColor) {
    return "#8b5cf6"; // 紫系のデフォルト
  }

  const hsl = hexToHsl(githubColor);

  // 1. テーマカラーとの色相ブレンド
  let newHue = hsl.h + (THEME_HUE - hsl.h) * THEME_BLEND_RATIO;
  if (newHue < 0) newHue += 360;
  if (newHue >= 360) newHue -= 360;

  // 2. 彩度を抑える（最大55%）
  const newSaturation = Math.min(hsl.s, 55);

  // 3. 明度をダークテーマ向けに調整（45-65%の範囲に）
  let newLightness = hsl.l;
  if (newLightness < 45) newLightness = 45;
  if (newLightness > 65) newLightness = 55;

  return hslToHex(Math.round(newHue), newSaturation, newLightness);
}

/**
 * 言語チャート用のカラーパレットを生成
 * インデックスベースでフォールバック色を提供
 */
const FALLBACK_PALETTE = [
  "#8b5cf6", // 紫
  "#6366f1", // インディゴ
  "#3b82f6", // 青
  "#06b6d4", // シアン
  "#10b981", // エメラルド
  "#84cc16", // ライム
  "#eab308", // 黄
  "#f97316", // オレンジ
  "#ef4444", // 赤
  "#ec4899", // ピンク
];

export function getChartColor(githubColor: string | null, index: number): string {
  if (githubColor) {
    return adjustLanguageColor(githubColor);
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}
