import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import {
  calculateInsightScore,
  getRankColorsForOg,
  formatScore,
  calculateAccountYears,
} from "@/lib/insight-score";
import { SERVER_CACHE } from "@/lib/cache-config";

export const runtime = "edge";

// OG画像サイズ
const WIDTH = 1200;
const HEIGHT = 630;

// カラーパレット
const COLORS = {
  bgDark: "#1e1b4b", // indigo-950
  bgMid: "#581c87", // purple-900
  bgPurple: "#6b21a8", // purple-800
  white: "#ffffff",
  purple200: "#e9d5ff",
  purple300: "#d8b4fe",
  purple400: "#c084fc",
  green400: "#4ade80",
  orange400: "#fb923c",
  blue400: "#60a5fa",
  yellow400: "#facc15",
  // メダル
  gold: "#fbbf24",
  silver: "#9ca3af",
  bronze: "#cd7f32",
};

// SVGアイコンパス（lucide-reactと同じパス）
const ICONS = {
  gitPullRequest: "M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 6a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm2 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-2 3a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm13-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-2 3a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM6 9v6M18 9v6M6 9a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3",
  circleDot: "M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  flame: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
};

// SVGアイコンコンポーネント
function SvgIcon({ path, size = 24, color = COLORS.white }: { path: string; size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

interface UserStats {
  name: string;
  login: string;
  avatarUrl: string;
  followers: number;
  publicRepos: number;
  createdAt: string;
  yearlyPRs: number;
  yearlyIssues: number;
  totalStars: number;
  totalForks: number;
  topLanguages: string[]; // 言語名のみ（REST APIでは色情報が取得できないため）
}

// 共通のHTTPヘッダー（lib/github.tsと同じ形式）
const GITHUB_HEADERS: HeadersInit = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "GitHub-Insights",
};

/**
 * GitHub APIからユーザー統計を取得（Edge Runtime対応）
 * 
 * Note: lib/github.ts の関数は @octokit/graphql に依存しているため、
 * Edge Runtimeでは直接インポートできない。REST APIのみを使用する
 * この関数でEdge互換性を確保している。
 * 
 * 関連: getYearlyContributionStats, getUserProfile (lib/github.ts)
 */
async function getUserStats(user: string, year: number): Promise<UserStats | null> {
  try {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const dateRange = `created:${startDate}..${endDate}`;

    const [userRes, reposRes, prsRes, issuesRes] = await Promise.all([
      fetch(`https://api.github.com/users/${user}`, {
        headers: GITHUB_HEADERS,
        next: { revalidate: SERVER_CACHE.USER_PROFILE_REVALIDATE },
      }),
      fetch(
        `https://api.github.com/users/${user}/repos?sort=stars&per_page=10&type=owner`,
        {
          headers: GITHUB_HEADERS,
          next: { revalidate: SERVER_CACHE.USER_PROFILE_REVALIDATE },
        }
      ),
      fetch(
        `https://api.github.com/search/issues?q=author:${user}+type:pr+${dateRange}&per_page=1`,
        {
          headers: GITHUB_HEADERS,
          next: { revalidate: SERVER_CACHE.USER_CONTRIBUTION_REVALIDATE },
        }
      ),
      fetch(
        `https://api.github.com/search/issues?q=author:${user}+type:issue+${dateRange}&per_page=1`,
        {
          headers: GITHUB_HEADERS,
          next: { revalidate: SERVER_CACHE.USER_CONTRIBUTION_REVALIDATE },
        }
      ),
    ]);

    if (!userRes.ok) return null;

    const [userData, repos, prsData, issuesData] = await Promise.all([
      userRes.json(),
      reposRes.ok ? reposRes.json() : [],
      prsRes.ok ? prsRes.json() : null,
      issuesRes.ok ? issuesRes.json() : null,
    ]);

    // 言語とスター/フォーク集計
    const languageCount: Record<string, number> = {};
    let totalStars = 0;
    let totalForks = 0;

    for (const repo of repos.filter((r: { fork: boolean }) => !r.fork)) {
      totalStars += repo.stargazers_count || 0;
      totalForks += repo.forks_count || 0;
      if (repo.language) {
        languageCount[repo.language] = (languageCount[repo.language] || 0) + 1;
      }
    }

    const topLanguages = Object.entries(languageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    return {
      name: userData.name || user,
      login: user,
      avatarUrl: userData.avatar_url,
      followers: userData.followers,
      publicRepos: userData.public_repos,
      createdAt: userData.created_at,
      yearlyPRs: prsData?.total_count ?? 0,
      yearlyIssues: issuesData?.total_count ?? 0,
      totalStars,
      totalForks,
      topLanguages,
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user: string; year: string }> }
) {
  const { user, year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  if (isNaN(year) || year < 2008 || year > new Date().getFullYear()) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${COLORS.bgDark} 0%, ${COLORS.bgPurple} 100%)`,
            color: COLORS.white,
            fontSize: 32,
          }}
        >
          Invalid year: {yearStr}
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    );
  }

  const stats = await getUserStats(user, year);

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
            background: `linear-gradient(135deg, ${COLORS.bgDark} 0%, ${COLORS.bgPurple} 100%)`,
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

  // Insight Score計算
  const insightResult = calculateInsightScore({
    followers: stats.followers,
    totalStars: stats.totalStars,
    totalForks: stats.totalForks,
    publicRepos: stats.publicRepos,
    totalPRs: stats.yearlyPRs,
    totalIssues: stats.yearlyIssues,
    accountYears: calculateAccountYears(stats.createdAt),
  });
  const rankColors = getRankColorsForOg(insightResult.rank);

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
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
          background: `linear-gradient(135deg, ${COLORS.bgDark} 0%, ${COLORS.bgPurple} 50%, ${COLORS.bgMid} 100%)`,
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 装飾的な背景エフェクト */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            background: "rgba(168, 85, 247, 0.15)",
            borderRadius: "50%",
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -100,
            width: 400,
            height: 400,
            background: "rgba(99, 102, 241, 0.15)",
            borderRadius: "50%",
            filter: "blur(80px)",
          }}
        />

        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 32,
            paddingBottom: 16,
          }}
        >
          <span style={{ color: COLORS.purple300, fontSize: 14, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600 }}>
            GitHub Wrapped
          </span>
          <span style={{ color: COLORS.white, fontSize: 64, fontWeight: 900, marginTop: 4 }}>
            {year}
          </span>
          <span style={{ color: COLORS.purple200, fontSize: 20, marginTop: 4 }}>
            @{stats.login}
          </span>
        </div>

        {/* メイン統計グリッド */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: "0 48px",
            flex: 1,
          }}
        >
          {/* 上段: Total Contributions + Streak */}
          <div style={{ display: "flex", gap: 16 }}>
            {/* Total Contributions */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: "20px 32px",
                flex: 2,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <SvgIcon path={ICONS.activity} size={36} color={COLORS.purple300} />
              <span style={{ color: COLORS.white, fontSize: 44, fontWeight: 900, marginTop: 8 }}>
                {formatNumber(stats.yearlyPRs + stats.yearlyIssues)}
              </span>
              <span style={{ color: COLORS.purple200, fontSize: 14 }}>Total Contributions</span>
            </div>

            {/* Streak placeholder - Edge APIでは取得困難なため代わりにスターを表示 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: "20px 32px",
                flex: 1,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <SvgIcon path={ICONS.flame} size={36} color={COLORS.orange400} />
              <span style={{ color: COLORS.white, fontSize: 36, fontWeight: 700, marginTop: 8 }}>
                {formatNumber(stats.totalStars)}
              </span>
              <span style={{ color: COLORS.purple200, fontSize: 14 }}>Total Stars</span>
            </div>
          </div>

          {/* 中段: PRs + Issues */}
          <div style={{ display: "flex", gap: 16 }}>
            {/* PRs */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: "16px 24px",
                flex: 1,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <SvgIcon path={ICONS.gitPullRequest} size={28} color={COLORS.green400} />
              <span style={{ color: COLORS.white, fontSize: 32, fontWeight: 700, marginTop: 6 }}>
                {formatNumber(stats.yearlyPRs)}
              </span>
              <span style={{ color: COLORS.purple200, fontSize: 13 }}>Pull Requests</span>
            </div>

            {/* Issues */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: "16px 24px",
                flex: 1,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <SvgIcon path={ICONS.circleDot} size={28} color={COLORS.orange400} />
              <span style={{ color: COLORS.white, fontSize: 32, fontWeight: 700, marginTop: 6 }}>
                {formatNumber(stats.yearlyIssues)}
              </span>
              <span style={{ color: COLORS.purple200, fontSize: 13 }}>Issues</span>
            </div>

            {/* Languages */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: "16px 24px",
                flex: 1,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <SvgIcon path={ICONS.code} size={28} color={COLORS.blue400} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {stats.topLanguages.slice(0, 3).map((lang, i) => (
                  <span
                    key={lang}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: i === 0 ? COLORS.gold : i === 1 ? COLORS.silver : COLORS.bronze,
                      background: "rgba(0,0,0,0.3)",
                      padding: "4px 8px",
                      borderRadius: 8,
                    }}
                  >
                    {lang}
                  </span>
                ))}
              </div>
              <span style={{ color: COLORS.purple200, fontSize: 13, marginTop: 6 }}>Top Languages</span>
            </div>

            {/* Insight Score */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: rankColors.bg,
                border: `1px solid ${rankColors.border}`,
                borderRadius: 16,
                padding: "16px 24px",
                flex: 1,
              }}
            >
              <SvgIcon path={ICONS.trophy} size={28} color={rankColors.text} />
              <span style={{ color: rankColors.text, fontSize: 32, fontWeight: 900, marginTop: 6 }}>
                {formatScore(insightResult.score)}
              </span>
              <span style={{ color: rankColors.text, fontSize: 13, opacity: 0.9 }}>
                {insightResult.rank} Rank
              </span>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 48px",
            background: "rgba(0,0,0,0.25)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SvgIcon path={ICONS.calendar} size={16} color={COLORS.purple300} />
            <span style={{ color: COLORS.purple300, fontSize: 14, fontWeight: 500 }}>
              Member since {new Date(stats.createdAt).getFullYear()}
            </span>
          </div>
          <span style={{ color: COLORS.purple400, fontSize: 14, fontWeight: 500 }}>
            github-insights.vercel.app
          </span>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}
