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
