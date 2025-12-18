"use client";

import { useRouter } from "next/navigation";
import { BarChart3, Languages, TrendingUp, Users, Flame, Lock, Shield } from "lucide-react";
import { signInWithGitHub } from "@/lib/actions";
import RepoSearchCombobox from "@/components/RepoSearchCombobox";

export default function Home() {
  const router = useRouter();

  const handleRepoSelect = (repo: string) => {
    const [owner, repoName] = repo.split("/");
    if (owner && repoName) {
      router.push(`/repo/${owner}/${repoName}`);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* ヒーローセクション */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          {/* ロゴ */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-linear-to-r from-purple-500 to-pink-500 mb-8">
            <svg
              className="w-10 h-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6">
            GitHub{" "}
            <span className="bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Insights
            </span>
          </h1>

          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10">
            GitHubの貢献度を様々な角度から可視化。
            <br />
            コミット、言語、コントリビューターを美しいグラフで分析しよう。
          </p>

          {/* リポジトリ検索フォーム */}
          <div className="max-w-xl mx-auto mb-8">
            <RepoSearchCombobox
              onSelectRepo={handleRepoSelect}
              variant="hero"
              placeholder="リポジトリを検索（例: facebook/react）"
            />
            <p className="text-gray-400 text-sm mt-2">
              ログインなしでPublicリポジトリを分析できます
            </p>
          </div>

          {/* ログインボタン */}
          <div className="flex justify-center">
            <form action={signInWithGitHub}>
              <button
                type="submit"
                className="flex flex-col items-center gap-1 bg-white text-gray-900 py-3 px-8 rounded-full hover:bg-gray-100 transition-colors shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span className="font-semibold">GitHubでログイン</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Shield className="w-3 h-3 text-green-600" />
                  <span>読み取り専用アクセス</span>
                </div>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 機能紹介 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8" />}
            title="貢献度の可視化"
            description="コミット数、PR数、Issue数をひと目で確認。チームや個人の生産性を把握できます。"
          />
          <FeatureCard
            icon={<Languages className="w-8 h-8" />}
            title="言語統計"
            description="リポジトリで使用されている言語の割合を円グラフで表示。技術スタックを可視化。"
          />
          <FeatureCard
            icon={<TrendingUp className="w-8 h-8" />}
            title="コミット推移"
            description="過去30日間のコミット推移をグラフで表示。開発の活動パターンを分析。"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="コントリビューター分析"
            description="誰がどれだけ貢献しているかを可視化。チームメンバーの活躍を確認。"
          />
          <FeatureCard
            icon={<Flame className="w-8 h-8" />}
            title="活動ヒートマップ"
            description="曜日・時間帯別の活動パターンをヒートマップで表示。最も生産的な時間を発見。"
          />
          <FeatureCard
            icon={<Lock className="w-8 h-8" />}
            title="プライベート対応"
            description="プライベートリポジトリを含むすべてのリポジトリを分析可能。安全に利用できます。"
          />
        </div>
      </div>

      {/* フッター */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-400">
          <p>© 2024 GitHub Insights. Built with Next.js</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 border border-gray-700/50">
      <div className="text-purple-400 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
