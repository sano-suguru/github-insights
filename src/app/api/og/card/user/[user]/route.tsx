import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { createOgBadgeColorGetter } from "@/lib/badges";
import {
  calculateInsightScore,
  getRankColorsForOg,
  formatScore,
} from "@/lib/insight-score";
import {
  sequentialFetchEdge,
  GITHUB_HEADERS,
  formatNumber,
  Footer,
  ErrorCard,
  StatBox,
} from "@/lib/og";
import {
  OG_WIDTH,
  OG_HEIGHT,
  OG_COLORS,
  OG_ICONS,
  USER_BADGE_COLORS,
} from "@/lib/og/constants";

export const runtime = "edge";

// ローカル定数（このカード固有）
const WIDTH = OG_WIDTH;
const HEIGHT = OG_HEIGHT;
const COLORS = OG_COLORS;
const ICONS = OG_ICONS;

// バッジの色を取得
const getBadgeColors = createOgBadgeColorGetter(USER_BADGE_COLORS);

// ユーザー統計の型
interface UserStats {
  name: string;
  login: string;
  avatarUrl: string;
  bio: string;
  followers: number;
  following: number;
  publicRepos: number;
  createdAt: string;
  accountYears: number;
  totalPRs: number;
  totalIssues: number;
  totalStars: number;
  totalForks: number;
  topRepos: { name: string; stars: number }[];
}

// GitHub APIからユーザー統計を取得
async function getUserStats(user: string): Promise<UserStats | null> {
  try {
    // 順次でAPI呼び出し（セカンダリレート制限対策）
    const [userRes, reposRes, prsRes, issuesRes] = await sequentialFetchEdge([
      () => fetch(
        `https://api.github.com/users/${user}`,
        { headers: GITHUB_HEADERS, next: { revalidate: 3600 } }
      ),
      () => fetch(
        `https://api.github.com/users/${user}/repos?sort=stars&per_page=5&type=owner`,
        { headers: GITHUB_HEADERS, next: { revalidate: 3600 } }
      ),
      () => fetch(
        `https://api.github.com/search/issues?q=author:${user}+type:pr&per_page=1`,
        { headers: GITHUB_HEADERS, next: { revalidate: 3600 } }
      ),
      () => fetch(
        `https://api.github.com/search/issues?q=author:${user}+type:issue&per_page=1`,
        { headers: GITHUB_HEADERS, next: { revalidate: 3600 } }
      ),
    ]);

    if (!userRes.ok) {
      console.error("Failed to fetch user:", userRes.status);
      return null;
    }

    const [userData, repos, prData, issueData] = await sequentialFetchEdge([
      () => userRes.json(),
      () => reposRes.ok ? reposRes.json() : Promise.resolve([]),
      () => prsRes.ok ? prsRes.json() : Promise.resolve(null),
      () => issuesRes.ok ? issuesRes.json() : Promise.resolve(null),
    ]);

    // トップリポジトリを整形
    const topRepos = repos
      .filter((r: { fork: boolean }) => !r.fork)
      .slice(0, 3)
      .map((r: { name: string; stargazers_count: number }) => ({
        name: r.name,
        stars: r.stargazers_count,
      }));

    // スター・フォーク合計を計算
    const allRepos = repos.filter((r: { fork: boolean }) => !r.fork);
    const totalStars = allRepos.reduce(
      (sum: number, r: { stargazers_count: number }) => sum + r.stargazers_count,
      0
    );
    const totalForks = allRepos.reduce(
      (sum: number, r: { forks_count: number }) => sum + r.forks_count,
      0
    );

    // アカウント作成年を計算
    const createdYear = new Date(userData.created_at).getFullYear();
    const currentYear = new Date().getFullYear();
    const accountYears = currentYear - createdYear;

    return {
      name: userData.name || user,
      login: user,
      avatarUrl: userData.avatar_url,
      bio: userData.bio || "",
      followers: userData.followers,
      following: userData.following,
      publicRepos: userData.public_repos,
      createdAt: `${createdYear}`,
      accountYears,
      totalPRs: prData?.total_count ?? 0,
      totalIssues: issueData?.total_count ?? 0,
      totalStars,
      totalForks,
      topRepos,
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user: string }> }
) {
  const { user } = await params;

  // 統計データを取得
  const stats = await getUserStats(user);

  if (!stats) {
    return new ImageResponse(
      <ErrorCard message={`User not found: ${user}`} />,
      { width: WIDTH, height: HEIGHT }
    );
  }

  // バッジを計算（絵文字なし）
  const badges: string[] = [];
  if (stats.followers >= 1000) badges.push("Influencer");
  else if (stats.followers >= 100) badges.push("Popular");
  if (stats.publicRepos >= 50) badges.push("Prolific");
  else if (stats.publicRepos >= 20) badges.push("Builder");
  if (stats.totalPRs >= 100) badges.push("PR Master");
  else if (stats.totalPRs >= 50) badges.push("Contributor");
  if (parseInt(stats.createdAt) <= 2015) badges.push("Veteran");

  // Insight Score を計算
  const insightResult = calculateInsightScore({
    followers: stats.followers,
    totalStars: stats.totalStars,
    totalForks: stats.totalForks,
    publicRepos: stats.publicRepos,
    totalPRs: stats.totalPRs,
    totalIssues: stats.totalIssues,
    accountYears: stats.accountYears,
  });
  const rankColors = getRankColorsForOg(insightResult.rank);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(135deg, ${COLORS.bgDark} 0%, ${COLORS.bgPurple} 50%, ${COLORS.bgDark} 100%)`,
          padding: 48,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* ユーザーアバター */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stats.avatarUrl}
              alt={`${stats.login}'s avatar`}
              width={40}
              height={40}
              style={{
                borderRadius: 20,
                border: `2px solid ${COLORS.purple500}`,
                marginRight: 12,
              }}
            />
            <span
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.gray300,
              }}
            >
              @{stats.login}
            </span>
          </div>
          {/* Insight Score バッジ */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 24,
                background: rankColors.bg,
                border: `1px solid ${rankColors.border}`,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={rankColors.text}
              >
                <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.4 5.7 21l2.3-7L2 9.4h7.6L12 2z" />
              </svg>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: rankColors.text,
                }}
              >
                {formatScore(insightResult.score)}
              </span>
              <span
                style={{
                  fontSize: 14,
                  color: rankColors.text,
                  opacity: 0.8,
                }}
              >
                {insightResult.rank}
              </span>
            </div>
            <span style={{ color: COLORS.gray400, fontSize: 16 }}>
              Member since {stats.createdAt}
            </span>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div style={{ display: "flex", flex: 1, gap: 48 }}>
          {/* 左: ユーザー情報 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 220,
            }}
          >
            {/* アバター */}
            {/* 
              @vercel/og の ImageResponse は Satori を使用してReact要素をSVGに変換するため、
              next/image の <Image /> コンポーネントは使用できません。
              通常の <img> タグが必要です。
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stats.avatarUrl}
              alt={`${stats.name}'s avatar`}
              width={140}
              height={140}
              style={{
                borderRadius: 70,
                border: `4px solid ${COLORS.purple500}`,
                marginBottom: 20,
              }}
            />
            {/* 名前 */}
            <span
              style={{
                color: COLORS.white,
                fontSize: 34,
                fontWeight: 700,
                textAlign: "center",
                marginBottom: 4,
              }}
            >
              {stats.name}
            </span>
            <span
              style={{ color: COLORS.gray400, fontSize: 22, marginBottom: 12 }}
            >
              @{stats.login}
            </span>
            {/* Bio */}
            {stats.bio && (
              <span
                style={{
                  color: COLORS.gray400,
                  fontSize: 18,
                  textAlign: "center",
                  maxWidth: 200,
                  lineHeight: 1.4,
                }}
              >
                {stats.bio.slice(0, 60)}
                {stats.bio.length > 60 ? "..." : ""}
              </span>
            )}
          </div>

          {/* 右: 統計 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            {/* 統計グリッド */}
            <div
              style={{
                display: "flex",
                gap: 16,
                marginBottom: 24,
                flexWrap: "wrap",
              }}
            >
              <StatBox label="Followers" value={formatNumber(stats.followers)} />
              <StatBox label="Repos" value={stats.publicRepos.toString()} />
              <StatBox label="PRs" value={formatNumber(stats.totalPRs)} />
              <StatBox label="Issues" value={formatNumber(stats.totalIssues)} />
            </div>

            {/* バッジ */}
            {badges.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 24,
                  flexWrap: "wrap",
                }}
              >
                {badges.slice(0, 4).map((badge, i) => {
                  const colors = getBadgeColors(badge);
                  return (
                    <span
                      key={i}
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        padding: "10px 18px",
                        borderRadius: 20,
                        fontSize: 18,
                        fontWeight: 600,
                        border: `1px solid ${colors.border}`,
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                      }}
                    >
                      {badge}
                    </span>
                  );
                })}
              </div>
            )}

            {/* トップリポジトリ */}
            {stats.topRepos.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{ color: COLORS.gray400, fontSize: 18, marginBottom: 12 }}
                >
                  Top Repositories
                </span>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {stats.topRepos.map((repo, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: COLORS.cardBg,
                        padding: "10px 16px",
                        borderRadius: 12,
                        border: `1px solid ${COLORS.cardBorder}`,
                      }}
                    >
                      <span
                        style={{
                          color: COLORS.gray300,
                          fontSize: 18,
                          marginRight: 10,
                        }}
                      >
                        {repo.name}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill={COLORS.purple400}
                        >
                          <path d={ICONS.star} />
                        </svg>
                        <span
                          style={{
                            color: COLORS.purple400,
                            fontSize: 18,
                            fontWeight: 500,
                          }}
                        >
                          {formatNumber(repo.stars)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <Footer />
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
