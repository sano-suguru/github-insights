"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { CLIENT_CACHE } from "@/lib/cache-config";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5分間はデータを新鮮とみなす
            staleTime: 5 * 60 * 1000,
            // 10分間キャッシュを保持
            gcTime: CLIENT_CACHE.GC_TIME,
            // エラー時は1回だけリトライ
            retry: 1,
            // ウィンドウフォーカス時の自動再取得を無効化
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
