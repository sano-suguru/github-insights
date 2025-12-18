import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E テスト設定
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  /* 各テストファイルを並列実行 */
  fullyParallel: true,
  /* CI環境ではtest.only()の使用を禁止 */
  forbidOnly: !!process.env.CI,
  /* CI環境でのみリトライ */
  retries: process.env.CI ? 2 : 0,
  /* CI環境ではワーカー数を制限 */
  workers: process.env.CI ? 1 : undefined,
  /* HTMLレポートを生成 */
  reporter: "html",
  /* 全テスト共通の設定 */
  use: {
    /* テスト対象のベースURL */
    baseURL: "http://localhost:3001",
    /* 失敗時のトレースを記録 */
    trace: "on-first-retry",
    /* スクリーンショット */
    screenshot: "only-on-failure",
  },

  /* ブラウザ設定 */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // 必要に応じて他のブラウザも追加可能
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],

  /* テスト前に開発サーバーを起動 */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
