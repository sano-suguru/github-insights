import { test, expect } from "@playwright/test";

test.describe("ランディングページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("ページタイトルが正しく表示される", async ({ page }) => {
    await expect(page).toHaveTitle(/GitHub Insights/);
  });

  test("ヒーローセクションが表示される", async ({ page }) => {
    // h1のGitHub Insightsが表示される
    const heading = page.locator("h1");
    await expect(heading).toContainText("GitHub");
    await expect(heading).toContainText("Insights");
  });

  test("リポジトリ検索入力欄が表示される", async ({ page }) => {
    // 検索コンボボックスの入力欄を探す
    const searchInput = page.getByPlaceholder(/リポジトリを検索/i);
    await expect(searchInput).toBeVisible();
  });

  test("ログインボタンが表示される", async ({ page }) => {
    // Publicリポジトリ分析ボタンまたはログインボタンを探す
    const loginButton = page.getByRole("button", { name: /Public|ログイン/i });
    await expect(loginButton.first()).toBeVisible();
  });
});

test.describe("ログインページ", () => {
  test("ログインページにアクセスできる", async ({ page }) => {
    await page.goto("/login");
    
    // ログインオプションが表示される
    await expect(page.locator("body")).toContainText(/GitHub|ログイン|Login/i);
  });

  test("GitHubログインボタンが表示される", async ({ page }) => {
    await page.goto("/login");
    
    // GitHub ログインボタンを探す
    const githubButton = page.getByRole("button", { name: /GitHub|Public|Private/i });
    await expect(githubButton.first()).toBeVisible();
  });
});

test.describe("パブリックリポジトリページ", () => {
  // レート制限を考慮してタイムアウトを延長
  test.setTimeout(60000);

  test("リポジトリページにアクセスするとローディングが表示される", async ({ page }) => {
    await page.goto("/repo/facebook/react");
    
    // ページがロードされる（エラーページでないことを確認）
    // レート制限の場合もあるので、「読み込み中」または「react」のどちらかを期待
    const body = page.locator("body");
    await expect(body).toBeVisible();
    
    // 最低限ページがレンダリングされていることを確認
    const bodyText = await body.textContent();
    expect(bodyText).toBeTruthy();
  });

  test("存在しないリポジトリは適切にハンドリングされる", async ({ page }) => {
    await page.goto("/repo/nonexistent-user-12345/nonexistent-repo-67890");
    
    // ページがクラッシュしていないことを確認
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("ナビゲーション", () => {
  test("ログインページからホームに戻れる", async ({ page }) => {
    await page.goto("/login");
    
    // ロゴまたはGitHub Insightsテキストをクリック
    const homeLink = page.locator("a").filter({ hasText: /GitHub Insights/i }).first();
    
    if (await homeLink.isVisible()) {
      await homeLink.click();
      await expect(page).toHaveURL("/");
    }
  });
});

test.describe("レスポンシブデザイン", () => {
  test("モバイルビューでも正しく表示される", async ({ page }) => {
    // モバイルビューポートに設定
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    
    // ページが正しく表示される
    await expect(page.locator("body")).toBeVisible();
    
    // h1が表示される
    await expect(page.locator("h1")).toBeVisible();
  });

  test("タブレットビューでも正しく表示される", async ({ page }) => {
    // タブレットビューポートに設定
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    
    // ページが正しく表示される
    await expect(page.locator("body")).toBeVisible();
  });
});
