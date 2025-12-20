"use client";

import { useState } from "react";
import { X, Download, Link, Code, User, FolderGit2, Lightbulb, Loader2, Maximize2, Minimize2 } from "lucide-react";
import type { ContributorDetailStat } from "@/lib/github/types";
import { generateTwitterShareUrl, generateRepoContributionShareText, generateUserProfileShareText } from "@/lib/share";

type CardType = "repo" | "user";

interface ContributionCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  owner?: string;
  repo?: string;
  contributor: ContributorDetailStat;
}

export default function ContributionCardModal({
  isOpen,
  onClose,
  owner,
  repo,
  contributor,
}: ContributionCardModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cardType, setCardType] = useState<CardType>(
    owner && repo ? "repo" : "user"
  );

  if (!isOpen) return null;

  // カードタイプに応じたURL
  const cardUrl =
    cardType === "repo" && owner && repo
      ? `/api/og/card/${owner}/${repo}/${contributor.login}`
      : `/api/og/card/user/${contributor.login}`;

  const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${cardUrl}`;

  // ダウンロード時のファイル名
  const downloadFilename =
    cardType === "repo" && owner && repo
      ? `${owner}-${repo}-${contributor.login}-card.png`
      : `${contributor.login}-github-card.png`;

  // 画像をダウンロード
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(cardUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloading(false);
    }
  };

  // URLをコピー
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  // Markdown埋め込みコードをコピー
  const handleCopyMarkdown = async () => {
    const linkUrl =
      cardType === "repo" && owner && repo
        ? `https://github-insights-orpin.vercel.app/repo/${owner}/${repo}`
        : `https://github.com/${contributor.login}`;
    const altText =
      cardType === "repo"
        ? `${contributor.name}'s Contribution to ${owner}/${repo}`
        : `${contributor.name}'s GitHub Profile`;
    const markdown = `[![${altText}](${fullUrl})](${linkUrl})`;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  // X (Twitter) でシェア
  const handleShareX = () => {
    const shareText =
      cardType === "repo" && owner && repo
        ? generateRepoContributionShareText({
            owner,
            repo,
            username: contributor.login,
            commits: contributor.commits,
            rank: contributor.rank,
          })
        : generateUserProfileShareText({
            username: contributor.login,
          });

    const shareUrl = generateTwitterShareUrl({
      text: shareText,
      url: fullUrl,
      hashtags: ["GitHubInsights"],
    });

    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  // カードタイプ変更時に画像ロード状態をリセット
  const handleCardTypeChange = (type: CardType) => {
    setImageLoaded(false);
    setCardType(type);
  };

  const hasRepoContext = owner && repo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* モーダル */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* カードタイプ切り替え */}
        {hasRepoContext && (
          <div className="px-6 pt-6">
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-full">
              <button
                onClick={() => handleCardTypeChange("repo")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  cardType === "repo"
                    ? "bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <FolderGit2 className="w-4 h-4" />
                Repo
              </button>
              <button
                onClick={() => handleCardTypeChange("user")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  cardType === "user"
                    ? "bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <User className="w-4 h-4" />
                Profile
              </button>
            </div>
          </div>
        )}

        {/* プレビュー */}
        <div className={hasRepoContext ? "p-6" : "p-6 pt-12"}>
          <div 
            className="relative bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden aspect-1200/630 cursor-pointer sm:cursor-default group"
            onClick={() => {
              // モバイルのみタップで全画面
              if (window.innerWidth < 640 && imageLoaded) setIsFullscreen(true);
            }}
          >
            {/* ローディングスピナー */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            )}
            {/* 拡大ヒント（モバイルのみ） */}
            {imageLoaded && (
              <div className="absolute bottom-2 right-2 sm:hidden bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Maximize2 className="w-3 h-3" />
                タップで拡大
              </div>
            )}
            {/* 
              @vercel/og で生成された画像のプレビュー。
              next/image は外部動的URLに対応していないため、img要素を使用。
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={cardUrl}
              src={cardUrl}
              alt="Contribution Card Preview"
              className={`w-full h-full object-contain transition-opacity duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>
        </div>

        {/* 全画面プレビュー（モバイル用・90度回転で大きく表示） */}
        {isFullscreen && (
          <div
            className="fixed inset-0 z-60 bg-black flex items-center justify-center"
            onClick={() => setIsFullscreen(false)}
          >
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-1/2 left-4 -translate-y-1/2 p-3 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors z-10"
              aria-label="元のサイズに戻す"
            >
              <Minimize2 className="w-6 h-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardUrl}
              alt="Contribution Card"
              className="object-contain rotate-90 origin-center"
              style={{
                maxWidth: '100vh',
                maxHeight: '100vw',
                width: 'auto',
                height: 'auto',
              }}
            />
          </div>
        )}

        {/* アクションボタン */}
        <div className="px-6 pb-4 flex flex-wrap gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 bg-linear-to-r from-purple-600 to-pink-600 text-white font-semibold py-2.5 px-5 rounded-full hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/25"
          >
            <Download className="w-4 h-4" />
            {downloading ? "ダウンロード中..." : "ダウンロード"}
          </button>

          <button
            onClick={handleShareX}
            className="inline-flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black font-semibold py-2.5 px-5 rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Xでシェア
          </button>

          <button
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-2 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-5 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            <Link className="w-4 h-4" />
            {copiedUrl ? "コピーしました！" : "URLをコピー"}
          </button>

          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-2 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-5 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            <Code className="w-4 h-4" />
            {copiedMarkdown ? "コピーしました！" : "Markdown"}
          </button>
        </div>

        {/* 使い方ヒント */}
        <div className="px-6 pb-6">
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
            <p className="text-sm text-purple-700 dark:text-purple-300 flex items-start gap-2">
              <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                <strong>ヒント:</strong> このカードをREADME.mdに貼り付けて、あなたの貢献をアピールしましょう！
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
