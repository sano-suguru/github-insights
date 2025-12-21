"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

function ThemeToggleSkeleton() {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <div className="w-9 h-9 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
      <div className="w-9 h-9 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
    </div>
  );
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  // next-themes 推奨パターン: SSR/ハイドレーション対策
  // サーバーとクライアントでテーマが異なる場合のミスマッチを防ぐため、
  // マウント後にのみテーマを表示。この setState は初回マウント時のみ実行される。
  // See: https://github.com/pacocoursey/next-themes#avoid-hydration-mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ハイドレーション対策のため必要
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ThemeToggleSkeleton />;
  }

  // 現在表示されているテーマ（システム設定が解決された後）
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <button
        onClick={() => setTheme("light")}
        className={`p-2 rounded transition-colors ${
          !isDark
            ? "bg-white dark:bg-gray-600 shadow-sm"
            : "hover:bg-gray-200 dark:hover:bg-gray-600"
        }`}
        aria-label="ライトモード"
        title="ライトモード"
      >
        <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`p-2 rounded transition-colors ${
          isDark
            ? "bg-white dark:bg-gray-600 shadow-sm"
            : "hover:bg-gray-200 dark:hover:bg-gray-600"
        }`}
        aria-label="ダークモード"
        title="ダークモード"
      >
        <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>
    </div>
  );
}
