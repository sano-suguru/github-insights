"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Users,
  GitFork,
  Star,
  MapPin,
  Building2,
  Link as LinkIcon,
  Calendar,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { UserProfile, UserStats } from "@/lib/github";
import DashboardLayout, { StatCard, SectionCard } from "@/components/DashboardLayout";

// チャートコンポーネント（SSR無効化）
const LanguagesPieChart = dynamic(
  () => import("@/components/charts/LanguagesPieChart"),
  { ssr: false }
);

// ユーザーデータを取得する関数
async function fetchUserData(username: string): Promise<{
  profile: UserProfile;
  stats: UserStats;
}> {
  const response = await fetch(`/api/github/user/${encodeURIComponent(username)}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("USER_NOT_FOUND");
    }
    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    throw new Error("FETCH_ERROR");
  }

  return response.json();
}

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["userProfile", username],
    queryFn: () => fetchUserData(username),
    staleTime: 1000 * 60 * 30, // 30分
    retry: false,
  });

  // エラー状態
  if (error || (!isLoading && !data)) {
    const errorMessage = error instanceof Error ? error.message : "UNKNOWN";
    
    return (
      <DashboardLayout>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          {errorMessage === "USER_NOT_FOUND" ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                ユーザーが見つかりません
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                「{username}」というユーザーは存在しないか、アクセスできません。
              </p>
            </>
          ) : errorMessage === "RATE_LIMIT" ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                レート制限に達しました
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                しばらく待ってから再度お試しください。
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                エラーが発生しました
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                ユーザー情報の取得に失敗しました。
              </p>
            </>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ローディング状態
  if (isLoading || !data) {
    return <DashboardLayout isLoading />;
  }

  const { profile, stats } = data;
  const joinedDate = new Date(profile.createdAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });

  return (
    <DashboardLayout>
      {/* プロファイルヘッダー */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* アバター */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.avatarUrl}
            alt={profile.login}
            className="w-32 h-32 rounded-full border-4 border-purple-100 dark:border-purple-900 shadow-lg"
          />

          {/* プロファイル情報 */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {profile.name || profile.login}
              </h1>
              {profile.type === "Organization" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full w-fit">
                  <Building2 className="w-3 h-3" />
                  Organization
                </span>
              )}
            </div>
            
            <a
              href={`https://github.com/${profile.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 flex items-center gap-1 mb-4"
            >
              @{profile.login}
              <ExternalLink className="w-3 h-3" />
            </a>

            {profile.bio && (
              <p className="text-gray-700 dark:text-gray-300 mb-4 max-w-2xl">
                {profile.bio}
              </p>
            )}

            {/* メタ情報 */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              {profile.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {profile.company}
                </span>
              )}
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {profile.location}
                </span>
              )}
              {profile.blog && (
                <a
                  href={profile.blog.startsWith("http") ? profile.blog : `https://${profile.blog}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-purple-500 dark:hover:text-purple-400"
                >
                  <LinkIcon className="w-4 h-4" />
                  {profile.blog.replace(/^https?:\/\//, "")}
                </a>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {joinedDate}から
              </span>
            </div>
          </div>

          {/* フォロワー統計 */}
          <div className="flex md:flex-col gap-6 md:gap-4 text-center md:text-right">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.followers.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center md:justify-end gap-1">
                <Users className="w-4 h-4" />
                フォロワー
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.following.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                フォロー中
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="リポジトリ"
          value={stats.totalRepos}
          icon={<GitFork className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          label="獲得スター"
          value={stats.totalStars}
          icon={<Star className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          label="被フォーク数"
          value={stats.totalForks}
          icon={<GitFork className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="言語数"
          value={stats.languageBreakdown.length}
          icon={<span className="text-lg">🔤</span>}
          color="green"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 使用言語 */}
        {stats.languageBreakdown.length > 0 && (
          <SectionCard title="使用言語">
            {/* スクリーンリーダー向けテキストサマリー */}
            <p className="sr-only">
              {stats.languageBreakdown.slice(0, 8).map((lang) => 
                `${lang.name}: ${lang.percentage}%`
              ).join(", ")}
            </p>
            <div className="h-64" aria-hidden="true">
              <LanguagesPieChart
                data={stats.languageBreakdown.slice(0, 8).map((lang) => ({
                  name: lang.name,
                  color: lang.color || "#6b7280",
                  size: lang.count,
                  percentage: lang.percentage,
                }))}
              />
            </div>
          </SectionCard>
        )}

        {/* 人気リポジトリ */}
        {stats.topRepositories.length > 0 && (
          <SectionCard title="人気リポジトリ">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats.topRepositories.slice(0, 5).map((repo) => (
                <Link
                  key={repo.nameWithOwner}
                  href={`/repo/${repo.nameWithOwner}`}
                  className="block p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {repo.name}
                      </p>
                      {repo.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {repo.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      {repo.primaryLanguage && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: repo.primaryLanguage.color }}
                          />
                          {repo.primaryLanguage.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Star className="w-3 h-3" />
                        {repo.stargazerCount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </DashboardLayout>
  );
}
