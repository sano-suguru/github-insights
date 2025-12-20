/**
 * アプリケーションロガー
 *
 * 本番環境では warn/error のみ出力
 * 開発環境では全レベル出力
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  process.env.NODE_ENV === "production" ? "warn" : "debug";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (shouldLog("debug")) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    if (shouldLog("info")) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (shouldLog("warn")) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    if (shouldLog("error")) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
};
