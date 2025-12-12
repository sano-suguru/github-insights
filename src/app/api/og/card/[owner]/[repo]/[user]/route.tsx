import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// OG画像サイズ
const WIDTH = 1200;
const HEIGHT = 630;

// コントリビューター統計の型
interface ContributorStats {
  name: string;
  login: string;
  avatarUrl: string;
  commits: number;
  pullRequests: number;
  reviews: number;
  additions: number;
  deletions: number;
  rank: number;
  totalContributors: number;
  contributionPercent: number;
  badges: string[];
}

// GitHub APIから統計を取得（シンプル版）
async function getContributorStats(
  owner: string,
  repo: string,
  user: string
): Promise<ContributorStats | null> {
  try {
    // GitHub REST APIでコントリビューター情報を取得
    const contributorsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "GitHub-Insights",
        },
        next: { revalidate: 3600 }, // 1時間キャッシュ
      }
    );

    if (!contributorsRes.ok) {
      console.error("Failed to fetch contributors:", contributorsRes.status);
      return null;
    }

    const contributors = await contributorsRes.json();
    
    // ユーザーを検索
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

    // ユーザー詳細を取得
    const userRes = await fetch(`https://api.github.com/users/${user}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "GitHub-Insights",
      },
      next: { revalidate: 3600 },
    });

    const userDetails = userRes.ok ? await userRes.json() : { name: user };

    // バッジを計算
    const badges: string[] = [];
    if (userIndex === 0) badges.push("Top Contributor");
    if (userIndex < 3 && contributors.length >= 3) badges.push("Top 3");
    if (userData.contributions >= 100) badges.push("Core Contributor");
    if (userData.contributions >= 50) badges.push("Dedicated");
    if (userData.contributions >= 10) badges.push("Active");

    return {
      name: userDetails.name || user,
      login: user,
      avatarUrl: userData.avatar_url,
      commits: userData.contributions,
      pullRequests: 0, // REST APIでは取得困難
      reviews: 0,
      additions: 0,
      deletions: 0,
      rank: userIndex + 1,
      totalContributors: contributors.length,
      contributionPercent: Math.round((userData.contributions / totalCommits) * 100),
      badges: badges.slice(0, 3), // 最大3つ
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

  // 統計データを取得
  const stats = await getContributorStats(owner, repo, user);

  if (!stats) {
    // エラー画像を返す
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#1f2937",
            color: "#fff",
            fontSize: 32,
          }}
        >
          User not found: {user}
        </div>
      ),
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
          backgroundColor: "#1f2937",
          padding: 48,
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: "linear-gradient(135deg, #a855f7, #ec4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </div>
          <span style={{ color: "#a855f7", fontSize: 28, fontWeight: 700 }}>
            GitHub Insights
          </span>
        </div>

        {/* メインコンテンツ */}
        <div style={{ display: "flex", flex: 1 }}>
          {/* 左: ユーザー情報 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginRight: 48,
            }}
          >
            {/* アバター */}
            <img
              src={stats.avatarUrl}
              width={120}
              height={120}
              style={{
                borderRadius: 60,
                border: "4px solid #a855f7",
                marginBottom: 16,
              }}
            />
            {/* 名前 */}
            <span
              style={{
                color: "#fff",
                fontSize: 32,
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              {stats.name}
            </span>
            {/* リポジトリ */}
            <span style={{ color: "#9ca3af", fontSize: 20 }}>
              @{owner}/{repo}
            </span>
          </div>

          {/* 右: 統計 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            {/* 統計カード */}
            <div
              style={{
                display: "flex",
                gap: 24,
                marginBottom: 32,
              }}
            >
              <StatBox label="Commits" value={stats.commits.toString()} />
              <StatBox label="Rank" value={`#${stats.rank}`} />
              <StatBox
                label="of"
                value={stats.totalContributors.toString()}
              />
            </div>

            {/* バッジ */}
            {stats.badges.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 32,
                  flexWrap: "wrap",
                }}
              >
                {stats.badges.map((badge, i) => (
                  <span
                    key={i}
                    style={{
                      backgroundColor: "rgba(168, 85, 247, 0.2)",
                      color: "#c084fc",
                      padding: "8px 16px",
                      borderRadius: 20,
                      fontSize: 18,
                      border: "1px solid rgba(168, 85, 247, 0.4)",
                    }}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}

            {/* 貢献率プログレスバー */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#9ca3af", fontSize: 18, marginBottom: 8 }}>
                {stats.contributionPercent}% of total commits
              </span>
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: 16,
                  backgroundColor: "#374151",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${stats.contributionPercent}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #a855f7, #ec4899)",
                    borderRadius: 8,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 24,
          }}
        >
          <span style={{ color: "#6b7280", fontSize: 18 }}>
            github-insights-orpin.vercel.app
          </span>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
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
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        padding: "16px 32px",
        borderRadius: 12,
        minWidth: 120,
      }}
    >
      <span
        style={{
          color: "#fff",
          fontSize: 36,
          fontWeight: 700,
        }}
      >
        {value}
      </span>
      <span style={{ color: "#9ca3af", fontSize: 16 }}>{label}</span>
    </div>
  );
}
