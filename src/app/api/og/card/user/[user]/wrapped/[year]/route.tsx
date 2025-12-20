import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import {
  calculateInsightScore,
  getRankColorsForOg,
  formatScore,
  calculateAccountYears,
} from "@/lib/insight-score";
import { SERVER_CACHE } from "@/lib/cache-config";
import {
  OG_WIDTH as WIDTH,
  OG_HEIGHT as HEIGHT,
  OG_COLORS as COLORS,
  OG_ICONS as ICONS,
  SvgIcon,
} from "@/lib/og/constants";
import {
  sequentialFetchEdge,
  GITHUB_HEADERS,
  formatNumberUppercase as formatNumber,
  ErrorCard,
} from "@/lib/og";

export const runtime = "edge";

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

    const [userRes, reposRes, prsRes, issuesRes] = await sequentialFetchEdge([
      () => fetch(`https://api.github.com/users/${user}`, {
        headers: GITHUB_HEADERS,
        next: { revalidate: SERVER_CACHE.USER_PROFILE_REVALIDATE },
      }),
      () => fetch(
        `https://api.github.com/users/${user}/repos?sort=stars&per_page=10&type=owner`,
        {
          headers: GITHUB_HEADERS,
          next: { revalidate: SERVER_CACHE.USER_PROFILE_REVALIDATE },
        }
      ),
      () => fetch(
        `https://api.github.com/search/issues?q=author:${user}+type:pr+${dateRange}&per_page=1`,
        {
          headers: GITHUB_HEADERS,
          next: { revalidate: SERVER_CACHE.USER_CONTRIBUTION_REVALIDATE },
        }
      ),
      () => fetch(
        `https://api.github.com/search/issues?q=author:${user}+type:issue+${dateRange}&per_page=1`,
        {
          headers: GITHUB_HEADERS,
          next: { revalidate: SERVER_CACHE.USER_CONTRIBUTION_REVALIDATE },
        }
      ),
    ]);

    if (!userRes.ok) return null;

    const [userData, repos, prsData, issuesData] = await sequentialFetchEdge([
      () => userRes.json(),
      () => reposRes.ok ? reposRes.json() : Promise.resolve([]),
      () => prsRes.ok ? prsRes.json() : Promise.resolve(null),
      () => issuesRes.ok ? issuesRes.json() : Promise.resolve(null),
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
      <ErrorCard message={`Invalid year: ${yearStr}`} />,
      { width: WIDTH, height: HEIGHT }
    );
  }

  const stats = await getUserStats(user, year);

  if (!stats) {
    return new ImageResponse(
      <ErrorCard message={`User not found: ${user}`} />,
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
