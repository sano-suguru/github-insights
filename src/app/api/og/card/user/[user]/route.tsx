import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// OG画像サイズ
const WIDTH = 1200;
const HEIGHT = 630;

// サイトと統一したカラーパレット
const COLORS = {
  // 背景
  bgDark: "#111827", // gray-900
  bgPurple: "#581c87", // purple-900
  // アクセント
  purple500: "#a855f7",
  pink500: "#ec4899",
  purple400: "#c084fc",
  // テキスト
  white: "#ffffff",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  // カード
  cardBg: "rgba(31, 41, 55, 0.5)", // gray-800/50
  cardBorder: "rgba(55, 65, 81, 0.5)", // gray-700/50
  // バッジ
  badgeBg: "rgba(168, 85, 247, 0.15)",
  badgeText: "#c084fc", // purple-400
  badgeBorder: "rgba(168, 85, 247, 0.3)",
};

// SVGアイコンパス
const ICONS = {
  github:
    "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

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
  totalPRs: number;
  totalIssues: number;
  topRepos: { name: string; stars: number }[];
}

// GitHub APIからユーザー統計を取得
async function getUserStats(user: string): Promise<UserStats | null> {
  try {
    // 並列でAPI呼び出し
    const [userRes, reposRes, prsRes, issuesRes] = await Promise.all([
      // ユーザー情報
      fetch(`https://api.github.com/users/${user}`, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "GitHub-Insights",
        },
        next: { revalidate: 3600 },
      }),
      // 公開リポジトリ（スター順）
      fetch(
        `https://api.github.com/users/${user}/repos?sort=stars&per_page=5&type=owner`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Insights",
          },
          next: { revalidate: 3600 },
        }
      ),
      // PR数（Search API）
      fetch(
        `https://api.github.com/search/issues?q=author:${user}+type:pr&per_page=1`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Insights",
          },
          next: { revalidate: 3600 },
        }
      ),
      // Issue数（Search API）
      fetch(
        `https://api.github.com/search/issues?q=author:${user}+type:issue&per_page=1`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Insights",
          },
          next: { revalidate: 3600 },
        }
      ),
    ]);

    if (!userRes.ok) {
      console.error("Failed to fetch user:", userRes.status);
      return null;
    }

    const [userData, repos, prData, issueData] = await Promise.all([
      userRes.json(),
      reposRes.ok ? reposRes.json() : [],
      prsRes.ok ? prsRes.json() : null,
      issuesRes.ok ? issuesRes.json() : null,
    ]);

    // トップリポジトリを整形
    const topRepos = repos
      .filter((r: { fork: boolean }) => !r.fork)
      .slice(0, 3)
      .map((r: { name: string; stargazers_count: number }) => ({
        name: r.name,
        stars: r.stargazers_count,
      }));

    // アカウント作成年を計算
    const createdYear = new Date(userData.created_at).getFullYear();

    return {
      name: userData.name || user,
      login: user,
      avatarUrl: userData.avatar_url,
      bio: userData.bio || "",
      followers: userData.followers,
      following: userData.following,
      publicRepos: userData.public_repos,
      createdAt: `${createdYear}`,
      totalPRs: prData?.total_count ?? 0,
      totalIssues: issueData?.total_count ?? 0,
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
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${COLORS.bgDark} 0%, ${COLORS.bgPurple} 50%, ${COLORS.bgDark} 100%)`,
            color: COLORS.white,
            fontSize: 32,
          }}
        >
          User not found: {user}
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    );
  }

  // 数値をフォーマット
  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  // バッジを計算（絵文字なし）
  const badges: string[] = [];
  if (stats.followers >= 1000) badges.push("Influencer");
  else if (stats.followers >= 100) badges.push("Popular");
  if (stats.publicRepos >= 50) badges.push("Prolific");
  else if (stats.publicRepos >= 20) badges.push("Builder");
  if (stats.totalPRs >= 100) badges.push("PR Master");
  else if (stats.totalPRs >= 50) badges.push("Contributor");
  if (parseInt(stats.createdAt) <= 2015) badges.push("Veteran");

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
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: `linear-gradient(135deg, ${COLORS.purple500}, ${COLORS.pink500})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d={ICONS.github} />
              </svg>
            </div>
            <span
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.purple400,
              }}
            >
              GitHub Insights
            </span>
          </div>
          <span style={{ color: COLORS.gray400, fontSize: 16 }}>
            Member since {stats.createdAt}
          </span>
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
                {badges.slice(0, 4).map((badge, i) => (
                  <span
                    key={i}
                    style={{
                      backgroundColor: COLORS.badgeBg,
                      color: COLORS.badgeText,
                      padding: "10px 18px",
                      borderRadius: 20,
                      fontSize: 18,
                      fontWeight: 500,
                      border: `1px solid ${COLORS.badgeBorder}`,
                    }}
                  >
                    {badge}
                  </span>
                ))}
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
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 20,
          }}
        >
          <span style={{ color: COLORS.gray500, fontSize: 16 }}>
            github-insights-orpin.vercel.app
          </span>
        </div>
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

// 統計ボックスコンポーネント
function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: COLORS.cardBg,
        padding: "16px 28px",
        borderRadius: 16,
        minWidth: 110,
        border: `1px solid ${COLORS.cardBorder}`,
      }}
    >
      <span
        style={{
          color: COLORS.white,
          fontSize: 34,
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {value}
      </span>
      <span style={{ color: COLORS.gray400, fontSize: 18 }}>{label}</span>
    </div>
  );
}
