"use client";

import { useState } from "react";
import { Star, Link as LinkIcon, Code2, X } from "lucide-react";
import { logger } from "@/lib/logger";

interface UserCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  name: string;
}

/**
 * ユーザーカードモーダル
 * OG画像のプレビュー・ダウンロード・共有機能を提供
 */
export function UserCardModal({
  isOpen,
  onClose,
  username,
  name,
}: UserCardModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!isOpen) return null;

  const cardUrl = `/api/og/card/user/${encodeURIComponent(username)}`;
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
      a.download = `${username}-github-card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error("Download failed:", error);
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
      logger.error("Copy failed:", error);
    }
  };

  // Markdown埋め込みコードをコピー
  const handleCopyMarkdown = async () => {
    // Markdown構文に影響する文字をエスケープ
    const escapedName = name.replace(/[[\]()]/g, "\\$&");
    const markdown = `[![${escapedName}'s GitHub Profile](${fullUrl})](https://github.com/${username})`;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch (error) {
      logger.error("Copy failed:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-50 w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            GitHub Profile Card
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* カードプレビュー */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900">
          <div className="relative aspect-video max-w-xl mx-auto rounded-lg overflow-hidden shadow-lg">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            )}
            {/* OG画像APIエンドポイントはNext.js Imageで最適化できないためnative imgを使用 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardUrl}
              alt={`${name}'s GitHub Profile Card`}
              className={`w-full h-full object-cover ${imageLoaded ? "" : "opacity-0"}`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>
        </div>

        {/* アクションボタン */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-400 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {downloading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Star className="w-4 h-4" />
            )}
            Download
          </button>
          <button
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium"
          >
            <LinkIcon className="w-4 h-4" />
            {copiedUrl ? "Copied!" : "Copy URL"}
          </button>
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium"
          >
            <Code2 className="w-4 h-4" />
            {copiedMarkdown ? "Copied!" : "Copy Markdown"}
          </button>
        </div>
      </div>
    </div>
  );
}
