/**
 * データ変換ロジック（純粋関数）
 * 100% テスト可能
 */

import type {
  GitHubAccountType,
  UserRepository,
  UserStats,
  UserEvent,
  ActivityTimeType,
  ActivityTimeAnalysis,
} from "./types";

/**
 * GitHub アカウントタイプをバリデーション付きで取得
 */
export function parseAccountType(type: unknown): GitHubAccountType {
  if (type === "User" || type === "Organization") {
    return type;
  }
  // 未知のタイプはデフォルトで "User" として扱う
  return "User";
}

/**
 * ユーザー統計を計算
 */
export function calculateUserStats(repositories: UserRepository[]): UserStats {
  const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazerCount, 0);
  const totalForks = repositories.reduce((sum, repo) => sum + repo.forkCount, 0);
  const totalRepos = repositories.length;

  // 言語の統計を計算
  const languageMap: Record<string, { color: string; count: number }> = {};
  repositories.forEach((repo) => {
    if (repo.primaryLanguage) {
      const { name, color } = repo.primaryLanguage;
      if (!languageMap[name]) {
        languageMap[name] = { color, count: 0 };
      }
      languageMap[name].count += 1;
    }
  });

  const languageBreakdown = Object.entries(languageMap)
    .map(([name, { color, count }]) => ({
      name,
      color,
      count,
      percentage: totalRepos > 0 ? Math.round((count / totalRepos) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // トップリポジトリ（スター数順上位10件）
  const topRepositories = repositories
    .filter((repo) => !repo.isFork && !repo.isArchived)
    .slice(0, 10);

  return {
    totalStars,
    totalForks,
    totalRepos,
    languageBreakdown,
    topRepositories,
  };
}

/**
 * ストリーク計算
 * contributionDays 配列から最長ストリークと現在のストリークを計算
 */
export function calculateStreaks(
  contributionDays: Array<{ contributionCount: number; date: string }>,
  year: number
): { longestStreak: number; currentStreak: number } {
  if (contributionDays.length === 0) {
    return { longestStreak: 0, currentStreak: 0 };
  }

  let longestStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;

  // 日付でソート（昇順）
  const sorted = [...contributionDays].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // 今日の日付（年末までの計算のため）
  const today = new Date();
  const isCurrentYear = year === today.getFullYear();
  const todayStr = today.toISOString().split("T")[0];

  for (let i = 0; i < sorted.length; i++) {
    const day = sorted[i];

    if (day.contributionCount > 0) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // 現在のストリーク計算（年末から逆順に数える）
  if (isCurrentYear) {
    // 今日までのデータで計算
    const todayIndex = sorted.findIndex((d) => d.date === todayStr);
    if (todayIndex >= 0) {
      for (let i = todayIndex; i >= 0; i--) {
        if (sorted[i].contributionCount > 0) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  } else {
    // 過去の年は年末から計算
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].contributionCount > 0) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { longestStreak, currentStreak };
}

/**
 * ユーザーのイベントから活動時間帯を分析
 * NOTE: Events API は直近90日間（最大300件）のみ取得可能
 */
export function analyzeActivityTime(events: UserEvent[]): ActivityTimeAnalysis {
  // 時間帯ごとのカウント（0-23時）
  const hourCounts = new Array(24).fill(0);

  for (const event of events) {
    const date = new Date(event.createdAt);
    const hour = date.getUTCHours(); // UTC で一貫性を保つ
    hourCounts[hour]++;
  }

  const totalEvents = events.length;

  if (totalEvents === 0) {
    return {
      type: "balanced",
      peakHour: 12,
      distribution: new Array(24).fill(100 / 24),
      label: "Balanced",
    };
  }

  // 分布を % に変換
  const distribution = hourCounts.map((count) =>
    Math.round((count / totalEvents) * 100)
  );

  // ピーク時間
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  // 時間帯ごとの合計を計算
  const nightOwlHours = [22, 23, 0, 1, 2, 3].reduce(
    (sum, h) => sum + hourCounts[h],
    0
  );
  const earlyBirdHours = [4, 5, 6, 7, 8].reduce(
    (sum, h) => sum + hourCounts[h],
    0
  );
  const businessHours = [9, 10, 11, 12, 13, 14, 15, 16, 17].reduce(
    (sum, h) => sum + hourCounts[h],
    0
  );
  const eveningHours = [18, 19, 20, 21].reduce(
    (sum, h) => sum + hourCounts[h],
    0
  );

  // 最も多い時間帯を判定（30%以上で判定）
  const threshold = totalEvents * 0.3;

  let type: ActivityTimeType;
  let label: string;

  if (
    nightOwlHours > threshold &&
    nightOwlHours >= Math.max(earlyBirdHours, businessHours, eveningHours)
  ) {
    type = "night-owl";
    label = "Night Owl";
  } else if (
    earlyBirdHours > threshold &&
    earlyBirdHours >= Math.max(nightOwlHours, businessHours, eveningHours)
  ) {
    type = "early-bird";
    label = "Early Bird";
  } else if (
    businessHours > threshold &&
    businessHours >= Math.max(nightOwlHours, earlyBirdHours, eveningHours)
  ) {
    type = "business-hours";
    label = "9-to-5 Coder";
  } else if (
    eveningHours > threshold &&
    eveningHours >= Math.max(nightOwlHours, earlyBirdHours, businessHours)
  ) {
    type = "evening-coder";
    label = "Evening Coder";
  } else {
    type = "balanced";
    label = "All-Day Coder";
  }

  return {
    type,
    peakHour,
    distribution,
    label,
  };
}
