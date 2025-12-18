import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/lib/**", "src/hooks/**"],
      exclude: [
        // Server Actions - "use server" ディレクティブがあるためユニットテスト不可
        "src/lib/actions.ts",
        // NextAuth 設定 - 外部依存が強くモック困難
        "src/lib/auth.ts",
        // テストファイル自体
        "**/__tests__/**",
        "**/*.test.{ts,tsx}",
        // 型定義のみ
        "**/*.d.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});