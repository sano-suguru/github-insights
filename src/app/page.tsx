"use client";

import { useRouter } from "next/navigation";
import { BarChart3, Languages, TrendingUp, Users, Flame, Lock, Shield } from "lucide-react";
import { signInWithGitHub } from "@/lib/actions";
import RepoSearchCombobox from "@/components/RepoSearchCombobox";
import { GitHubIcon } from "@/components/icons";

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
      {/* メインコンテンツ */}
      <main>
        {/* ヒーローセクション */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16" aria-labelledby="hero-heading">
        <div className="text-center">
          {/* ロゴ */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-linear-to-r from-purple-500 to-pink-500 mb-8">
            <GitHubIcon className="w-10 h-10 text-white" />
          </div>

          <h1 id="hero-heading" className="text-5xl sm:text-6xl font-bold text-white mb-6">
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
                  <GitHubIcon className="w-5 h-5" />
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
      </section>

      {/* 機能紹介 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" aria-label="機能紹介">
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
      </section>
      </main>

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
    <article className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 border border-gray-700/50">
      <div className="text-purple-400 mb-4" aria-hidden="true">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </article>
  );
}
