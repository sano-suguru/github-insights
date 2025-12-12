"use client";

import { useState } from "react";
import { X, Download, Link, Share2 } from "lucide-react";
import { ContributorDetailStat } from "@/lib/github";

interface ContributionCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  contributor: ContributorDetailStat;
}

export default function ContributionCardModal({
  isOpen,
  onClose,
  owner,
  repo,
  contributor,
}: ContributionCardModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const cardUrl = `/api/og/card/${owner}/${repo}/${contributor.login}`;
  const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${cardUrl}`;

  // 画像をダウンロード
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(cardUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${owner}-${repo}-${contributor.login}-card.png`;
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  // Markdown埋め込みコードをコピー
  const handleCopyMarkdown = async () => {
    const markdown = `[![${contributor.name}'s Contribution](${fullUrl})](https://github-insights-orpin.vercel.app/dashboard?repo=${owner}/${repo})`;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* モーダル */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            貢献度カード
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* プレビュー */}
        <div className="p-6">
          <div className="relative bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardUrl}
              alt="Contribution Card Preview"
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* アクションボタン */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading ? "ダウンロード中..." : "画像をダウンロード"}
          </button>

          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Link className="w-4 h-4" />
            {copied ? "コピーしました！" : "URLをコピー"}
          </button>

          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Markdown埋め込み
          </button>
        </div>

        {/* 使い方ヒント */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 <strong>ヒント:</strong> この画像をREADME.mdに貼り付けたり、
              TwitterやLinkedInで共有して、あなたの貢献をアピールしましょう！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
