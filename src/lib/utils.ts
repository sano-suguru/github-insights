import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind CSS クラスを結合するユーティリティ
 * clsx と tailwind-merge を組み合わせて、
 * 条件付きクラスと重複クラスのマージを行う
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 数値を読みやすい形式にフォーマット
 * 1000 以上は k、1000000 以上は M 表記
 *
 * @example
 * formatNumber(999) // "999"
 * formatNumber(1234) // "1.2k"
 * formatNumber(12345) // "12k"
 * formatNumber(1234567) // "1.2M"
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 10000) {
    return `${Math.round(num / 1000)}k`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toLocaleString();
}
