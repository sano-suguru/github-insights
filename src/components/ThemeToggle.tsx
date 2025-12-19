"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

function ThemeToggleSkeleton() {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <div className="w-9 h-9 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
      <div className="w-9 h-9 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
      <div className="w-9 h-9 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
    </div>
  );
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, systemTheme } = useTheme();

  // next-themes recommended pattern for SSR/hydration handling
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // デバッグ用
  useEffect(() => {
    if (mounted) {
      console.log("Current theme:", theme, "System theme:", systemTheme);
    }
  }, [theme, systemTheme, mounted]);

  if (!mounted) {
    return <ThemeToggleSkeleton />;
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <button
        onClick={() => setTheme("light")}
        className={`p-2 rounded transition-colors ${
          theme === "light"
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
          theme === "dark"
            ? "bg-white dark:bg-gray-600 shadow-sm"
            : "hover:bg-gray-200 dark:hover:bg-gray-600"
        }`}
        aria-label="ダークモード"
        title="ダークモード"
      >
        <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`p-2 rounded transition-colors ${
          theme === "system"
            ? "bg-white dark:bg-gray-600 shadow-sm"
            : "hover:bg-gray-200 dark:hover:bg-gray-600"
        }`}
        aria-label="システム設定"
        title="システム設定"
      >
        <Monitor className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>
    </div>
  );
}
