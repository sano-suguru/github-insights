import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { createOgBadgeColorGetter } from "@/lib/badges";
import {
  sequentialFetchEdge,
  GITHUB_HEADERS,
  formatNumber,
  Footer,
  ErrorCard,
} from "@/lib/og";
import {
  OG_WIDTH,
  OG_HEIGHT,
  OG_COLORS,
  OG_ICONS,
  CONTRIBUTOR_BADGE_COLORS,
  getRankColor,
  getRankLabel,
  generateActivityGrid,
} from "@/lib/og/constants";

export const runtime = "edge";

// ローカル定数（このカード固有）
const WIDTH = OG_WIDTH;
const HEIGHT = OG_HEIGHT;
const COLORS = OG_COLORS;
const ICONS = OG_ICONS;

// バッジの色を取得
const getBadgeColors = createOgBadgeColorGetter(CONTRIBUTOR_BADGE_COLORS);

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
  ownerAvatarUrl: string;
}

// GitHub APIから統計を取得
async function getContributorStats(
  owner: string,
  repo: string,
  user: string
): Promise<ContributorStats | null> {
  try {
    const [contributorsRes, repoRes, userPRsRes, userIssuesRes] =
      await sequentialFetchEdge([
        () => fetch(
          `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`,
          { headers: GITHUB_HEADERS, next: { revalidate: 3600 } }
        ),
        () => fetch(
          `https://api.github.com/repos/${owner}/${repo}`,
          { headers: GITHUB_HEADERS, next: { revalidate: 3600 } }
        ),
        () => fetch(
          `https://api.github.com/search/issues?q=repo:${owner}/${repo}+author:${user}+type:pr&per_page=1`,
          { headers: GITHUB_HEADERS, next: { revalidate: 3600 } }
        ),
        () => fetch(
          `https://api.github.com/search/issues?q=repo:${owner}/${repo}+author:${user}+type:issue&per_page=1`,
          { headers: GITHUB_HEADERS, next: { revalidate: 3600 } }
        ),
      ]);

    if (!contributorsRes.ok) {
      return null;
    }

    const [contributors, repoData, prData, issueData] = await sequentialFetchEdge([
      () => contributorsRes.json(),
      () => repoRes.ok ? repoRes.json() : Promise.resolve(null),
      () => userPRsRes.ok ? userPRsRes.json() : Promise.resolve(null),
      () => userIssuesRes.ok ? userIssuesRes.json() : Promise.resolve(null),
    ]);

    const userIndex = contributors.findIndex(
      (c: { login: string }) => c.login.toLowerCase() === user.toLowerCase()
    );

    if (userIndex === -1) {
      return null;
    }

    const userData = contributors[userIndex];

    const userRes = await fetch(
      `https://api.github.com/users/${user}`,
      { headers: GITHUB_HEADERS, next: { revalidate: 3600 } }
    );

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
      ownerAvatarUrl: repoData?.owner?.avatar_url ?? "",
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
      <ErrorCard message={`User not found: ${user}`} />,
      { width: WIDTH, height: HEIGHT }
    );
  }

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
            {/* 
              @vercel/og の ImageResponse は Satori を使用してReact要素をSVGに変換するため、
              next/image の <Image /> コンポーネントは使用できません。
              通常の <img> タグが必要です。
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stats.ownerAvatarUrl}
              alt={`${owner}'s avatar`}
              width={44}
              height={44}
              style={{
                borderRadius: 22,
                marginRight: 16,
                border: `2px solid ${COLORS.purple500}`,
              }}
            />
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
                {stats.badges.map((badge, i) => {
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
