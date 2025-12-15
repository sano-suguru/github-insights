"use client";

import { useState, useMemo } from "react";
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
  Code2,
  Camera,
  X,
  Github,
} from "lucide-react";
import { UserProfile, UserStats, UserEvent } from "@/lib/github";
import { calculateUserBadges, Badge } from "@/lib/badges";
import DashboardLayout, { StatCard, SectionCard } from "@/components/DashboardLayout";

// チャートコンポーネント（SSR無効化）
const LanguagesPieChart = dynamic(
  () => import("@/components/charts/LanguagesPieChart"),
  { ssr: false }
);

const UserActivityHeatmap = dynamic(
  () => import("@/components/charts/UserActivityHeatmap"),
  { ssr: false }
);

const ContributionTypePie = dynamic(
  () => import("@/components/charts/ContributionTypePie"),
  { ssr: false }
);

// バッジチップ
function BadgeChip({ badge }: { badge: Badge }) {
  const IconComponent = badge.icon;
  
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
      title={badge.description}
    >
      <IconComponent className="w-3 h-3" />
      <span>{badge.name}</span>
    </span>
  );
}

// ユーザーカードモーダル
interface UserCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  name: string;
}

function UserCardModal({ isOpen, onClose, username, name }: UserCardModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!isOpen) return null;

  const cardUrl = `/api/og/card/user/${username}`;
  const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${cardUrl}`;

  // 画像をダウンロード
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(cardUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${username}-github-card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloading(false);
    }
  };

  // URLをコピー
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  // Markdown埋め込みコードをコピー
  const handleCopyMarkdown = async () => {
    // Markdown構文に影響する文字をエスケープ
    const escapedName = name.replace(/[[\]()]/g, "\\$&");
    const markdown = `[![${escapedName}'s GitHub Profile](${fullUrl})](https://github.com/${username})`;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-50 w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            GitHub Profile Card
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* カードプレビュー */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900">
          <div className="relative aspect-video max-w-xl mx-auto rounded-lg overflow-hidden shadow-lg">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            )}
            {/* OG画像APIエンドポイントはNext.js Imageで最適化できないためnative imgを使用 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardUrl}
              alt={`${name}'s GitHub Profile Card`}
              className={`w-full h-full object-cover ${imageLoaded ? "" : "opacity-0"}`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>
        </div>

        {/* アクションボタン */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-400 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {downloading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Star className="w-4 h-4" />
            )}
            Download
          </button>
          <button
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium"
          >
            <LinkIcon className="w-4 h-4" />
            {copiedUrl ? "Copied!" : "Copy URL"}
          </button>
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium"
          >
            <Code2 className="w-4 h-4" />
            {copiedMarkdown ? "Copied!" : "Copy Markdown"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ユーザーデータを取得する関数
async function fetchUserData(username: string): Promise<{
  profile: UserProfile;
  stats: UserStats;
  events: UserEvent[];
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
  const [showCardModal, setShowCardModal] = useState(false);
  const [showBadgePopover, setShowBadgePopover] = useState(false);

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

  // Contribution Types セクションのスクリーンリーダー向けサマリー
  const userEvents = data?.events;
  const contributionTypeSummary = useMemo(() => {
    if (!userEvents || userEvents.length === 0) return "";
    
    const typeCount: Record<string, number> = {};
    userEvents.forEach((e) => {
      typeCount[e.type] = (typeCount[e.type] || 0) + 1;
    });
    const total = userEvents.length;
    return Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => `${type}: ${Math.round((count / total) * 100)}%`)
      .join(", ");
  }, [userEvents]);

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
                User Not Found
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                The user &quot;{username}&quot; does not exist or is not accessible.
              </p>
            </>
          ) : errorMessage === "RATE_LIMIT" ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Rate Limit Exceeded
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait a moment and try again.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Error Occurred
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Failed to fetch user information.
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

  const { profile, stats, events } = data;
  const joinedDate = new Date(profile.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });

  return (
    <DashboardLayout>
      {/* プロファイルヘッダー */}
      <div className="relative z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 md:p-8 mb-6">
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
              className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors mb-4"
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
                Joined {joinedDate}
              </span>
            </div>

            {/* バッジ */}
            {(() => {
              const badges = calculateUserBadges({
                followers: profile.followers,
                publicRepos: stats.totalRepos,
                createdAt: profile.createdAt,
              });
              if (badges.length === 0) return null;
              return (
                <div className="relative mt-4">
                  <button
                    onClick={() => setShowBadgePopover(!showBadgePopover)}
                    aria-expanded={showBadgePopover}
                    aria-label={`${badges.length}個のバッジを表示`}
                    className="flex flex-wrap gap-2 items-center cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    {badges.slice(0, 4).map((badge) => (
                      <BadgeChip key={badge.id} badge={badge} />
                    ))}
                    {badges.length > 4 && (
                      <span className="text-xs text-gray-400">+{badges.length - 4}</span>
                    )}
                  </button>
                  
                  {/* バッジ一覧ポップオーバー */}
                  {showBadgePopover && (
                    <>
                      {/* モバイル: 固定位置モーダル */}
                      <div className="sm:hidden fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div 
                          className="fixed inset-0 bg-black/50"
                          onClick={() => setShowBadgePopover(false)}
                        />
                        <div className="relative z-50 w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-base font-medium text-gray-900 dark:text-white">Badges</span>
                            <button
                              onClick={() => setShowBadgePopover(false)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <X className="w-5 h-5 text-gray-400" />
                            </button>
                          </div>
                          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {badges.map((badge) => {
                              const IconComponent = badge.icon;
                              return (
                                <div key={badge.id} className={`flex items-start gap-2 p-2.5 rounded-lg ${badge.color}`}>
                                  <IconComponent className="w-5 h-5 shrink-0 mt-0.5" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium">{badge.name}</p>
                                    <p className="text-xs opacity-80">{badge.description}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      
                      {/* デスクトップ: 相対位置ポップオーバー */}
                      <div className="hidden sm:block absolute left-0 top-full mt-2 z-50 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Badges</span>
                          <button
                            onClick={() => setShowBadgePopover(false)}
                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {badges.map((badge) => {
                            const IconComponent = badge.icon;
                            return (
                              <div key={badge.id} className={`flex items-start gap-2 p-2 rounded-lg ${badge.color}`}>
                                <IconComponent className="w-4 h-4 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">{badge.name}</p>
                                  <p className="text-xs opacity-80">{badge.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* カード生成ボタン */}
            <button
              onClick={() => setShowCardModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Camera className="w-4 h-4" />
              Generate Card
            </button>
          </div>

          {/* フォロワー統計 */}
          <div className="flex md:flex-col gap-6 md:gap-4 text-center md:text-right">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.followers.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center md:justify-end gap-1">
                <Users className="w-4 h-4" />
                Followers
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.following.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Following
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Repositories"
          value={stats.totalRepos}
          icon={<GitFork className="w-5 h-5 text-purple-500" />}
          color="purple"
        />
        <StatCard
          label="Stars"
          value={stats.totalStars}
          icon={<Star className="w-5 h-5 text-yellow-500" />}
          color="yellow"
        />
        <StatCard
          label="Forks"
          value={stats.totalForks}
          icon={<GitFork className="w-5 h-5 text-blue-500" />}
          color="blue"
        />
        <StatCard
          label="Languages"
          value={stats.languageBreakdown.length}
          icon={<Code2 className="w-5 h-5 text-green-500" />}
          color="green"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Languages */}
        {stats.languageBreakdown.length > 0 && (
          <SectionCard title="Languages">
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

        {/* Top Repositories */}
        {stats.topRepositories.length > 0 && (
          <SectionCard title="Top Repositories">
            <div className="space-y-3">
              {stats.topRepositories.slice(0, 3).map((repo) => (
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

        {/* Activity Heatmap */}
        {events.length > 0 && (
          <SectionCard title="Activity Heatmap">
            <UserActivityHeatmap events={events} />
          </SectionCard>
        )}

        {/* Contribution Type Distribution */}
        {events.length > 0 && (
          <SectionCard title="Contribution Types">
            <p className="sr-only">{contributionTypeSummary}</p>
            <div aria-hidden="true">
              <ContributionTypePie events={events} />
            </div>
          </SectionCard>
        )}
      </div>

      {/* OGカード生成モーダル */}
      {showCardModal && (
        <UserCardModal
          isOpen={showCardModal}
          onClose={() => setShowCardModal(false)}
          username={profile.login}
          name={profile.name || profile.login}
        />
      )}
    </DashboardLayout>
  );
}
