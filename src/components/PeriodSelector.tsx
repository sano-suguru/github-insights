"use client";

import { Calendar, Loader2 } from "lucide-react";

interface PeriodOption {
  label: string;
  days: number | null;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "7日", days: 7 },
  { label: "30日", days: 30 },
  { label: "90日", days: 90 },
  { label: "1年", days: 365 },
  { label: "全期間", days: null },
];

interface PeriodSelectorProps {
  selectedDays: number | null;
  onPeriodChange: (days: number | null) => void;
  isLoading?: boolean;
  isAuthenticated?: boolean;
}

export function PeriodSelector({
  selectedDays,
  onPeriodChange,
  isLoading = false,
  isAuthenticated = true,
}: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <Calendar className="w-4 h-4" />
        <span>期間:</span>
      </div>
      <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {PERIOD_OPTIONS.map((option) => {
          // 未認証時は30日以下のみ有効（レート制限考慮）
          // days=null（全期間）も未認証では無効
          const disabled = !isAuthenticated && (option.days === null || option.days > 30);
          const isSelected = selectedDays === option.days;

          return (
            <button
              key={option.days ?? "all"}
              onClick={() => onPeriodChange(option.days)}
              disabled={disabled || isLoading}
              className={`
                px-3 py-1.5 text-sm rounded-md transition-colors font-medium
                ${isSelected
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }
                ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                ${isLoading ? "pointer-events-none" : ""}
              `}
              title={disabled ? "ログインが必要です" : undefined}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {isLoading && (
        <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
      )}
    </div>
  );
}
