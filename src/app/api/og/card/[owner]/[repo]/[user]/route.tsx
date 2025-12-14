import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// OG画像サイズ
const WIDTH = 1200;
const HEIGHT = 630;

// サイトと統一したカラーパレット
const COLORS = {
  // 背景
  bgDark: "#0f172a", // slate-900 (より深い)
  bgPurple: "#581c87", // purple-900
  // アクセント
  purple500: "#a855f7",
  purple400: "#c084fc",
  pink500: "#ec4899",
  pink400: "#f472b6",
  // メダル
  gold: "#fbbf24",
  silver: "#94a3b8",
  bronze: "#f59e0b",
  // テキスト
  white: "#ffffff",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  // カード
  cardBg: "rgba(31, 41, 55, 0.6)", // gray-800/60
  cardBorder: "rgba(139, 92, 246, 0.2)", // purple-500/20
  // バッジ
  badgeBg: "rgba(168, 85, 247, 0.2)",
  badgeText: "#c084fc", // purple-400
  badgeBorder: "rgba(168, 85, 247, 0.4)",
  // グロー
  glowPurple: "rgba(168, 85, 247, 0.4)",
  glowPink: "rgba(236, 72, 153, 0.3)",
};

// SVGアイコンパス
const ICONS = {
  gitCommit:
    "M12 6a6 6 0 0 0-6 6h-4a1 1 0 0 0 0 2h4a6 6 0 0 0 12 0h4a1 1 0 0 0 0-2h-4a6 6 0 0 0-6-6zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
  trophy:
    "M6 9H4V5a1 1 0 0 1 1-1h2v2H6v3zm14-4a1 1 0 0 0-1-1h-2v5h-2V4H9v5H7V4H5a1 1 0 0 0-1 1v4h2v1a5 5 0 0 0 4 4.9V18H7v2h10v-2h-3v-4.1a5 5 0 0 0 4-4.9V9h2V5a1 1 0 0 0-1-1z",
  gitPullRequest:
    "M18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-1-3.17V6a4 4 0 0 0-4-4H9.83a3.001 3.001 0 1 0 0 2H13a2 2 0 0 1 2 2v5.83a3.001 3.001 0 1 0 2 0zM6 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z",
  circleDot: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm0-12a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  gitFork:
    "M12 2a3 3 0 0 0-1 5.83V10H7a2 2 0 0 0-2 2v1.17a3.001 3.001 0 1 0 2 0V12h4v4.17a3.001 3.001 0 1 0 2 0V12h4v1.17a3.001 3.001 0 1 0 2-0V12a2 2 0 0 0-2-2h-4V7.83A3 3 0 0 0 12 2z",
  flame: "M12 23c-4.97 0-9-4.03-9-9 0-3.21 1.68-6.04 4.23-7.68.85-.55 1.77 1.06 2.07 2.22 1.06 4.04 2.7 5.04 2.7 5.04s-.5-4.58-.5-6.58c0-4 2.5-7 2.5-7s1.65 1.04 3 3c.67 .98 1 2.15 1 3.35 0 1.6-.63 3.05-1.65 4.11-.52.54-.35 1.46.33 1.79.68.33 1.32-.28 1.32-.28S19 9.73 19 7c0-.38-.04-.76-.1-1.13C21.14 7.83 23 10.72 23 14c0 4.97-4.03 9-9 9h-2z",
  fire: "M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 13.22C9.11 13.32 9.15 13.42 9.15 13.55C9.15 13.77 9 13.97 8.8 14.05C8.57 14.15 8.33 14.09 8.14 13.93C8.08 13.88 8.04 13.83 8 13.76C6.87 12.33 6.69 10.28 7.45 8.64C5.78 10 4.87 12.3 5 14.47C5.06 14.97 5.12 15.47 5.29 15.97C5.43 16.57 5.7 17.17 6 17.7C7.08 19.43 8.95 20.67 10.96 20.92C13.1 21.19 15.39 20.8 17.03 19.32C18.86 17.66 19.5 15 18.56 12.72L18.43 12.46C18.22 12 17.66 11.2 17.66 11.2Z",
};

// ランクに応じたメダルカラーを取得
function getRankColor(rank: number): string {
  if (rank === 1) return COLORS.gold;
  if (rank === 2) return COLORS.silver;
  if (rank === 3) return COLORS.bronze;
  return COLORS.purple400;
}

// ランクに応じたラベルを取得
function getRankLabel(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

// アクティビティグリッドを生成（貢献度に基づいてランダム風に）
function generateActivityGrid(commits: number, seed: number): number[] {
  const grid: number[] = [];
  const intensity = Math.min(commits / 10, 10); // 0-10
  for (let i = 0; i < 35; i++) {
    // 5x7グリッド
    const random = ((seed * (i + 1) * 9301 + 49297) % 233280) / 233280;
    const level = random < 0.2 ? 0 : random < 0.5 ? 1 : random < 0.7 ? 2 : random < 0.9 ? 3 : 4;
    grid.push(Math.min(level, Math.ceil(intensity / 2)));
  }
  return grid;
}

// コントリビューター統計の型
interface ContributorStats {
  name: string;
  login: string;
  avatarUrl: string;
  commits: number;
  pullRequests: number;
  issues: number;
  rank: number;
  totalContributors: number;
  badges: string[];
  repoStars: number;
  repoForks: number;
  repoDescription: string;
}

// GitHub APIから統計を取得
async function getContributorStats(
  owner: string,
  repo: string,
  user: string
): Promise<ContributorStats | null> {
  try {
    const [contributorsRes, repoRes, userPRsRes, userIssuesRes] =
      await Promise.all([
        fetch(
          `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`,
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "GitHub-Insights",
            },
            next: { revalidate: 3600 },
          }
        ),
        fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Insights",
          },
          next: { revalidate: 3600 },
        }),
        fetch(
          `https://api.github.com/search/issues?q=repo:${owner}/${repo}+author:${user}+type:pr&per_page=1`,
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "GitHub-Insights",
            },
            next: { revalidate: 3600 },
          }
        ),
        fetch(
          `https://api.github.com/search/issues?q=repo:${owner}/${repo}+author:${user}+type:issue&per_page=1`,
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "GitHub-Insights",
            },
            next: { revalidate: 3600 },
          }
        ),
      ]);

    if (!contributorsRes.ok) {
      return null;
    }

    const [contributors, repoData, prData, issueData] = await Promise.all([
      contributorsRes.json(),
      repoRes.ok ? repoRes.json() : null,
      userPRsRes.ok ? userPRsRes.json() : null,
      userIssuesRes.ok ? userIssuesRes.json() : null,
    ]);

    const userIndex = contributors.findIndex(
      (c: { login: string }) => c.login.toLowerCase() === user.toLowerCase()
    );

    if (userIndex === -1) {
      return null;
    }

    const userData = contributors[userIndex];
    const totalCommits = contributors.reduce(
      (sum: number, c: { contributions: number }) => sum + c.contributions,
      0
    );

    const userRes = await fetch(`https://api.github.com/users/${user}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "GitHub-Insights",
      },
      next: { revalidate: 3600 },
    });

    const userDetails = userRes.ok ? await userRes.json() : { name: user };

    // バッジを計算（絵文字なし）
    const badges: string[] = [];
    if (userIndex === 0) badges.push("Top Contributor");
    else if (userIndex < 3 && contributors.length >= 3) badges.push("Top 3");
    if (userData.contributions >= 100) badges.push("Core Contributor");
    else if (userData.contributions >= 50) badges.push("Dedicated");
    else if (userData.contributions >= 10) badges.push("Active");

    const prCount = prData?.total_count ?? 0;
    const issueCount = issueData?.total_count ?? 0;
    if (prCount >= 10) badges.push("PR Master");
    if (issueCount >= 10) badges.push("Bug Hunter");

    return {
      name: userDetails.name || user,
      login: user,
      avatarUrl: userData.avatar_url,
      commits: userData.contributions,
      pullRequests: prCount,
      issues: issueCount,
      rank: userIndex + 1,
      totalContributors: contributors.length,
      badges: badges.slice(0, 3),
      repoStars: repoData?.stargazers_count ?? 0,
      repoForks: repoData?.forks_count ?? 0,
      repoDescription: repoData?.description ?? "",
    };
  } catch (error) {
    console.error("Error fetching contributor stats:", error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string; user: string }> }
) {
  const { owner, repo, user } = await params;

  const stats = await getContributorStats(owner, repo, user);

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
            backgroundColor: COLORS.bgDark,
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

  const formatNumber = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(145deg, ${COLORS.bgDark} 0%, #1e1b4b 25%, ${COLORS.bgPurple} 50%, #4c1d95 75%, ${COLORS.bgDark} 100%)`,
          padding: 48,
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* プレミアムカード風エッジハイライト - 上部 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: "linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.3) 20%, rgba(236,72,153,0.5) 50%, rgba(168,85,247,0.3) 80%, transparent 100%)",
            display: "flex",
          }}
        />
        {/* プレミアムカード風エッジハイライト - 左 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: 1,
            background: "linear-gradient(180deg, transparent 0%, rgba(168,85,247,0.2) 20%, rgba(139,92,246,0.4) 50%, rgba(168,85,247,0.2) 80%, transparent 100%)",
            display: "flex",
          }}
        />
        
        {/* ギョーシェ風パターン - 同心円の微細なテクスチャ */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0.03,
          }}
          viewBox="0 0 1200 630"
        >
          {/* 同心円パターン（右上） */}
          <circle cx="1000" cy="150" r="50" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="1000" cy="150" r="80" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="1000" cy="150" r="110" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="1000" cy="150" r="140" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="1000" cy="150" r="170" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="1000" cy="150" r="200" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="1000" cy="150" r="230" fill="none" stroke="white" strokeWidth="0.5" />
          {/* 同心円パターン（左下） */}
          <circle cx="200" cy="500" r="40" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="200" cy="500" r="70" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="200" cy="500" r="100" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="200" cy="500" r="130" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="200" cy="500" r="160" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="200" cy="500" r="190" fill="none" stroke="white" strokeWidth="0.5" />
        </svg>
        
        {/* 背景装飾 - グローイングオーブ（より繊細に） */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${COLORS.glowPurple} 0%, transparent 60%)`,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            left: -120,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${COLORS.glowPink} 0%, transparent 60%)`,
            display: "flex",
          }}
        />
        {/* 中央の微かなグロー */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        
        {/* ヘッダー: リポジトリ情報 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* GitHubアイコン */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                background: `linear-gradient(135deg, ${COLORS.purple500}, ${COLORS.pink500})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
            {/* リポジトリ名 */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{ color: COLORS.white, fontSize: 32, fontWeight: 700 }}
              >
                {owner}/{repo}
              </span>
              {stats.repoDescription && (
                <span
                  style={{
                    color: COLORS.gray400,
                    fontSize: 18,
                    marginTop: 4,
                  }}
                >
                  {stats.repoDescription.slice(0, 50)}
                  {stats.repoDescription.length > 50 ? "..." : ""}
                </span>
              )}
            </div>
          </div>
          {/* リポジトリ統計 */}
          <div style={{ display: "flex", gap: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: COLORS.gray300,
                fontSize: 22,
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill={COLORS.gray300}
              >
                <path d={ICONS.star} />
              </svg>
              {formatNumber(stats.repoStars)}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: COLORS.gray400,
                fontSize: 22,
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill={COLORS.gray400}
              >
                <path d="M7 5a3 3 0 0 0-1 5.83V15a2 2 0 0 0 2 2h2v2.17a3.001 3.001 0 1 0 2 0V17h2a2 2 0 0 0 2-2v-4.17A3 3 0 0 0 17 5a3 3 0 0 0-3 3 3 3 0 0 0 1 2.17V15h-6v-4.83A3 3 0 0 0 10 8a3 3 0 0 0-3-3z" />
              </svg>
              {formatNumber(stats.repoForks)}
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div style={{ display: "flex", flex: 1, gap: 40 }}>
          {/* 左: ユーザー情報 + ランク */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 220,
            }}
          >
            {/* アバター with グロー効果 */}
            <div
              style={{
                position: "relative",
                display: "flex",
                marginBottom: 16,
              }}
            >
              {/* グロー */}
              <div
                style={{
                  position: "absolute",
                  top: -10,
                  left: -10,
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  background: `radial-gradient(circle, ${COLORS.glowPurple} 0%, transparent 70%)`,
                  display: "flex",
                }}
              />
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
                  boxShadow: `0 0 30px ${COLORS.glowPurple}`,
                }}
              />
              {/* ランクメダル */}
              <div
                style={{
                  position: "absolute",
                  bottom: -5,
                  right: -5,
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  background: stats.rank <= 3 
                    ? `linear-gradient(135deg, ${getRankColor(stats.rank)}, ${stats.rank === 1 ? '#fcd34d' : stats.rank === 2 ? '#cbd5e1' : '#fbbf24'})`
                    : `linear-gradient(135deg, ${COLORS.purple500}, ${COLORS.pink500})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `3px solid ${COLORS.bgDark}`,
                  boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
                }}
              >
                <span
                  style={{
                    color: stats.rank <= 3 ? COLORS.bgDark : COLORS.white,
                    fontSize: stats.rank <= 3 ? 24 : 18,
                    fontWeight: 800,
                  }}
                >
                  {stats.rank <= 3 ? getRankLabel(stats.rank) : `#${stats.rank}`}
                </span>
              </div>
            </div>
            
            {/* 名前 */}
            <span
              style={{
                color: COLORS.white,
                fontSize: 34,
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              {stats.name}
            </span>
            <span style={{ color: COLORS.gray400, fontSize: 20, marginTop: 4 }}>
              @{stats.login}
            </span>
            
            {/* アクティビティグリッド */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 3,
                marginTop: 16,
                width: 119, // 7 * 14 + 6 * 3
              }}
            >
              {generateActivityGrid(stats.commits, stats.login.charCodeAt(0)).map((level, i) => (
                <div
                  key={i}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    backgroundColor: level === 0 
                      ? 'rgba(139, 92, 246, 0.1)'
                      : level === 1 
                      ? 'rgba(139, 92, 246, 0.3)'
                      : level === 2
                      ? 'rgba(139, 92, 246, 0.5)'
                      : level === 3
                      ? 'rgba(139, 92, 246, 0.7)'
                      : COLORS.purple500,
                  }}
                />
              ))}
            </div>
          </div>

          {/* 右: 統計 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            {/* メイン統計 - コミット数を大きく表示 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                marginBottom: 20,
                padding: "16px 24px",
                backgroundColor: COLORS.cardBg,
                borderRadius: 16,
                border: `1px solid ${COLORS.cardBorder}`,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: COLORS.gray400, fontSize: 18, marginBottom: 4 }}>
                  Total Commits
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span
                    style={{
                      fontSize: 56,
                      fontWeight: 800,
                      background: `linear-gradient(135deg, ${COLORS.purple400}, ${COLORS.pink400})`,
                      backgroundClip: "text",
                      color: "transparent",
                    }}
                  >
                    {stats.commits}
                  </span>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill={COLORS.purple400}>
                    <path d={ICONS.fire} />
                  </svg>
                </div>
              </div>
              
              {/* 区切り線 */}
              <div style={{ width: 1, height: 60, backgroundColor: COLORS.cardBorder, display: "flex" }} />
              
              {/* PR と Issues */}
              <div style={{ display: "flex", gap: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ color: COLORS.white, fontSize: 36, fontWeight: 700 }}>
                    {stats.pullRequests}
                  </span>
                  <span style={{ color: COLORS.gray400, fontSize: 18 }}>PRs</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ color: COLORS.white, fontSize: 36, fontWeight: 700 }}>
                    {stats.issues}
                  </span>
                  <span style={{ color: COLORS.gray400, fontSize: 18 }}>Issues</span>
                </div>
              </div>
            </div>

            {/* バッジ */}
            {stats.badges.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                {stats.badges.map((badge, i) => (
                  <span
                    key={i}
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.badgeBg}, rgba(236, 72, 153, 0.15))`,
                      color: COLORS.badgeText,
                      padding: "10px 18px",
                      borderRadius: 20,
                      fontSize: 18,
                      fontWeight: 600,
                      border: `1px solid ${COLORS.badgeBorder}`,
                      boxShadow: `0 2px 8px rgba(168, 85, 247, 0.2)`,
                    }}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}

            {/* ランキング情報 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: COLORS.gray400,
                fontSize: 18,
              }}
            >
              <span style={{ color: getRankColor(stats.rank), fontWeight: 600, fontSize: 20 }}>
                #{stats.rank}
              </span>
              <span>of {stats.totalContributors} contributors</span>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* ロゴ風アイコン */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${COLORS.purple500}, ${COLORS.pink500})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d={ICONS.star} />
              </svg>
            </div>
            <span
              style={{
                background: `linear-gradient(135deg, ${COLORS.purple400}, ${COLORS.pink400})`,
                backgroundClip: "text",
                color: "transparent",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              GitHub Insights
            </span>
          </div>
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
