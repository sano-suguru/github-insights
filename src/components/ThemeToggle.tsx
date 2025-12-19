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

  // next-themes recommended pattern for SSR/hydration handling
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
