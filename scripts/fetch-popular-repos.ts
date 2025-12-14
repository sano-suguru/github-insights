/**
 * 人気リポジトリを GitHub Search API から取得し、JSONファイルを更新するスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/fetch-popular-repos.ts
 *
 * 環境変数:
 *   GITHUB_TOKEN - GitHub Personal Access Token (オプション、レート制限緩和用)
 */

import * as fs from "fs";
import * as path from "path";

// カテゴリ定義: topic または検索クエリ
// GitHub Search APIではORクエリが複雑になると失敗しやすいため、シンプルなクエリを使用
const CATEGORIES: Record<string, { query: string; minStars: number }> = {
  frontend: { query: "topic:react", minStars: 5000 },
  frameworks: { query: "topic:framework language:typescript", minStars: 5000 },
  backend: { query: "topic:nodejs", minStars: 5000 },
  languages: { query: "topic:programming-language", minStars: 10000 },
  tools: { query: "topic:developer-tools", minStars: 5000 },
  css: { query: "topic:css-framework", minStars: 3000 },
  database: { query: "topic:database", minStars: 5000 },
  testing: { query: "topic:testing", minStars: 3000 },
  state: { query: "topic:state-management", minStars: 1000 },
  ai: { query: "topic:machine-learning language:python", minStars: 10000 },
  mobile: { query: "topic:react-native", minStars: 3000 },
  devops: { query: "topic:docker", minStars: 5000 },
  security: { query: "topic:authentication", minStars: 1000 },
  graphics: { query: "topic:webgl", minStars: 2000 },
  utilities: { query: "topic:utility language:javascript", minStars: 5000 },
  monorepo: { query: "topic:monorepo", minStars: 1000 },
  documentation: { query: "topic:documentation", minStars: 3000 },
  animation: { query: "topic:animation language:javascript", minStars: 2000 },
};

// 全体で人気のリポジトリを取得するクエリ
const POPULAR_QUERY = { query: "", minStars: 50000 };

// 取得件数
const REPOS_PER_CATEGORY = 10;

// 出力先
const OUTPUT_PATH = path.join(process.cwd(), "public/data/popular-repos.json");

interface GitHubRepo {
  full_name: string;
  stargazers_count: number;
  description: string | null;
}

interface SearchResponse {
  items: GitHubRepo[];
  total_count: number;
}

interface PopularReposData {
  featured: string[];
  categories: Record<string, string[]>;
  all: string[];
  lastUpdated: string;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);

    if (response.status === 403 || response.status === 429) {
      // レート制限
      const resetTime = response.headers.get("X-RateLimit-Reset");
      const retryAfter = response.headers.get("Retry-After");
      
      let waitMs = 60000; // デフォルト1分
      
      if (retryAfter) {
        waitMs = parseInt(retryAfter) * 1000;
      } else if (resetTime) {
        waitMs = Math.max(parseInt(resetTime) * 1000 - Date.now(), 1000);
      }
      
      // 最大2分まで待機
      waitMs = Math.min(waitMs, 120000);
      
      console.log(`  Rate limited. Waiting ${Math.ceil(waitMs / 1000)}s...`);
      await sleep(waitMs);
      continue;
    }

    if (response.ok) {
      return response;
    }

    // その他のエラーの場合は少し待ってリトライ
    if (i < retries - 1) {
      console.log(`  Request failed with ${response.status}. Retrying...`);
      await sleep(2000 * (i + 1));
    }
  }

  throw new Error(`Failed to fetch after ${retries} retries`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchRepositories(
  query: string,
  minStars: number,
  perPage: number = 10
): Promise<string[]> {
  const token = process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "GitHub-Insights-Popular-Repos",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const searchQuery = query
    ? `${query} stars:>=${minStars}`
    : `stars:>=${minStars}`;

  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=${perPage}`;

  try {
    const response = await fetchWithRetry(url, { headers });
    const data: SearchResponse = await response.json();

    return data.items.map((repo) => repo.full_name);
  } catch (error) {
    console.error(`Error searching for "${query}":`, error);
    return [];
  }
}

async function main() {
  console.log("🚀 Fetching popular repositories...\n");

  const categories: Record<string, string[]> = {};
  const allRepos = new Set<string>();

  // カテゴリ別に取得
  for (const [category, { query, minStars }] of Object.entries(CATEGORIES)) {
    console.log(`📂 Fetching ${category}...`);
    const repos = await searchRepositories(query, minStars, REPOS_PER_CATEGORY);
    categories[category] = repos;
    repos.forEach((repo) => allRepos.add(repo));
    console.log(`   Found ${repos.length} repos`);

    // レート制限対策で待機（認証なしの場合は10回/分の制限があるため）
    await sleep(2000);
  }

  // 全体の人気リポジトリ（featured用）
  console.log("\n⭐ Fetching top featured repos...");
  const featured = await searchRepositories(
    POPULAR_QUERY.query,
    POPULAR_QUERY.minStars,
    REPOS_PER_CATEGORY
  );
  featured.forEach((repo) => allRepos.add(repo));
  console.log(`   Found ${featured.length} featured repos`);

  // popular カテゴリも追加（全体で最も人気）
  console.log("\n🔥 Fetching popular category...");
  const popular = await searchRepositories("", 30000, 20);
  categories.popular = popular;
  popular.forEach((repo) => allRepos.add(repo));
  console.log(`   Found ${popular.length} popular repos`);

  // 結果を構築
  const result: PopularReposData = {
    featured,
    categories,
    all: Array.from(allRepos).sort(),
    lastUpdated: new Date().toISOString().split("T")[0],
  };

  // ファイル出力
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2) + "\n");

  console.log(`\n✅ Updated ${OUTPUT_PATH}`);
  console.log(`   Total unique repos: ${allRepos.size}`);
  console.log(`   Categories: ${Object.keys(categories).length}`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
