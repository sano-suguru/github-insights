"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorDisplayProps {
  /** エラーメッセージまたはErrorオブジェクト */
  error: Error | string | null;
  /** リトライ関数（省略可能） */
  onRetry?: () => void;
  /** コンパクト表示（セクション内で使用） */
  compact?: boolean;
  /** カスタムタイトル */
  title?: string;
}

/**
 * エラー表示コンポーネント
 * 
 * - compact=false: フルページエラー表示
 * - compact=true: セクション内のインラインエラー表示
 */
export function ErrorDisplay({ 
  error, 
  onRetry, 
  compact = false,
  title = "エラーが発生しました"
}: ErrorDisplayProps) {
  const errorMessage = error instanceof Error ? error.message : error || "不明なエラー";
  
  // レート制限エラーかどうか判定
  const isRateLimitError = errorMessage.toLowerCase().includes("rate limit");

  if (compact) {
    return (
      <div className="flex items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700 dark:text-red-300 mb-2">
            {isRateLimitError ? "APIレート制限に達しました" : errorMessage}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              再試行
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {isRateLimitError 
            ? "APIレート制限に達しました。しばらく待ってから再試行してください。"
            : errorMessage
          }
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            再試行
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * チャートセクション用のエラー境界ラッパー
 */
interface ChartErrorWrapperProps {
  isError: boolean;
  error: Error | null;
  onRetry?: () => void;
  children?: React.ReactNode;
  /** エラー時の高さ（チャートの高さに合わせる） */
  errorHeight?: string;
}

export function ChartErrorWrapper({
  isError,
  error,
  onRetry,
  children,
  errorHeight = "h-64"
}: ChartErrorWrapperProps) {
  if (isError) {
    return (
      <div className={errorHeight}>
        <ErrorDisplay error={error} onRetry={onRetry} compact />
      </div>
    );
  }

  return <>{children}</>;
}
