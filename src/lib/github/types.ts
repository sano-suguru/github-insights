/**
 * GitHub API の型定義
 * テスト不要 - 型のみ
 */

// ========== 基本型 ==========

export type GitHubAccountType = "User" | "Organization";

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
  used: number;
}

// ========== リポジトリ関連 ==========

export interface Repository {
  id: string;
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  isPrivate: boolean;
  primaryLanguage: {
    name: string;
    color: string;
  } | null;
  updatedAt: string;
  stargazerCount: number;
  forkCount: number;
}

export interface SearchRepositoryResult {
  name: string;
  nameWithOwner: string;
  description: string | null;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string; color: string } | null;
  updatedAt: string;
}

export interface SearchRepositoriesResult {
  repositories: SearchRepositoryResult[];
  rateLimit: RateLimitInfo | null;
}

export interface RepositoryStat {
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  watchers: number;
  issues: number;
  pullRequests: number;
  commits: number;
}

// ========== ユーザー関連 ==========

export interface SearchUserResult {
  login: string;
  avatarUrl: string;
  name: string | null;
  followers: number;
  publicRepos: number;
  type: GitHubAccountType;
}

export interface SearchUsersResult {
  users: SearchUserResult[];
  rateLimit: RateLimitInfo | null;
}

export interface UserProfile {
  login: string;
  avatarUrl: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  twitterUsername: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  publicGists: number;
  createdAt: string;
  type: GitHubAccountType;
}

export interface UserRepository {
  name: string;
  nameWithOwner: string;
  description: string | null;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string; color: string } | null;
  updatedAt: string;
  isArchived: boolean;
  isFork: boolean;
}

export interface UserStats {
  totalStars: number;
  totalForks: number;
  totalRepos: number;
  languageBreakdown: { name: string; color: string; count: number; percentage: number }[];
  topRepositories: UserRepository[];
}

export interface UserEvent {
  id: string;
  type: string;
  createdAt: string;
  repo: {
    name: string;
  };
}

export interface UserContributionStats {
  totalPRs: number;
  totalIssues: number;
}

export interface YearlyStats {
  year: number;
  prs: number;
  issues: number;
  totalContributions?: number;
  longestStreak?: number;
  currentStreak?: number;
}

// ========== 統計関連 ==========

export interface LanguageStat {
  name: string;
  color: string;
  size: number;
  percentage: number;
}

export interface CommitInfo {
  committedDate: string;
  author: { name: string; user: { login: string } | null };
  additions: number;
  deletions: number;
  message: string;
}

export interface ContributorStat {
  login: string;
  name: string;
  avatarUrl: string;
  commits: number;
}

export interface ContributorDetailStat {
  login: string;
  name: string;
  avatarUrl: string;
  commits: number;
  additions: number;
  deletions: number;
  pullRequests: number;
  reviews: number;
  score: number;
  rank: number;
}

export interface CommitHistoryOptions {
  days?: number | null;
  maxCommits?: number;
}

// ========== 活動時間分析 ==========

export type ActivityTimeType =
  | "night-owl"
  | "early-bird"
  | "business-hours"
  | "evening-coder"
  | "balanced";

export interface ActivityTimeAnalysis {
  type: ActivityTimeType;
  peakHour: number;
  distribution: number[];
  label: string;
}
